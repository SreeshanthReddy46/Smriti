import os
import json
from datetime import datetime
from git import Repo

def scan_git_history(repo_path, limit=30):
    """
    Opens the git repository at repo_path and extracts the recent commit logs.
    Includes file change statistics and intent parsing.
    """
    commits_list = []
    if not os.path.exists(repo_path):
        return commits_list

    try:
        # Check if it's a valid git repository
        repo = Repo(repo_path, search_parent_directories=True)
        if repo.bare:
            return commits_list
            
        # Get active branch commits
        commits = list(repo.iter_commits(max_count=limit))
        
        for commit in commits:
            # Get list of changed files
            files_changed = []
            try:
                # Get files compared to parent commit
                if commit.parents:
                    diffs = commit.parents[0].diff(commit)
                    for d in diffs:
                        if d.a_path:
                            files_changed.append(d.a_path)
                else:
                    # Initial commit - list all files in the tree
                    for entry in commit.tree.traverse():
                        if entry.type == 'blob':
                            files_changed.append(entry.path)
            except Exception:
                pass

            message = commit.message.strip()
            summary = message.split("\n")[0] if message else "No message"
            
            # Simple heuristic classification of developer intent
            intent = "Chore / Maintenance"
            lower_msg = message.lower()
            if lower_msg.startswith("feat"):
                intent = "New Feature"
            elif lower_msg.startswith("fix"):
                intent = "Bug Fix"
            elif lower_msg.startswith("refactor"):
                intent = "Code Refactoring"
            elif lower_msg.startswith("docs"):
                intent = "Documentation"
            elif lower_msg.startswith("test"):
                intent = "Testing Additions"
            elif "perf" in lower_msg:
                intent = "Performance Optimization"
            elif "style" in lower_msg:
                intent = "UI/Style Adjustments"

            # Estimate affected features from message or file paths
            affected_features = []
            for word in ["auth", "login", "signup", "jwt"]:
                if word in lower_msg or any(word in f.lower() for f in files_changed):
                    affected_features.append("Authentication")
            for word in ["pay", "billing", "invoice", "stripe"]:
                if word in lower_msg or any(word in f.lower() for f in files_changed):
                    affected_features.append("Payments")
            for word in ["chart", "graph", "metric", "analytics", "dashboard"]:
                if word in lower_msg or any(word in f.lower() for f in files_changed):
                    affected_features.append("Analytics")

            if not affected_features:
                affected_features.append("General Maintenance")
            
            # Deduplicate
            affected_features = list(set(affected_features))

            # Extract remaining work (look for todo/fixme/unresolved in commit body)
            remaining_work = ""
            todo_lines = []
            for line in message.split("\n")[1:]:
                if "todo" in line.lower() or "fixme" in line.lower():
                    todo_lines.append(line.strip("- *#\t "))
            if todo_lines:
                remaining_work = "; ".join(todo_lines)
            else:
                remaining_work = "None indicated in commit message."

            commits_list.append({
                "sha": commit.hexsha,
                "message": message,
                "author": f"{commit.author.name} <{commit.author.email}>",
                "date": datetime.fromtimestamp(commit.committed_date).isoformat(),
                "files_changed": json.dumps(files_changed),
                "summary": summary,
                "intent": intent,
                "affected_features": json.dumps(affected_features),
                "remaining_work": remaining_work
            })
        repo.close()
    except Exception as e:
        # Gracefully return empty list if GitPython fails or directory is not a git repo
        print(f"Git history scan bypassed: {e}")
        
    return commits_list
