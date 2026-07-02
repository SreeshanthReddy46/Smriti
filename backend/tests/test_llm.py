import os
import sys
import pytest

# Add parent directory to sys.path to allow imports of backend files
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from llm import estimate_tokens, generate_mock_response, generate_prompt_context

def test_token_estimation():
    """
    Verifies that estimate_tokens handles strings correctly.
    """
    assert estimate_tokens("") == 0
    
    text = "This is a simple sentence to test the token size estimator."
    tokens = estimate_tokens(text)
    assert tokens > 0
    # Estimation should reflect roughly len(text)/4 or word count
    assert tokens == int(max(len(text)/4.0, len(text.split())*1.3))

def test_mock_response_postgres():
    """
    Tests that the mock LLM responder returns correct content when asked about postgres.
    """
    query = "Why did we choose PostgreSQL?"
    response = generate_mock_response(query, "mock context PostgreSQL")
    
    assert "PostgreSQL" in response
    assert "Sreeshanth" in response
    assert "JSONB" in response
    assert "MongoDB" in response

def test_mock_response_auth():
    """
    Tests that the mock LLM responder returns correct content when asked about auth/jwt.
    """
    query = "Where is JWT implemented?"
    response = generate_mock_response(query, "mock context jwt auth")
    
    assert "Authentication" in response
    assert "JWT" in response
    assert "expiry" in response
