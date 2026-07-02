# Smriti AI

> **Persistent Memory for AI Coding Agents**  
> *"Never let your coding agent forget."*

Smriti acts as a local persistent daemon and context engine. It records your repository's framework layout, git commits history, developer intent, Architecture Decision Records (ADRs), Sprint features progress, and bug logs, indexing them in SQLite and Qdrant. 

When you close your IDE, change models, or switch machines, subsequent coding agents can connect to Smriti's API or SQLite database to load the entire context of your repository instantly.

---

## 📖 Vision & Purpose

Today's coding agents suffer from amnesia. Every time you open a new session, you must explain your database choice, project standards, billing flows, and known bugs from scratch. 

Smriti bridges this gap by creating an external, standardized project context engine that is readable by any agent (Claude Code, Cursor, Cline, Roo Code, Aider, etc.).

```
User: "Continue building authentication"
  ↓
Smriti: Loads Context (✓ Architecture, ✓ Coding Rules, ✓ Previous Conversations, ✓ Open Issues)
  ↓
Agent: "Continuing from yesterday..."
```

---

## 🏗️ Architecture & Technology Stack

```
                           [React Frontend] (Vite, TS, Tailwind)
                                     │
                                     │ REST APIs / JSON
                                     ▼
                          [FastAPI Backend Daemon]
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
       [SQLite Database]                      [Qdrant Vector DB]
       - ADR Decisions                        - 384-dim normalized hashing vectors
       - Features & Bug logs                  - Document chunk indexes
       - Git commits & Rules
```

### Core Technologies
*   **Frontend:** React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons.
*   **Backend:** Python 3.9+, FastAPI, SQLite 3, GitPython.
*   **Vector Engine:** Qdrant Client (File-persistent / In-Memory Cosine Similarity fallbacks).
*   **Embeddings:** Unified client embedding model routers (hashing-based vector mapping fallback).

---

## 📂 Project Directory Structure

```
c:\Users\hp\Smriti\
├── backend/
│   ├── main.py            # FastAPI main entrypoint and API routes
│   ├── database.py        # SQLite database connection and schemas setup
│   ├── vector_db.py       # Qdrant client connection and fallback vector search engine
│   ├── analyzer.py        # Repository crawler, framework, and language analyzer
│   ├── git_intel.py       # GitPython commit log and intent parser
│   ├── llm.py             # LLM client router and offline simulation fallback
│   ├── models.py          # Pydantic validation schemas
│   ├── requirements.txt   # Backend requirements definition
│   └── tests/             # Pytest unit and integration test suite
└── frontend/
    ├── package.json       # React Vite dependencies configuration
    ├── tailwind.config.js # Tailwind CSS compilation options
    ├── src/
    │   ├── App.tsx        # Main navigation workspace layout
    │   ├── utils/api.ts   # Browser fetch wrappers for backend REST requests
    │   └── components/    # Tab modules (DashboardHome, SemanticSearch, Settings, etc.)
    └── index.html         # Main page mount point
```

---

## ⚡ Getting Started

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Python 3.9+](https://www.python.org/downloads/)
*   [Node.js (v18+)](https://nodejs.org/)
*   [Git](https://git-scm.com/)

---

### 2. Backend Daemon Setup
1. Open your terminal in the `backend/` folder.
2. Initialize the Python virtual environment:
   ```bash
   python -m venv .venv
   ```
3. Activate the virtual environment:
   *   **Windows (PowerShell):**
       ```powershell
       .venv\Scripts\Activate.ps1
       ```
   *   **Windows (MSYS2/Git Bash):**
       ```bash
       source .venv/bin/activate
       ```
   *   **macOS/Linux:**
       ```bash
       source .venv/bin/activate
       ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```
   The backend daemon will be live at `http://127.0.0.1:8000`.

---

### 3. Frontend App Setup
1. Open a new terminal window in the `frontend/` folder.
2. Install npm packages:
   ```bash
   npm install
   ```
3. Launch the Vite development server:
   ```bash
   npm run dev
   ```
   Access the user interface dashboard at `http://localhost:5173`.

---

## 🧪 Running Tests

To verify that all backend modules, databases, scanners, and endpoints compile and run correctly, execute pytest inside the backend virtual environment:

```bash
# Ensure you are in the project root and virtual env is active
pytest backend/
```

All 16 unit and integration test modules are fully automated.

---

## 🔒 Security & Offline Mode
*   **Local Storage:** All scanned structures and git commit indices are stored locally in `backend/smriti.db`.
*   **Vector Isolation:** Search vectors are computed using a normalized hashing algorithm locally, requiring no external cloud uploads.
*   **LLM Choice:** Cloud engines (Gemini/OpenAI) are only queried if custom API keys are saved in the Settings panel; otherwise, the mock router computes context-sensitive answers locally.
