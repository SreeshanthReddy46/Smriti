import os
import sys
import tempfile
import pytest

# Add parent directory to sys.path to allow imports of backend files
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from vector_db import initialize_vector_db, index_chunk, search_chunks, get_embedding, COLLECTION_NAME

@pytest.fixture
def temp_qdrant_db():
    """
    Initializes vector db with a temporary SQLite Qdrant file path.
    """
    fd, path = tempfile.mkstemp()
    os.close(fd)
    try:
        os.unlink(path) # remove the file so Qdrant can initialize its db directory/file
    except OSError:
        pass
        
    initialize_vector_db(path)
    yield path
    
    # cleanup
    if os.path.exists(path):
        try:
            import shutil
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.unlink(path)
        except OSError:
            pass

def test_embedding_generation():
    """
    Tests that the embedding generator returns a vector of size 384 and is normalized.
    """
    vector = get_embedding("Hello World")
    assert len(vector) == 384
    
    # Verify vector L2 normalization (sum of squares is close to 1.0)
    sq_sum = sum(x * x for x in vector)
    assert abs(sq_sum - 1.0) < 0.01

def test_index_and_search(temp_qdrant_db):
    """
    Tests indexing a document chunk and searching for it.
    """
    chunk_id = "12345678-1234-5678-1234-567812345678"
    content = "PostgreSQL is selected because we need robust JSONB query support."
    
    indexed = index_chunk(
        chunk_id=chunk_id,
        doc_type="decision",
        content=content,
        file_path="docs/adr-01.md",
        metadata={"author": "Sreeshanth"}
    )
    assert indexed is True

    # Search for matching terms
    results = search_chunks("PostgreSQL database jsonb", limit=1)
    
    assert len(results) > 0
    match = results[0]
    assert match["type"] == "decision"
    assert "PostgreSQL" in match["content"]
    assert match["file_path"] == "docs/adr-01.md"
    assert match["metadata"]["author"] == "Sreeshanth"
    assert match["score"] > 0.0 # Score must be positive similarity
