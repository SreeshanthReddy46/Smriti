import os
import sys
import json
import pytest
from fastapi.testclient import TestClient

# Add parent directory to sys.path to allow imports of backend files
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from database import init_db

@pytest.fixture(autouse=True)
def run_db_initialization():
    """
    Ensure SQLite schema is initialized in the local testing workspace.
    """
    init_db()
    yield

client = TestClient(app)

def test_settings_endpoints():
    """
    Tests settings retrieval and update API.
    """
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert "llm_provider" in data
    assert "gemini_api_key_set" in data

    # Update settings
    payload = {
        "llm_provider": "ollama",
        "gemini_api_key": "test_key",
        "ollama_url": "http://localhost:11434",
        "last_scanned_path": "/workspace"
    }
    update_res = client.post("/api/settings", json=payload)
    assert update_res.status_code == 200
    assert update_res.json()["message"] == "Settings updated successfully"

    # Confirm update saved
    get_res = client.get("/api/settings")
    assert get_res.json()["llm_provider"] == "ollama"
    assert get_res.json()["gemini_api_key_set"] is True

def test_status_endpoint():
    """
    Tests server status metadata API.
    """
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "repo_loaded" in data
    assert "total_decisions" in data

def test_decisions_endpoints():
    """
    Tests creating and listing architectural decisions.
    """
    payload = {
        "title": "Choosing React over Angular",
        "status": "Accepted",
        "author": "Sreeshanth",
        "reason": "Virtual DOM performance and fast iteration speeds.",
        "alternatives": "Angular, Vue"
    }
    create_res = client.post("/api/decisions", json=payload)
    assert create_res.status_code == 200
    created_adr = create_res.json()
    assert created_adr["title"] == "Choosing React over Angular"
    assert created_adr["status"] == "Accepted"
    assert "id" in created_adr

    # List decisions
    list_res = client.get("/api/decisions")
    assert list_res.status_code == 200
    decisions = list_res.json()
    assert len(decisions) > 0
    assert decisions[0]["title"] == "Choosing React over Angular"

def test_search_and_chat_endpoints():
    """
    Tests semantic retrieval query and context building routes.
    """
    # 1. Prompt context builder
    context_res = client.post("/api/prompt-context", json={"query": "React selection"})
    assert context_res.status_code == 200
    context_data = context_res.json()
    assert "context_text" in context_data
    assert "citations" in context_data
    assert "estimated_tokens" in context_data

    # 2. Contextual LLM chat
    chat_res = client.post("/api/chat", json={"query": "Why React?"})
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert "answer" in chat_data
    assert "context_used" in chat_data
