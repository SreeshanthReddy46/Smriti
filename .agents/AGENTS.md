# Smriti AI: Instructions for AI Coding Agents

Welcome, Agent! You are working inside a repository monitored and managed by **Smriti AI**, a persistent memory daemon. 

Before proposing any changes, writing code, or suggesting new architectures, follow these rules to ensure context preservation and alignment with the project's historical decisions.

---

## 🧠 1. Load Repository Memory on Session Start

Smriti runs a local daemon (Port 8000) and writes relational data to SQLite. You must load this context before starting task implementation:

1.  **Check Scanned Metadata & Rules**:
    *   Read the SQLite database file: [smriti.db](file:///c:/Users/hp/Smriti/backend/smriti.db)
    *   Inspect the `memory_rules` table to check coding guidelines, naming rules, business logic constraints, and design requirements.
2.  **Inspect Architecture Decision Records (ADRs)**:
    *   Check the `decisions` table in `smriti.db` (or query `GET http://localhost:8000/api/decisions`).
    *   Always verify if a decision has already been accepted (e.g., PostgreSQL selection, SQLite local setup) before proposing alternative frameworks.
3.  **Analyze Git Commits & Open Issues**:
    *   Query the `commits` table to see recent file modifications and developer intent.
    *   Query the `bugs` table to check if there are unresolved bug records related to the files you are modifying.

---

## 🛠️ 2. Coding Standards & Conventions

All agents working in this repository must adhere to the following:
*   **File Isolation & Responsibilities**: Design units with clear boundaries and well-defined interfaces. Keep modules small and focused.
*   **Languages**:
    *   *Backend:* Python 3.9+. Use snake_case for modules, functions, and variables.
    *   *Frontend:* React, TypeScript, Tailwind CSS. Use camelCase for variables, PascalCase for components.
*   **Testing Requirement**:
    *   Any new backend feature must include corresponding `pytest` modules inside the `backend/tests/` folder.
    *   Always run the test suite `pytest backend/` before committing code to ensure no regressions.

---

## 📝 3. Document Your Decisions (ADRs)

If your task requires making significant architectural choices:
1.  Discuss and agree on the approach with the user.
2.  Log a new record in the `decisions` table in SQLite or call `POST /api/decisions` to insert the ADR. Detail the title, status ("Accepted"), author, reason, and alternatives considered.
3.  Ensure your code changes map to the registered decision.

---

## 🐛 4. Track Bug Fixes & Sprint Progress
*   When resolving issues logged in the `bugs` table, update their status to `'Closed'` in SQLite (or call `POST /api/bugs/{id}`).
*   When completing sprint tasks, update the corresponding progress percentage in the `features` table.
