import os
import sys
import tempfile
import pytest

# Add parent directory to sys.path to allow imports of backend files
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import init_db, get_connection

@pytest.fixture
def temp_db():
    """
    Creates a temporary SQLite file database for isolated testing.
    """
    fd, path = tempfile.mkstemp()
    os.close(fd)
    init_db(path)
    yield path
    try:
        os.unlink(path)
    except OSError:
        pass

def test_db_init_and_default_rules(temp_db):
    """
    Tests that tables are created and default memory rules are populated.
    """
    conn = get_connection(temp_db)
    cursor = conn.cursor()
    
    # Verify tables exist
    tables = ["settings", "repository_metadata", "commits", "decisions", "features", "bugs", "memory_rules"]
    for table in tables:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
        assert cursor.fetchone() is not None, f"Table {table} was not created!"

    # Verify default memory rules are populated
    cursor.execute("SELECT count(*) as count FROM memory_rules")
    row = cursor.fetchone()
    assert row["count"] == 5, "Default rules were not populated correctly."
    conn.close()

def test_settings_read_write(temp_db):
    """
    Tests inserting and reading configurations from the settings table.
    """
    conn = get_connection(temp_db)
    cursor = conn.cursor()

    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ("llm_provider", "ollama"))
    conn.commit()

    cursor.execute("SELECT value FROM settings WHERE key = ?", ("llm_provider",))
    row = cursor.fetchone()
    assert row["value"] == "ollama", "LLM provider setting was not saved correctly."
    conn.close()

def test_adr_decisions(temp_db):
    """
    Tests ADR insertions and listings.
    """
    conn = get_connection(temp_db)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO decisions (title, status, author, reason, alternatives)
        VALUES (?, ?, ?, ?, ?)
    """, ("Why PostgreSQL?", "Accepted", "Sreeshanth", "Need JSONB support", "MongoDB"))
    conn.commit()

    cursor.execute("SELECT * FROM decisions")
    row = cursor.fetchone()
    assert row["title"] == "Why PostgreSQL?"
    assert row["status"] == "Accepted"
    assert row["author"] == "Sreeshanth"
    conn.close()
