import os
import json
from datetime import datetime

# Common directories to ignore during indexing
IGNORE_DIRS = {
    ".git", "node_modules", "__pycache__", ".next", "dist", "build",
    ".venv", "venv", "env", "target", ".idea", ".vscode", ".gemini"
}

# Binary file extensions that we should not count lines for
BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".zip", ".tar", ".gz",
    ".mp3", ".mp4", ".wav", ".exe", ".dll", ".so", ".bin", ".pyc"
}

# Map extensions to languages
EXTENSION_MAP = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript (React)",
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".java": "Java",
    ".go": "Go",
    ".rs": "Rust",
    ".cpp": "C++",
    ".c": "C",
    ".h": "C/C++ Header",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP",
    ".html": "HTML",
    ".css": "CSS",
    ".sh": "Shell Script",
    ".md": "Markdown",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".xml": "XML",
    ".sql": "SQL"
}

def is_text_file(filename):
    _, ext = os.path.splitext(filename.lower())
    return ext not in BINARY_EXTENSIONS

def get_file_stats(filepath):
    """
    Returns file size and total line count if it is a text file.
    """
    try:
        size = os.path.getsize(filepath)
        if not is_text_file(filepath):
            return size, 0
        
        lines = 0
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            for _ in f:
                lines += 1
        return size, lines
    except Exception:
        return 0, 0

def detect_languages_and_frameworks(path):
    """
    Analyzes the workspace to detect dominant languages and frameworks.
    """
    languages = set()
    frameworks = []
    
    # 1. Traversal search
    for root, dirs, files in os.walk(path):
        # Prune ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            _, ext = os.path.splitext(file.lower())
            if ext in EXTENSION_MAP:
                languages.add(EXTENSION_MAP[ext])
            
            # Framework detection triggers
            if file == "package.json":
                try:
                    with open(os.path.join(root, file), "r", encoding="utf-8", errors="ignore") as f:
                        pkg = json.load(f)
                        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
                        if "next" in deps:
                            frameworks.append("Next.js")
                        elif "react" in deps:
                            frameworks.append("React")
                        elif "angular" in deps:
                            frameworks.append("Angular")
                        elif "vue" in deps:
                            frameworks.append("Vue.js")
                except Exception:
                    pass
            
            if file == "requirements.txt" or file == "Pipfile":
                try:
                    with open(os.path.join(root, file), "r", encoding="utf-8", errors="ignore") as f:
                        reqs = f.read()
                        if "fastapi" in reqs.lower():
                            frameworks.append("FastAPI")
                        elif "flask" in reqs.lower():
                            frameworks.append("Flask")
                        elif "django" in reqs.lower():
                            frameworks.append("Django")
                except Exception:
                    pass
            
            if file == "pom.xml":
                frameworks.append("Maven/Spring")
            if file == "docker-compose.yml" or file == "Dockerfiles":
                frameworks.append("Docker")

    if not frameworks:
        frameworks.append("Generic Project")
        
    # Deduplicate frameworks
    frameworks = list(set(frameworks))
    return list(languages), frameworks[0] if frameworks else "Generic Project"

def build_tree(path, root_path=None):
    """
    Builds a JSON hierarchical structure representing the directory tree.
    """
    if root_path is None:
        root_path = path

    name = os.path.basename(path) if os.path.basename(path) else path
    relative_path = os.path.relpath(path, root_path)
    if relative_path == ".":
        relative_path = ""

    node = {
        "name": name,
        "path": relative_path,
        "type": "directory" if os.path.isdir(path) else "file"
    }

    if os.path.isdir(path):
        children = []
        try:
            items = os.listdir(path)
        except Exception:
            return node # Handle permission errors

        for item in sorted(items):
            if item in IGNORE_DIRS:
                continue
            item_path = os.path.join(path, item)
            children.append(build_tree(item_path, root_path))
        node["children"] = children
    else:
        size, lines = get_file_stats(path)
        node["size"] = size
        node["lines"] = lines

    return node

def scan_directory(path):
    """
    Scans a directory, computing language/framework details, files count, lines count,
    and generating the full file tree.
    """
    if not os.path.exists(path) or not os.path.isdir(path):
        raise ValueError(f"Path '{path}' is not a valid directory.")

    total_files = 0
    total_lines = 0

    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            total_files += 1
            filepath = os.path.join(root, file)
            _, lines = get_file_stats(filepath)
            total_lines += lines

    languages, framework = detect_languages_and_frameworks(path)
    file_tree = build_tree(path)

    return {
        "name": os.path.basename(os.path.abspath(path)),
        "path": os.path.abspath(path),
        "framework": framework,
        "languages": languages,
        "total_files": total_files,
        "total_lines": total_lines,
        "file_tree": file_tree,
        "last_scanned": datetime.now().isoformat()
    }
