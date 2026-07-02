import os
import json
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List

# Import local modules
from database import init_db, get_connection
from analyzer import scan_directory
from git_intel import scan_git_history
from vector_db import initialize_vector_db, index_chunk, search_chunks, reset_vector_db
from llm import generate_prompt_context, ask_llm, estimate_tokens
import models

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    init_db()
    initialize_vector_db()
    yield
    # Shutdown actions (if any)

app = FastAPI(
    title="Smriti AI Core Daemon",
    description="Persistent Memory Engine for Coding Agents",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for React app communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow access from React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helpers
def get_setting(key, default=""):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else default

def save_setting(key, value):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()

# 1. Configuration & Settings APIs
@app.get("/api/settings", response_model=models.SettingsResponse)
def get_settings():
    provider = get_setting("llm_provider", "gemini")
    gemini_key = get_setting("gemini_api_key", "")
    openai_key = get_setting("openai_api_key", "")
    ollama_url = get_setting("ollama_url", "http://localhost:11434")
    last_path = get_setting("last_scanned_path", "")
    
    return models.SettingsResponse(
        llm_provider=provider,
        gemini_api_key_set=bool(gemini_key),
        openai_api_key_set=bool(openai_key),
        ollama_url=ollama_url,
        last_scanned_path=last_path
    )

@app.post("/api/settings")
def update_settings(payload: models.SettingsUpdate):
    save_setting("llm_provider", payload.llm_provider)
    if payload.gemini_api_key is not None:
        save_setting("gemini_api_key", payload.gemini_api_key)
    if payload.openai_api_key is not None:
        save_setting("openai_api_key", payload.openai_api_key)
    save_setting("ollama_url", payload.ollama_url)
    return {"message": "Settings updated successfully"}

# 2. Scanning & Indexing API
@app.post("/api/scan", response_model=models.ScanResponse)
def scan_project(payload: models.ScanRequest):
    path = payload.path.strip()
    if not path or not os.path.isdir(path):
        raise HTTPException(status_code=400, detail="Invalid path. Directory does not exist.")

    try:
        # Save last scanned path
        save_setting("last_scanned_path", path)
        
        # 1. Scan directory structure & statistics
        stats = scan_directory(path)
        
        # Save repository metadata in SQLite
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO repository_metadata (path, name, framework, languages, total_files, total_lines, last_scanned)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            stats["path"],
            stats["name"],
            stats["framework"],
            ",".join(stats["languages"]),
            stats["total_files"],
            stats["total_lines"],
            stats["last_scanned"]
        ))
        
        # 2. Scan Git history
        commits = scan_git_history(path, limit=20)
        
        # Delete old commits for clean scan
        cursor.execute("DELETE FROM commits")
        
        # Insert new commits
        for c in commits:
            cursor.execute("""
                INSERT OR REPLACE INTO commits (sha, message, author, date, files_changed, summary, intent, affected_features, remaining_work)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                c["sha"], c["message"], c["author"], c["date"], 
                c["files_changed"], c["summary"], c["intent"], 
                c["affected_features"], c["remaining_work"]
            ))
            
        conn.commit()
        conn.close()

        # 3. Vector Database Indexing
        # Reset current vectors
        reset_vector_db()
        
        # Index rules
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT key, content FROM memory_rules")
        rules = cursor.fetchall()
        for r in rules:
            rule_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"rule-{r['key']}"))
            index_chunk(rule_id, "rule", f"Rule: {r['key']}\n{r['content']}", metadata={"rule_key": r["key"]})
            
        # Index Git commits
        for c in commits:
            commit_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"commit-{c['sha']}"))
            index_chunk(commit_id, "commit", f"Commit Summary: {c['summary']}\nDeveloper Intent: {c['intent']}\nRemaining Tasks: {c['remaining_work']}", metadata={"sha": c["sha"]})
            
        # Index code files (Index files with text content, split by chunks if large)
        def index_files_recursive(node):
            if node["type"] == "file":
                filepath = os.path.join(path, node["path"])
                # Only index text files under 200KB
                if os.path.getsize(filepath) < 200 * 1024:
                    try:
                        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                        if content.strip():
                            # For simplicity chunk by 1000 characters
                            chunk_size = 1000
                            chunks = [content[i:i+chunk_size] for i in range(0, len(content), chunk_size)]
                            for idx, ch in enumerate(chunks):
                                ch_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"file-{node['path']}-ch-{idx}"))
                                index_chunk(
                                    ch_id, 
                                    "file_chunk", 
                                    ch, 
                                    file_path=node["path"], 
                                    metadata={"start_line": (idx * 20) + 1, "end_line": ((idx + 1) * 20)}
                                )
                    except Exception:
                        pass
            elif "children" in node:
                for child in node["children"]:
                    index_files_recursive(child)
                    
        index_files_recursive(stats["file_tree"])
        conn.close()
        
        # Save file tree to disk as a JSON artifact for the UI
        tree_path = os.path.join(os.path.dirname(__file__), "file_tree.json")
        with open(tree_path, "w", encoding="utf-8") as f:
            json.dump(stats["file_tree"], f)

        return models.ScanResponse(
            success=True,
            path=stats["path"],
            name=stats["name"],
            framework=stats["framework"],
            languages=stats["languages"],
            total_files=stats["total_files"],
            total_lines=stats["total_lines"],
            message="Repository scanned and memory indexed successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scanning failed: {str(e)}")

# 3. Status API
@app.get("/api/status")
def get_status():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) as count FROM repository_metadata")
    repo_scanned = cursor.fetchone()["count"] > 0
    
    repo_info = None
    if repo_scanned:
        cursor.execute("SELECT * FROM repository_metadata ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        repo_info = dict(row) if row else None
        
    cursor.execute("SELECT count(*) as count FROM decisions")
    decisions_count = cursor.fetchone()["count"]
    
    cursor.execute("SELECT count(*) as count FROM bugs WHERE status = 'Open'")
    open_bugs_count = cursor.fetchone()["count"]
    
    conn.close()
    
    return {
        "status": "online",
        "repo_loaded": repo_scanned,
        "repository": repo_info,
        "total_decisions": decisions_count,
        "open_bugs": open_bugs_count
    }

# 4. Repository tree API
@app.get("/api/repository")
def get_repository():
    tree_path = os.path.join(os.path.dirname(__file__), "file_tree.json")
    if not os.path.exists(tree_path):
        return {"name": "No Scanned Repo", "type": "directory", "children": []}
    with open(tree_path, "r", encoding="utf-8") as f:
        return json.load(f)

# 5. Commits API
@app.get("/api/commits")
def get_commits():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM commits ORDER BY date DESC")
    rows = cursor.fetchall()
    conn.close()
    
    commits = []
    for r in rows:
        c = dict(r)
        c["files_changed"] = json.loads(c["files_changed"])
        c["affected_features"] = json.loads(c["affected_features"])
        commits.append(c)
    return commits

# 6. ADR Decisions API
@app.get("/api/decisions", response_model=List[models.ADRDecision])
def get_decisions():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM decisions ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/decisions", response_model=models.ADRDecision)
def create_decision(payload: models.ADRDecisionCreate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO decisions (title, status, author, reason, alternatives)
        VALUES (?, ?, ?, ?, ?)
    """, (payload.title, payload.status, payload.author, payload.reason, payload.alternatives))
    
    new_id = cursor.lastrowid
    conn.commit()
    
    cursor.execute("SELECT * FROM decisions WHERE id = ?", (new_id,))
    decision = dict(cursor.fetchone())
    conn.close()

    # Index ADR in Vector DB
    decision_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"decision-{new_id}"))
    index_chunk(
        decision_id, 
        "decision", 
        f"ADR Decision #{new_id}: {payload.title}\nStatus: {payload.status}\nAuthor: {payload.author}\nReason: {payload.reason}\nAlternatives: {payload.alternatives}"
    )

    return decision

# 7. Features API
@app.get("/api/features", response_model=List[models.Feature])
def get_features():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM features ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    
    # Populate default features if table is empty
    if not rows:
        conn = get_connection()
        cursor = conn.cursor()
        defaults = [
            ("Authentication & JWT Support", 100, "Completed", "Scanned files show JWT logic implemented."),
            ("Payments & Stripe API Integration", 60, "In Progress", "Mock/Stripe configurations verified."),
            ("Analytics Dashboard Flow", 30, "In Progress", "Basic layout structured, charts pending.")
        ]
        for name, progress, status, desc in defaults:
            cursor.execute("INSERT INTO features (name, progress, status, description) VALUES (?, ?, ?, ?)", (name, progress, status, desc))
        conn.commit()
        cursor.execute("SELECT * FROM features ORDER BY id ASC")
        rows = cursor.fetchall()
        conn.close()
        
    return [dict(r) for r in rows]

@app.post("/api/features")
def add_feature(payload: models.FeatureCreate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO features (name, progress, status, description) VALUES (?, ?, ?, ?)",
                   (payload.name, payload.progress, payload.status, payload.description))
    conn.commit()
    conn.close()
    return {"message": "Feature added"}

@app.post("/api/features/{feature_id}")
def update_feature(feature_id: int, payload: models.FeatureUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE features SET progress = ?, status = ?, description = ? WHERE id = ?",
                   (payload.progress, payload.status, payload.description, feature_id))
    conn.commit()
    conn.close()
    return {"message": "Feature updated"}

# 8. Bug Tracker API
@app.get("/api/bugs", response_model=List[models.Bug])
def get_bugs():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM bugs ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    
    # Populate default bug if table is empty
    if not rows:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO bugs (title, status, severity, related_files, description)
            VALUES (?, ?, ?, ?, ?)
        """, ("Sidebar overlap on layout", "Open", "Medium", "Sidebar.tsx, Dashboard.tsx", "When screens minimize, the sidebar overlap makes text items unreadable."))
        conn.commit()
        cursor.execute("SELECT * FROM bugs ORDER BY id DESC")
        rows = cursor.fetchall()
        conn.close()
        
    return [dict(r) for r in rows]

@app.post("/api/bugs")
def create_bug(payload: models.BugCreate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO bugs (title, status, severity, related_files, description)
        VALUES (?, 'Open', ?, ?, ?)
    """, (payload.title, payload.severity, payload.related_files, payload.description))
    conn.commit()
    conn.close()
    return {"message": "Bug reported successfully"}

@app.post("/api/bugs/{bug_id}")
def update_bug(bug_id: int, payload: models.BugUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE bugs SET status = ?, severity = ?, related_files = ?, description = ?
        WHERE id = ?
    """, (payload.status, payload.severity, payload.related_files, payload.description, bug_id))
    conn.commit()
    conn.close()
    return {"message": "Bug updated"}

# 9. Coding/Memory Rules API
@app.get("/api/rules", response_model=List[models.MemoryRule])
def get_rules():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM memory_rules ORDER BY key ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/rules/{key}")
def update_rule(key: str, payload: models.MemoryRuleUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE memory_rules SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?",
                   (payload.content, key))
    conn.commit()
    conn.close()
    
    # Reindex rule in vector DB
    rule_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"rule-{key}"))
    index_chunk(rule_id, "rule", f"Rule: {key}\n{payload.content}", metadata={"rule_key": key})
    
    return {"message": "Rule updated and reindexed"}

# 10. Vector Search & LLM Context API
@app.post("/api/search", response_model=List[models.SearchResult])
def search_memory(payload: models.SearchRequest):
    return search_chunks(payload.query, limit=payload.limit)

@app.post("/api/prompt-context")
def get_prompt_context_info(payload: models.SearchRequest):
    context_text, citations = generate_prompt_context(payload.query, limit=payload.limit)
    tokens = estimate_tokens(context_text)
    return {
        "context_text": context_text,
        "citations": citations,
        "estimated_tokens": tokens
    }

@app.post("/api/chat", response_model=models.ChatResponse)
def execute_chat(payload: models.ChatRequest):
    context_text, citations = generate_prompt_context(payload.query, limit=5)
    answer = ask_llm(payload.query, context_text, citations)
    return models.ChatResponse(
        answer=answer,
        context_used=citations
    )
