# Smriti: Persistent Memory for AI Coding Agents - Design Specification

**Date:** 2026-07-02  
**Author:** Antigravity (AI Coding Assistant)  
**Status:** Approved  

---

## 1. Vision & Goals
Smriti is a persistent context companion for AI coding agents. It provides a local database, git intelligence layer, and semantic retrieval index to ensure that context (decisions, business rules, architectural choices, feature roadmaps, bug history, and previous chat sessions) is preserved across IDE sessions, LLM model switches, and workspace cleanups.

### Initial Milestone
Build a **hybrid working prototype** including:
1. A **Python FastAPI backend** executing local directory scanning, SQLite structured tracking, local/cloud embedding generation, Qdrant semantic indexing, and a unified LLM prompt context manager.
2. A **React + Vite + TypeScript + Tailwind CSS frontend** implementing a clean theme with a white background (`bg-white`) and skyblue buttons/accents (`bg-sky-500` / `hover:bg-sky-600`) to visualize all modules.

---

## 2. Core Architecture

```
                       [React Frontend] (Port 5173)
                   (White Background / Skyblue Accents)
                               │
                               │ REST APIs / SSE
                               ▼
                    [FastAPI Backend] (Port 8000)
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
     [SQLite DB] (smriti.db)            [Qdrant local-file DB]
     - Commits & Git Intent             - Vector Index (smriti_chunks)
     - ADR Decisions                    - all-MiniLM-L6-v2 Embeddings
     - Feature & Bug logs
     - Custom standards / rules
```

---

## 3. Detailed Data Storage Schema

### 3.1 SQLite Schema (`smriti.db`)

* **`settings`**:
  * `key` TEXT PRIMARY KEY (e.g., `llm_provider`, `gemini_api_key`, `openai_api_key`, `ollama_url`, `last_scanned_path`)
  * `value` TEXT
* **`repository_metadata`**:
  * `id` INTEGER PRIMARY KEY AUTOINCREMENT
  * `path` TEXT UNIQUE
  * `name` TEXT
  * `framework` TEXT
  * `languages` TEXT
  * `total_files` INTEGER
  * `total_lines` INTEGER
  * `last_scanned` DATETIME
* **`commits`**:
  * `sha` TEXT PRIMARY KEY
  * `message` TEXT
  * `author` TEXT
  * `date` DATETIME
  * `files_changed` TEXT (JSON list of changed paths)
  * `summary` TEXT
  * `intent` TEXT
  * `affected_features` TEXT (JSON list)
  * `remaining_work` TEXT
* **`decisions`**:
  * `id` INTEGER PRIMARY KEY AUTOINCREMENT
  * `title` TEXT
  * `status` TEXT (e.g., "Accepted", "Rejected", "Proposed")
  * `author` TEXT
  * `reason` TEXT
  * `alternatives` TEXT
  * `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
* **`features`**:
  * `id` INTEGER PRIMARY KEY AUTOINCREMENT
  * `name` TEXT
  * `progress` INTEGER DEFAULT 0
  * `status` TEXT (e.g., "Not Started", "In Progress", "Completed")
  * `description` TEXT
* **`bugs`**:
  * `id` INTEGER PRIMARY KEY AUTOINCREMENT
  * `title` TEXT
  * `status` TEXT DEFAULT "Open"
  * `severity` TEXT (e.g., "Low", "Medium", "High")
  * `related_files` TEXT
  * `description` TEXT
  * `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
* **`memory_rules`**:
  * `key` TEXT PRIMARY KEY
  * `content` TEXT
  * `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### 3.2 Vector Database (Qdrant Local File Mode)
Collection name: `smriti_chunks`
* **Vector Size:** `384` (for local SentenceTransformers `all-MiniLM-L6-v2`) or `1536` (if using cloud APIs like OpenAI text-embedding-3-small).
* **Payload Structure:**
  ```json
  {
    "chunk_id": "uuid-string",
    "type": "file_chunk | decision | commit | rule",
    "file_path": "src/auth.py",
    "content": "Full text of the chunk...",
    "metadata": {
      "start_line": 1,
      "end_line": 25,
      "sha": "optional-commit-sha",
      "tags": ["auth", "jwt"]
    }
  }
  ```

---

## 4. API Specification (FastAPI)

### 4.1 Settings & Scanner Management
* `GET /api/settings` - Retrieve configured providers and status.
* `POST /api/settings` - Save config (keys are stored locally in plaintext or encrypted).
* `POST /api/scan` - Execute local repo parsing. Uses GitPython to read commit log. Uses simple AST parsers to identify files/structures. Builds workspace graph.
* `GET /api/status` - Returns database connections status and current repository statistics.

### 4.2 Modules APIs
* `GET /api/repository` - Returns the parsed file tree and framework layout of the scanned workspace.
* `GET /api/commits` - Returns commit summaries and AI-analyzed developer intent.
* `GET /api/decisions` - Returns list of ADRs (Architecture Decision Records).
* `POST /api/decisions` - Creates a new ADR and upserts to Qdrant vector index.
* `GET /api/features` - Retrieves features and progress status.
* `POST /api/features` - Updates or adds features.
* `GET /api/bugs` - Lists known bugs and affected files.
* `POST /api/bugs` - Creates/updates bug records.
* `GET /api/rules` - Retrieves memory rules (business requirements, code styles).
* `POST /api/rules` - Updates rule content and pushes to Qdrant index.

### 4.3 Intelligence & Retrieval
* `POST /api/search` - Queries the vector database for matching code chunks and rules.
* `POST /api/prompt-context` - Constructs the prompt context (selected files, rules, decisions, commits) based on the user's prompt and calculates estimated token usage.
* `POST /api/chat` - Queries the selected LLM provider (or mock wrapper) with the compiled context. Returns simulated or real answers with source citations.

---

## 5. UI Design Requirements (Frontend)
The user will provide a custom design later, but the prototype must adhere to:
* **Background:** Solid white (`bg-white` or `#ffffff`).
* **Buttons / Accent elements:** Skyblue (`bg-sky-500` / `hover:bg-sky-600` / text color `text-sky-600`).
* **Layout:** A clean navigation sidebar with quick dashboard summary statistics, a code exploration window, semantic search panels, and configuration settings.

---

## 6. Development & Verification Plan
* **Backend Unit Tests:** Using `pytest` to test database schemas, Qdrant client initialization in file mode, scanner directories, and API endpoints.
* **Frontend Verification:** Running `npm run dev` to verify user interfaces on `http://localhost:5173`, scanning a mock repository, creating decisions, and running semantic searches.
