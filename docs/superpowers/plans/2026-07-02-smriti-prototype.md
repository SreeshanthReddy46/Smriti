# Smriti Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working prototype of Smriti with a FastAPI backend and a clean, skyblue-accented React frontend that scans directories, summaries git commits, handles ADR decisions, tracks features and bugs, and does local semantic search.

**Architecture:** The python backend uses a local SQLite DB for structured relational tracking and a file-mode Qdrant Client for vector search. The React frontend interfaces via REST API and offers views for all Smriti modules with skyblue accents on a white background.

**Tech Stack:** FastAPI, SQLite, Qdrant-Client, SentenceTransformers, GitPython, React, Vite, TypeScript, Tailwind CSS.

## Global Constraints

*   Backend must run on Python 3.9+ and expose REST APIs on `http://localhost:8000`.
*   SQLite database file must be saved in the backend directory as `smriti.db`.
*   Qdrant client must run in local-file persistent mode using path `./smriti_qdrant.db`.
*   Frontend must use Vite + React + TypeScript + Tailwind CSS and run on `http://localhost:5173`.
*   Frontend styling must have a white background (`bg-white`) and skyblue buttons (`bg-sky-500` / `hover:bg-sky-600` / `text-sky-600`).
*   Tests must be written with `pytest` for the backend and run successfully before finishing.

---

### Task 1: Backend Setup, SQLite Database & Pydantic Models

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/database.py`
- Create: `backend/models.py`
- Create: `backend/tests/test_database.py`

**Interfaces:**
- Consumes: None
- Produces: SQLite tables schema, `get_db_connection()`, Pydantic models for REST payload validation.

- [ ] **Step 1: Create backend/requirements.txt**
  Create file with dependencies: fastapi, uvicorn, qdrant-client, sentence-transformers, GitPython, pydantic, pytest.
- [ ] **Step 2: Create SQLite Database Helper and Tables Schema**
  Write connection pooling and schema initialization logic in `backend/database.py`. It should check for file existence and create tables: `settings`, `repository_metadata`, `commits`, `decisions`, `features`, `bugs`, `memory_rules` on startup.
- [ ] **Step 3: Create Pydantic Request/Response Models**
  Write validation models in `backend/models.py` for Settings, ADR Decisions, Bugs, Features, Rules, Search Requests.
- [ ] **Step 4: Write test verifying schema creation and DB read/write**
  Create `backend/tests/test_database.py` to run unit tests against an in-memory SQLite DB.
- [ ] **Step 5: Run database tests to verify passing**
  Run: `pytest backend/tests/test_database.py -v`
  Expected: 1 PASSED
- [ ] **Step 6: Commit changes**
  Run: `git add backend/` and commit.

---

### Task 2: Repository Analyzer & AST Parser

**Files:**
- Create: `backend/analyzer.py`
- Create: `backend/tests/test_analyzer.py`

**Interfaces:**
- Consumes: `backend/database.py`
- Produces: `scan_directory(path: str)` returning metadata statistics and file tree representation.

- [ ] **Step 1: Write test for folder scanner**
  Create `backend/tests/test_analyzer.py` with mock folder structure and check if scanner counts files, lines of code, and structures the file tree JSON correctly.
- [ ] **Step 2: Run test to verify it fails**
  Run: `pytest backend/tests/test_analyzer.py -v`
  Expected: FAIL with Import Error
- [ ] **Step 3: Implement analyzer.py**
  Write folder traversal scanner in `backend/analyzer.py`. Implement simple regex-based checks to detect frameworks (Next.js, FastAPI, etc.) and file extensions. Return JSON mapping of folder tree structure.
- [ ] **Step 4: Run test to verify it passes**
  Run: `pytest backend/tests/test_analyzer.py -v`
  Expected: PASSED
- [ ] **Step 5: Commit changes**
  Run: `git add backend/analyzer.py backend/tests/test_analyzer.py` and commit.

---

### Task 3: Git Intelligence Integration

**Files:**
- Create: `backend/git_intel.py`
- Create: `backend/tests/test_git_intel.py`

**Interfaces:**
- Consumes: None
- Produces: `scan_git_history(repo_path: str, limit: int)` returning commit summaries, file changes, and estimated intent.

- [ ] **Step 1: Write test for git history extractor**
  Create test to mock Git repository commits using a temporary directory initialized with `git init`.
- [ ] **Step 2: Run test to verify it fails**
  Run: `pytest backend/tests/test_git_intel.py -v`
  Expected: FAIL
- [ ] **Step 3: Implement git_intel.py**
  Use `GitPython` to read repository logs. Extract commit hash, author, date, message, changed files list. Parse message to auto-generate a fallback intent categorization (e.g. "feat", "fix", "refactor") and mock detailed intent when LLM is offline.
- [ ] **Step 4: Run test to verify it passes**
  Run: `pytest backend/tests/test_git_intel.py -v`
  Expected: PASSED
- [ ] **Step 5: Commit changes**
  Run: `git add backend/git_intel.py backend/tests/test_git_intel.py` and commit.

---

### Task 4: Vector Database Indexer & Embedding Engine

**Files:**
- Create: `backend/vector_db.py`
- Create: `backend/tests/test_vector_db.py`

**Interfaces:**
- Consumes: None
- Produces: `initialize_vector_db()`, `index_chunk(chunk_id, type, content, metadata)`, `search_chunks(query, limit)`

- [ ] **Step 1: Write test for Qdrant client**
  Create test in `backend/tests/test_vector_db.py` initializing Qdrant client in memory, indexing mock text chunks, and querying them.
- [ ] **Step 2: Run test to verify it fails**
  Run: `pytest backend/tests/test_vector_db.py -v`
  Expected: FAIL
- [ ] **Step 3: Implement vector_db.py**
  Initialize local-file mode Qdrant client. Implement lazy loading for sentence-transformers `all-MiniLM-L6-v2` embeddings, and basic TF-IDF fallback vector calculation if torch/transformers fail to load. Write indexer and search retrieval functions.
- [ ] **Step 4: Run test to verify it passes**
  Run: `pytest backend/tests/test_vector_db.py -v`
  Expected: PASSED
- [ ] **Step 5: Commit changes**
  Run: `git add backend/vector_db.py backend/tests/test_vector_db.py` and commit.

---

### Task 5: LLM Engine & Prompt Context Builder

**Files:**
- Create: `backend/llm.py`
- Create: `backend/tests/test_llm.py`

**Interfaces:**
- Consumes: `backend/vector_db.py`, `backend/database.py`
- Produces: `generate_prompt_context(prompt: str)`, `ask_llm(context_prompt: str)` returning simulated or real cloud replies with source references.

- [ ] **Step 1: Write test for context compilation**
  Create `backend/tests/test_llm.py` to check if query retrieves correct vector DB payloads, builds clean markdown context, and formats LLM prompt.
- [ ] **Step 2: Run test to verify it fails**
  Run: `pytest backend/tests/test_llm.py -v`
  Expected: FAIL
- [ ] **Step 3: Implement llm.py**
  Write prompt context assembly logic (fetching code snippets, active ADRs, and custom memory rules matching query keywords). Implement Gemini/OpenAI/Ollama API wrappers, alongside a mock response generator that returns realistic answers and citations when offline.
- [ ] **Step 4: Run test to verify it passes**
  Run: `pytest backend/tests/test_llm.py -v`
  Expected: PASSED
- [ ] **Step 5: Commit changes**
  Run: `git add backend/llm.py backend/tests/test_llm.py` and commit.

---

### Task 6: FastAPI REST API App

**Files:**
- Create: `backend/main.py`
- Create: `backend/tests/test_main.py`

**Interfaces:**
- Consumes: All backend modules (database, analyzer, git_intel, vector_db, llm)
- Produces: Full REST API suite running on Port 8000 with CORS allowed.

- [ ] **Step 1: Write API endpoint integration test**
  Create `backend/tests/test_main.py` using `fastapi.testclient.TestClient`. Mock scanner functions and test requests to `/api/settings`, `/api/scan`, `/api/decisions`, `/api/search`.
- [ ] **Step 2: Run test to verify it fails**
  Run: `pytest backend/tests/test_main.py -v`
  Expected: FAIL
- [ ] **Step 3: Implement backend/main.py**
  Create FastAPI app. Add CORS middleware. Initialize SQLite database and Qdrant collections on startup. Declare API endpoints for scanner, settings, commits feed, ADRs list, features tracker, bugs tracking, rules editor, and semantic context search.
- [ ] **Step 4: Run test to verify it passes**
  Run: `pytest backend/tests/test_main.py -v`
  Expected: PASSED
- [ ] **Step 5: Run all backend tests together to verify integrity**
  Run: `pytest backend/tests -v`
  Expected: ALL PASSED
- [ ] **Step 6: Commit changes**
  Run: `git add backend/main.py` and commit.

---

### Task 7: Frontend Setup & Tailwind Styling

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/index.css`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/utils/api.ts`

**Interfaces:**
- Consumes: Backend REST APIs
- Produces: Scaffolded React + TypeScript frontend client running via Vite, styled in light theme with skyblue accents.

- [ ] **Step 1: Set up React Vite project**
  Create `frontend/package.json` with React, TypeScript, Tailwind, Lucide React, and build configurations. Run `npm install`.
- [ ] **Step 2: Configure Tailwind with Skyblue theme**
  Set up Tailwind configuration in `frontend/tailwind.config.js` and input styles in `frontend/src/index.css`.
- [ ] **Step 3: Write API helper module**
  Implement axios/fetch wrappers in `frontend/src/utils/api.ts` mapping backend endpoints for settings, scan, decisions, commits, search, bugs, and features.
- [ ] **Step 4: Create basic App layout**
  Write App entrypoint and side navigation shell matching layout parameters: white background (`bg-white`) and skyblue side-nav details / active indicators.
- [ ] **Step 5: Run local dev server to preview scaffolding**
  Command: Run `npm run dev` in `frontend/` directory. Check `http://localhost:5173`.
- [ ] **Step 6: Commit changes**
  Run: `git add frontend/` and commit.

---

### Task 8: Frontend Dashboard Views (Home, Scanner, Git Commits, ADRs)

**Files:**
- Create: `frontend/src/components/DashboardHome.tsx`
- Create: `frontend/src/components/RepoAnalyzer.tsx`
- Create: `frontend/src/components/GitIntelligence.tsx`
- Create: `frontend/src/components/DecisionTracker.tsx`

**Interfaces:**
- Consumes: `frontend/src/utils/api.ts`
- Produces: Core visualization widgets for workspace metrics, repository directory trees, commit lists, and Architecture Decisions list.

- [ ] **Step 1: Implement DashboardHome component**
  Write statistics cards for scanned project path, lines of code, ADR counts, open bugs, and rules coverage. Styled with skyblue gradients and text.
- [ ] **Step 2: Implement RepoAnalyzer component**
  Build a folder structure browser showing directory nodes. Add files list and simple extension metrics.
- [ ] **Step 3: Implement GitIntelligence component**
  Create vertical commit feed with cards detailing hash, message, author, date, and AI intent summaries.
- [ ] **Step 4: Implement DecisionTracker component**
  Build ADR dashboard with grid cards of architectural decisions (Why PostgreSQL?, Reason, Status: Accepted, Author), plus an "Add ADR" form using skyblue buttons.
- [ ] **Step 5: Run preview check**
  Verify layouts render nicely in white theme with skyblue buttons.
- [ ] **Step 6: Commit changes**
  Run: `git add frontend/src/components/` and commit.

---

### Task 9: Frontend Views (Search, Feature Tracker, Bug Intelligence, Settings)

**Files:**
- Create: `frontend/src/components/SemanticSearch.tsx`
- Create: `frontend/src/components/FeatureTracker.tsx`
- Create: `frontend/src/components/BugIntelligence.tsx`
- Create: `frontend/src/components/PromptBuilder.tsx`
- Create: `frontend/src/components/Settings.tsx`

**Interfaces:**
- Consumes: `frontend/src/utils/api.ts`
- Produces: Actionable UI components for semantic query searching, prompt context creation, bug logging, and LLM setup settings.

- [ ] **Step 1: Implement Settings component**
  Create form to configure LLM provider (Ollama / Gemini / OpenAI), enter keys, and input directory path for indexing.
- [ ] **Step 2: Implement SemanticSearch & PromptBuilder component**
  Create interactive query interface. When a user asks "Why Postgres?", display relevant vector search hits, the assembled prompt context, and the AI answer with citations.
- [ ] **Step 3: Implement FeatureTracker component**
  Render list of project features (Auth, Payments, Analytics) with progress bars (0-100%) and simple task details.
- [ ] **Step 4: Implement BugIntelligence component**
  Render active bug items, status tags (Open / Fixed), severity labels, and form to report new bugs.
- [ ] **Step 5: Test overall dashboard view functionality**
  Verify all tabs function correctly.
- [ ] **Step 6: Commit changes**
  Run: `git add frontend/src/components/` and commit.

---

### Task 10: End-to-End Verification

**Files:**
- Create: `backend/tests/test_integration.py`
- Create: `docs/superpowers/walkthroughs/2026-07-02-smriti-walkthrough.md`

**Interfaces:**
- Consumes: Frontend and Backend processes running together
- Produces: Documented walk-through and successful integration verification results.

- [ ] **Step 1: Write integration test**
  Write `backend/tests/test_integration.py` executing a full loop: scanning a mock folder, adding an ADR decision, checking if decision is indexed in vector DB, and checking if semantic search retrieves it.
- [ ] **Step 2: Run all backend tests**
  Run: `pytest backend/ -v`
  Expected: ALL PASSED
- [ ] **Step 3: Run local application and manual validation**
  Launch backend (`uvicorn main:app --reload`) and frontend (`npm run dev`). Open browser. Scan a directory, view commits feed, write an ADR decision, search for it, and verify UI components use skyblue button accents on a white background.
- [ ] **Step 4: Save walkthrough document**
  Write walkthrough results, screenshots/recordings info, and API stats to `walkthrough.md`.
- [ ] **Step 5: Commit walkthrough**
  Run: `git add docs/` and commit.
