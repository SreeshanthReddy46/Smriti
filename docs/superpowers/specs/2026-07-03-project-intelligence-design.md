# Smriti Project Intelligence Engine (v1.0 AI Architecture) Design Spec

This document details the architectural specifications for the **Smriti Project Intelligence Engine** (v1.0). It transitions Smriti from a standard semantic RAG system into a multi-layered offline-first context reasoning engine.

---

## 🏗️ 1. High-Level Vision & Cooperating Memory Layers

Instead of relying on simple similarity matching over generic file chunks, Smriti coordinates context building through **six cooperating intelligence layers**:

```
 ┌────────────────────────────────────────────────────────┐
 │                   WORKING MEMORY                       │
 │  (Current session, active branch, active task, diffs)  │
 └───────────┬────────────────────────────────┬───────────┘
             │                                │
 ┌───────────▼───────────┐        ┌───────────▼───────────┐
 │    SEMANTIC MEMORY    │        │   STRUCTURED MEMORY   │
 │ (Embeddings, vectors) │        │ (SQLite: tasks, bugs) │
 └───────────┬───────────┘        └───────────┬───────────┘
             │                                │
 ┌───────────▼───────────┐        ┌───────────▼───────────┐
 │   RELATIONAL MEMORY   │        │    TEMPORAL MEMORY    │
 │ (AST Knowledge Graph) │        │  (Git logs/timelines) │
 └───────────┬───────────┘        └───────────┬───────────┘
             │                                │
 ┌───────────▼────────────────────────────────▼───────────┐
 │                  PROCEDURAL MEMORY                     │
 │  (Coding guidelines, ADR decisions, design rules)     │
 └────────────────────────────────────────────────────────┘
```

1. **Semantic Memory**: Dense vector embeddings of READMEs, doc files, and code chunks.
2. **Structured Memory**: Relational SQLite storage capturing tasks, open bugs, metadata, and configuration settings.
3. **Relational Memory**: AST Knowledge Graph linking symbols, classes, files, dependencies, and feature scopes.
4. **Temporal Memory**: Git commit records, branch metadata, author histories, and development timelines.
5. **Procedural Memory**: Active coding rules, architecture guidelines, naming conventions, and ADR decisions.
6. **Working Memory**: Active session context, currently modified files (git diff), and current developer focus.

---

## 📂 2. AI Package Structure (`packages/ai`)

All intelligence modules are isolated within the new `packages/ai` folder structure:

```
packages/ai/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # Main exports
│   ├── intent/                  # Intent Engine (Step 1)
│   │   ├── types.ts
│   │   ├── rule-classifier.ts
│   │   ├── llm-classifier.ts
│   │   └── hybrid-classifier.ts
│   ├── parser/                  # Tree-sitter AST parser (Step 9)
│   │   └── ast-chunker.ts
│   ├── embeddings/              # Embedding Engine (Step 3 & 7)
│   │   └── vector-client.ts
│   ├── retrieval/               # Parallel Retrieval Layer (Step 10)
│   │   └── parallel-retriever.ts
│   ├── reranker/                # Context Re-Ranking Engine (Step 11)
│   │   └── context-reranker.ts
│   ├── prompt/                  # Context & Prompt Builders (Step 12)
│   │   ├── context-builder.ts
│   │   └── prompt-builder.ts
│   └── memory/                  # Memory Manager & Reflection (Step 13)
│       ├── memory-manager.ts
│       └── reflection.ts
└── tests/                       # Testing Suite
```

---

## ⚡ 3. The 9-Step AI Context Pipeline

When a developer submits a query, Smriti executes the pipeline in sequence:

```
[User Question]
       │
       ▼
 1. Intent Detection       ──► Classifies request query (e.g. CODE_SEARCH, GIT_HISTORY)
       │
       ▼
 2. Entity Extraction      ──► Extracts target symbols, files, authors, and features
       │
       ▼
 3. Search Planning        ──► Formulates search tasks based on detected intent
       │
       ▼
 4. Parallel Retrieval     ──► Queries SQLite, Vector DB, Git log, and AST concurrently
       │
       ▼
 5. Re-ranking             ──► Re-scores candidates using recency, git history, and task bounds
       │
       ▼
 6. Context Compression    ──► prunes low-score snippets to fit LLM token boundaries
       │
       ▼
 7. Prompt Building        ──► Packs context, rules, and active task info in prompt template
       │
       ▼
 8. LLM Inference          ──► Invokes local Ollama or cloud API provider
       │
       ▼
 9. Reflection & Memory    ──► Evaluates if query outcome should update long-term rules/tasks
```

---

## 🧠 4. Core Component Specs

### 4.1 Step 1 — Intent Engine
The Intent Engine routes requests based on a hybrid strategy:
1. **Rule Classifier**: Compares input to regex patterns:
   - `CODE_SEARCH`: Queries checking symbol definitions (`/where is/i`, `/how to implement/i`, `/*.tsx?/`)
   - `GIT_HISTORY`: Queries tracking changes (`/who modified/i`, `/what happened/i`, `/commit/i`)
   - `DECISION_LOOKUP`: Queries evaluating decisions (`/why/i`, `/why was/i`, `/decision/i`)
   - `CURRENT_TASK`: Queries requesting status (`/what should i do/i`, `/todo/i`, `/active task/i`)
   - `PROJECT_SUMMARY`: Queries request status (`/summarize/i`, `/overview/i`)
2. **LLM Classifier Fallback**: If rules yield low confidence, a prompt requests the LLM to return JSON containing the intent classification.

### 4.2 Step 2 & 3 — Semantic AST Chunker (Tree-sitter)
Instead of standard character-based sliding windows, Smriti uses **Tree-sitter** code parsing to extract logical units:
- Class Declarations (including class signatures and docstrings)
- Component Declarations (e.g., React components, props, hooks)
- Method/Function Blocks
- Import/Export headers

Each AST node is mapped to metadata details:
```json
{
  "project": "Smriti",
  "file": "packages/shared/src/event-bus.ts",
  "module": "shared",
  "language": "typescript",
  "type": "class_definition",
  "symbol": "SmritiEventBus",
  "feature": "event-bus",
  "author": "Antigravity",
  "updated": "2026-07-03"
}
```

### 4.3 Step 4 — Parallel Retrieval
The `ParallelRetriever` queries all database sources concurrently using `Promise.all`:
1. **Semantic Store (LanceDB / Qdrant)**: queries code embeddings.
2. **Structured Store (SQLite)**: queries active bugs, tasks, and feature scopes.
3. **Temporal Store (Git)**: queries recent commit histories and affected files.
4. **Relational Store (AST Graph)**: queries symbol dependencies.

### 4.4 Step 5 — Re-ranking Engine
The Reranker scores candidates using a hybrid score formula:
$$\text{Score} = w_s \cdot S_{\text{semantic}} + w_r \cdot S_{\text{recency}} + w_g \cdot S_{\text{git\_frequency}} + w_w \cdot S_{\text{working\_task\_context}}$$
Where:
- $S_{\text{semantic}}$: Cosine similarity of embedding chunk.
- $S_{\text{recency}}$: Time decay of last file commit.
- $S_{\text{git\_frequency}}$: Commits volume matching the file (hot spot ranking).
- $S_{\text{working\_task\_context}}$: Boost factor if the file is currently modified or named in the active task.

### 4.5 Step 6 & 7 — Context & Prompt Builders
The Context Builder groups results logically in a Markdown payload:
```markdown
# Context for Developer Query: [Query]

## 📋 Active Working Session
- Branch: main
- Active Task: [Current task]
- Staged Changes: [Git diff summary]

## 🛡️ Active Coding Rules & Guidelines
[Rules content from Procedural Memory]

## 🛠️ Relevant ADR Decisions
[Matching decisions list]

## 📝 Relevant Code Snippets
[AST-parsed code blocks with metadata headers]

## 🕒 Recent Activity & Commits
[Commit timelines]
```

---

## 🧪 5. Testing & Validation

We will configure the `packages/ai` testing suite to assert:
1. **Intent Matching**: Ensure "Where is JWT?" routes to `CODE_SEARCH` and "Why Redis?" routes to `DECISION_LOOKUP`.
2. **Tree-sitter AST Extraction**: Verify that functions and components are sliced correctly with their signatures intact.
3. **Parallel Execution**: Confirm that DB, Vector DB, and Git query steps run concurrently.
4. **Re-ranking Logic**: Assert that files currently modified in the workspace get boosted in retrieval results.
