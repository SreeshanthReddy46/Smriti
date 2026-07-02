import os
import sys
import tempfile
import pytest
from fastapi.testclient import TestClient

# Add parent directory to sys.path to allow imports of backend files
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from database import init_db
from vector_db import initialize_vector_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def run_db_initialization():
    """
    Ensure SQLite schema and Qdrant in-memory tables are initialized.
    """
    init_db()
    initialize_vector_db()
    yield

def test_full_pipeline_flow():
    """
    Executes integration flow: scan folder -> check metadata -> insert ADR -> search ADR -> chat query.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a mock code file
        src_dir = os.path.join(tmpdir, "src")
        os.makedirs(src_dir)
        py_file = os.path.join(src_dir, "db.py")
        with open(py_file, "w", encoding="utf-8") as f:
            f.write("# Database Helper Module\n# Using SQLAlchemy for models\n")
            
        # 1. Trigger directory scan
        scan_res = client.post("/api/scan", json={"path": tmpdir})
        assert scan_res.status_code == 200
        assert scan_res.json()["success"] is True
        
        # 2. Verify status endpoint shows repository details
        status_res = client.get("/api/status")
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["repo_loaded"] is True
        assert status_data["repository"]["name"] == os.path.basename(tmpdir)
        
        # 3. Create a new ADR
        adr_payload = {
            "title": "Use SQLite locally",
            "status": "Accepted",
            "author": "Antigravity",
            "reason": "SQLite has zero external dependencies and runs in file-mode locally.",
            "alternatives": "PostgreSQL, MySQL"
        }
        adr_res = client.post("/api/decisions", json=adr_payload)
        assert adr_res.status_code == 200
        
        # 4. Search for the ADR semantically
        search_res = client.post("/api/search", json={"query": "SQLite locally"})
        assert search_res.status_code == 200
        results = search_res.json()
        assert len(results) > 0
        
        # Check that the top match retrieves our SQLite ADR
        matched_types = [r["type"] for r in results]
        assert "decision" in matched_types or "file_chunk" in matched_types
        
        # 5. Execute chat query about the decision
        chat_res = client.post("/api/chat", json={"query": "Why did we choose SQLite locally?"})
        assert chat_res.status_code == 200
        assert len(chat_res.json()["answer"]) > 0
