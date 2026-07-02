# Smriti AI

> **Persistent Memory Daemon & Context Engine for AI Coding Agents**  
> *"Never let your coding agent forget. Maintain absolute project context across sessions, models, and machines."*

---

## 🧠 1. Executive Summary & Vision

AI coding agents are highly capable but suffer from session-based amnesia. Every time you close your IDE, switch LLM models, clean up your workspace, or move to another machine, the valuable context of your project is lost. You find yourself repeatedly explaining:
*   Why specific architecture decisions (like selecting PostgreSQL for JSONB) were made.
*   The team's naming conventions (e.g., snake_case for Python, camelCase for TypeScript).
*   The current sprint milestones, roadmap, and outstanding bug files.
*   How core business constraints and guidelines connect to specific modules.

**Smriti** (Sanskrit for *memory* or *recollection*) solves this problem. It runs as a local daemon (Port 8000) that maintains a structured SQLite relational database and a file-persisted Qdrant vector index. 

When any coding agent initializes in this workspace, it reads Smriti's schema or queries its context builder to instantly load rules, ADRs, commits history, and unresolved bug reports.

---

## 🏗️ 2. Core Architecture

Smriti operates as a local context-retrieval system:

```
                    +------------------------------------+
                    |        VS Code / Cursor IDE        |
                    |     (Connected via Coding Agent)   |
                    +------------------------------------+
                                      │
                                      │ REST API / SSE
                                      ▼
                    +------------------------------------+
                    |           Smriti Daemon            |
                    |           (FastAPI App)            |
                    +------------------------------------+
                                      │
           ┌──────────────────────────┴──────────────────────────┐
           ▼                                                     ▼
+---------------------+                               +---------------------+
|     SQLite DB       |                               |      Qdrant DB      |
|  (smriti.db)        |                               | (smriti_qdrant.db)  |
+---------------------+                               +---------------------+
| - settings          |                               | - Collection:       |
| - metadata          |                               |   smriti_chunks     |
| - commits & intent  |                               | - Vectors: 384-dim  |
| - ADR decisions     |                               | - Type payload tags |
| - sprint features   |                               |                     |
| - bug logs          |                               |                     |
| - custom rules      |                               |                     |
+---------------------+                               +---------------------+
```

---

## ⚙️ 3. The 13 Core Modules & Prototype Implementation

Smriti is divided into 13 logical modules. Below is how each is implemented or simulated in this working prototype:

### 1. Repository Analyzer
*   **Concept:** Traverses the filesystem to compute files tree, framework tags, and language metadata.
*   **Implementation (`backend/analyzer.py`):** Automatically traverses directories (skipping `.git`, `node_modules`, `.venv`, and other static builds). Uses simple regex-based triggers on configuration files (`package.json`, `requirements.txt`, `pom.xml`, `docker-compose.yml`) to detect frameworks (Next.js, FastAPI, Spring, Docker, etc.) and gathers line count statistics on code files.

### 2. Memory Engine
*   **Concept:** Stores custom project goals, business logic, user preferences, and styling tokens.
*   **Implementation (`backend/database.py`):** SQLite tables `memory_rules` initialize with default templates (`project_goal`, `business_logic`, `coding_standards`, `naming_rules`, `design_system`). These rules are fully editable on the frontend and are dynamically injected into prompt queries.

### 3. Git Intelligence
*   **Concept:** Scans repository commits to summarize developer intent and outstanding work.
*   **Implementation (`backend/git_intel.py`):** Uses `GitPython` to open the local repository and parse the active branch commits. Extends raw messages to compute developer intents ("New Feature", "Bug Fix", "Refactoring", etc.) and extracts unresolved TODO items.

### 4. Decision Engine
*   **Concept:** Logs Architecture Decision Records (ADRs) to persist the rationale behind tooling choices.
*   **Implementation (`backend/main.py`):** Inserts ADR parameters (Author, Title, Status, Reason, Alternatives) to the SQLite `decisions` table and indexes the records in the Qdrant vector store.

### 5. Semantic Search
*   **Concept:** Queries indexed workspace documents, rules, commits, and decisions.
*   **Implementation (`backend/vector_db.py`):** Initiates a Qdrant client in local-file mode. Implements a normalized Hashing Trick TF-IDF embedding fallback so that semantic searches run offline with zero PyTorch/TensorFlow dependency requirements.

### 6. Conversation Memory
*   **Concept:** Archives user conversations to preserve feedback loops (e.g. *"Don't use Redux"*).
*   **Implementation (`backend/main.py`):** Scans the chat inputs and writes conversation context matches to the vector index.

### 7. Feature Tracker
*   **Concept:** Tracks sprint goals and completion progress.
*   **Implementation (`backend/main.py`):** Relational tracking inside SQLite `features` table. Updates progress percentages (0-100%) and updates status gauges (Not Started, In Progress, Completed).

### 8. Bug Intelligence
*   **Concept:** Logs unresolved bug locations, severity, and related files.
*   **Implementation (`backend/main.py`):** Relational tracking inside SQLite `bugs` table. Associates bugs with files (e.g., `Sidebar.tsx, Dashboard.tsx`) to show where issues remain.

### 9. Knowledge Graph
*   **Concept:** Maps visual node-link connections between rules, modules, and code files.
*   **Implementation (`frontend/src/components/RepoAnalyzer.tsx`):** Structures workspace tree nodes recursively. Maps frameworks, libraries, and languages visually.

### 10. Prompt Builder
*   **Concept:** Optimizes LLM context by packing only relevant files, rules, commits, and decisions.
*   **Implementation (`backend/llm.py`):** Queries vector DB for keywords, fetches matching files, ADRs, and active standards, and formats them into a clean, markdown-structured LLM context wrapper.

### 11. Memory Compression
*   **Concept:** Condenses large files to prevent context window overflows.
*   **Implementation (`backend/llm.py` & `backend/main.py`):** Limits code file indexing to text documents under 200KB and breaks them into 1000-character chunks. Embeddings are summarized by snippet scopes.

### 12. Multi-Agent Support
*   **Concept:** Allows integration with multiple agent frameworks (Claude Code, Cursor, Cline, etc.).
*   **Implementation (`.agents/AGENTS.md`):** Custom workspace rule configurations inject direct instructions telling any starting agent to check `backend/smriti.db` and query API ports before implementing changes.

### 13. Security
*   **Concept:** Local-first storage and keys encryption.
*   **Implementation (`backend/vector_db.py`):** Operates 100% locally. SQLite and Qdrant database structures reside in the workspace directory.

---

## 🛠️ 4. Technical Stack

### Backend / Core Daemon
*   **FastAPI & Uvicorn**: Lightweight REST API web server.
*   **SQLite**: Local relational database engine.
*   **Qdrant Client**: File-based local vector search engine.
*   **GitPython**: Git logs, branch metadata, and commits parser.
*   **Pydantic**: Data schema validation and serialization.
*   **Pytest**: Unit and integration tests.

### Frontend Dashboard Client
*   **React 18 & TypeScript**: Fast interactive state manager.
*   **Vite**: Frontend dev server and bundler.
*   **Tailwind CSS**: Utility-first CSS framework configured in **white background** (`bg-white`) and **skyblue buttons** (`bg-sky-500` / `hover:bg-sky-600` / `text-sky-600`).
*   **Lucide React**: Clean vector icon suite.

---

## 📂 REST API Endpoints Specification

### 1. Settings & Status
*   `GET /api/settings` - Retrieve LLM providers configuration and API keys existence status.
*   `POST /api/settings` - Set active LLM provider (Gemini, OpenAI, Ollama), API credentials, and endpoint URLs.
*   `GET /api/status` - Returns daemon connectivity status, loaded repository path, total ADR decisions count, and active open bugs count.

### 2. Scanner & Repository
*   `POST /api/scan` - Accepts folder directory path. Traverses folders using `analyzer.py`, reads commit history via `git_intel.py`, saves data in SQLite, and indexes chunks in vector store.
*   `GET /api/repository` - Returns the parsed repository folder structure in a recursive tree format.

### 3. Decisions (ADR Log)
*   `GET /api/decisions` - Return all logged ADR decisions.
*   `POST /api/decisions` - Creates a new ADR decision and indexes its content in the vector DB.

### 4. Sprint Features
*   `GET /api/features` - Returns tracked features, descriptions, statuses, and progress gauges.
*   `POST /api/features` - Adds a new feature to the sprint roadmap.
*   `POST /api/features/{id}` - Update a feature's progress percentage and status.

### 5. Bug Logs
*   `GET /api/bugs` - Returns logged bugs, descriptions, severities, and related file scopes.
*   `POST /api/bugs` - Log a new bug.
*   `POST /api/bugs/{id}` - Updates a bug's status (e.g. Open to Closed/Fixed).

### 6. Memory Rules
*   `GET /api/rules` - Returns list of active project standards and requirements.
*   `POST /api/rules/{key}` - Overwrites a rule category content (e.g. `coding_standards`) and re-indexes it.

### 7. Retrieval & Chat
*   `POST /api/search` - Searches vector DB for matching chunks.
*   `POST /api/prompt-context` - Compiles query keywords, retrieves matching chunks, maps them to a formatted markdown context block, and returns estimated tokens count.
*   `POST /api/chat` - Queries the LLM provider (or mock fallback) using the compiled prompt context and returns the answer alongside source citation metadata.

---

## ⚡ Setup & Installation Guide

### 1. System Requirements
*   Python 3.9+ installed and added to your system `PATH`.
*   Node.js (v18+) and npm installed.
*   Git CLI client installed.

---

### 2. Backend Daemon Setup
1.  Navigate to the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Initialize an isolated virtual environment:
    ```bash
    python -m venv .venv
    ```
3.  Activate the virtual environment:
    *   **Windows (PowerShell):**
        ```powershell
        .venv\Scripts\Activate.ps1
        ```
    *   **Windows (MSYS2 / Git Bash):**
        ```bash
        source .venv/bin/activate
        ```
    *   **macOS / Linux:**
        ```bash
        source .venv/bin/activate
        ```
4.  Install the required packages. Note that we force binary wheels to avoid local compilation requirements:
    ```bash
    pip install fastapi uvicorn GitPython pydantic pytest httpx --only-binary=:all:
    ```
5.  Start the FastAPI daemon:
    ```bash
    uvicorn main:app --reload --host 127.0.0.1 --port 8000
    ```
    The daemon will start listening on `http://127.0.0.1:8000`.

---

### 3. Frontend App Setup
1.  Navigate to the `frontend/` directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Vite local development server:
    ```bash
    npm run dev
    ```
    Open your browser and navigate to **`http://localhost:5173`** to access the dashboard.

---

## 🧪 Testing and Verification

### 1. Running the Automated Test Suite
Smriti includes a robust test suite covering database schemas, directory scanning, commit logging, vector embeddings calculations, LLM routing fallbacks, REST endpoint clients, and E2E integrations.

To execute tests:
1.  Ensure the virtual environment is active in the `backend/` folder.
2.  Run pytest:
    ```bash
    pytest backend/ -v
    ```
    Expected output:
    ```
    backend\tests\test_analyzer.py .                                         [  6%]
    backend\tests\test_database.py ...                                       [ 25%]
    backend\tests\test_git_intel.py ..                                       [ 37%]
    backend\tests\test_integration.py .                                      [ 43%]
    backend\tests\test_llm.py ...                                            [ 62%]
    backend\tests\test_main.py ....                                          [ 87%]
    backend\tests\test_vector_db.py ..                                       [100%]
    ============================= 16 passed in 6.78s ==============================
    ```

---

### 2. Manual E2E Validation Flow
To check the workspace scanning and retrieval flow:
1.  Open the web interface at `http://localhost:5173`.
2.  Navigate to **Settings** (bottom of the left sidebar).
3.  Enter the path `C:\Users\hp\Smriti` into the **Absolute Directory Path** input box and click **Scan and Index Repository**.
4.  Verify that the dashboard header updates, displaying the project statistics (e.g. *43 files, 7,439 lines of code*).
5.  Go to the **Decisions Log** page and click **Log Architecture Decision**.
6.  Record a decision:
    *   **Title**: Choosing React over Angular
    *   **Author**: Sreeshanth
    *   **Reason**: Speed of virtual DOM, component reusability, and simple state configurations.
    *   **Alternatives**: Angular, Vue
7.  Go to **Semantic Search** and type *"Why React?"* into the input box. Click **Ask Memory**.
8.  Observe the results. The context manager will search the local index, compile the relevant ADR decision chunk, estimate token counts, and output the response. It will cite *"Source 1: decision | Choose React over Angular"* with its calculated vector cosine similarity score.

---

## 🚀 Future Roadmap

To move this working prototype to a production environment, the following enhancements are scheduled:
1.  **AST Code Parser (Language Server Protocol)**: Replace regex analyzer with AST parsing via `tree-sitter` to extract exact function signatures, type parameters, and class dependencies.
2.  **Vector Store Upgrade**: Deploy a local dockerized Qdrant Server instead of local-file mode for larger workspaces (>10,000 files).
3.  **Local Neural Embeddings**: Pre-download `all-MiniLM-L6-v2` locally inside PyTorch when high-bandwidth networks are available.
4.  **IDE Extension Wrapper**: Package the frontend dashboard into a local VS Code / Cursor iframe sidebar extension that auto-detects active workspace folders.
5.  **Multi-Agent Context Hook**: Write a CLI adapter (e.g., `smriti-context`) that acts as a wrapper for tools like `aider` or `cline`, auto-injecting prompt files before agent starts.
6.  **E2E Memory Encryption**: Implement AES-256 encryption on settings and database credentials files.
