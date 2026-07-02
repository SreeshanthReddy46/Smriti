import os
import sqlite3
from datetime import datetime

DATABASE_NAME = os.path.join(os.path.dirname(__file__), "smriti.db")

def get_connection(db_path=DATABASE_NAME):
    """
    Establishes and returns a database connection.
    Enables row factory for dictionary-like results.
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path=DATABASE_NAME):
    """
    Initializes the SQLite database tables if they do not exist.
    """
    conn = get_connection(db_path)
    cursor = conn.cursor()

    # 1. Settings Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    # 2. Repository Metadata Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS repository_metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT UNIQUE,
            name TEXT,
            framework TEXT,
            languages TEXT,
            total_files INTEGER,
            total_lines INTEGER,
            last_scanned TEXT
        )
    """)

    # 3. Commits Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS commits (
            sha TEXT PRIMARY KEY,
            message TEXT,
            author TEXT,
            date TEXT,
            files_changed TEXT,
            summary TEXT,
            intent TEXT,
            affected_features TEXT,
            remaining_work TEXT
        )
    """)

    # 4. Decisions Table (ADRs)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            status TEXT,
            author TEXT,
            reason TEXT,
            alternatives TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 5. Features Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS features (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            progress INTEGER DEFAULT 0,
            status TEXT,
            description TEXT
        )
    """)

    # 6. Bugs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bugs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            status TEXT DEFAULT 'Open',
            severity TEXT,
            related_files TEXT,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 7. Memory Rules Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS memory_rules (
            key TEXT PRIMARY KEY,
            content TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Populate default rules if they do not exist
    default_rules = {
        "project_goal": "Define the primary objective and high-level goal of this project.",
        "business_logic": "Document major business flows, constraints, and rules.",
        "coding_standards": "Outline style guides, testing conventions, and structure guidelines.",
        "naming_rules": "Define conventions for naming directories, files, variables, and services.",
        "design_system": "Specify the UI styling principles, components list, and theme constraints."
    }

    for key, content in default_rules.items():
        cursor.execute("""
            INSERT OR IGNORE INTO memory_rules (key, content)
            VALUES (?, ?)
        """, (key, content))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
