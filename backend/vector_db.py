import os
import uuid
import math
import hashlib

# Lazy imports for Qdrant and SentenceTransformers to allow fallback behavior
QDRANT_AVAILABLE = False
SENTENCE_TRANSFORMERS_AVAILABLE = False

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct
    QDRANT_AVAILABLE = True
except ImportError:
    print("Warning: qdrant_client is not installed. Vector search will run in mock/in-memory dictionary mode.")

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    print("Warning: sentence-transformers is not installed. Using pure-python Hashing Trick TF-IDF embedding fallback.")

COLLECTION_NAME = "smriti_chunks"
VECTOR_SIZE = 384

# Global client and model variables
qdrant_client = None
embedding_model = None

# Mock in-memory vector store fallback if Qdrant is missing
mock_vector_store = []

def get_hashing_embedding(text):
    """
    Fallback embedding generator using the Hashing Trick (Feature Hashing).
    Creates a deterministic, normalized 384-dimensional vector representing word frequencies.
    """
    vector = [0.0] * VECTOR_SIZE
    words = text.lower().split()
    if not words:
        return vector
        
    for word in words:
        # Use hashlib md5 for cross-platform deterministic hashing
        h = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16)
        index = h % VECTOR_SIZE
        # Set weights using sign hash to prevent bias
        sign = 1 if (h // VECTOR_SIZE) % 2 == 0 else -1
        vector[index] += sign * 1.0
        
    # L2 normalization
    sq_sum = sum(x * x for x in vector)
    if sq_sum > 0:
        norm = math.sqrt(sq_sum)
        vector = [x / norm for x in vector]
        
    return vector

def get_embedding(text):
    """
    Generates embedding vector. Uses SentenceTransformers if available,
    falling back to deterministic hashing embedding.
    """
    global embedding_model
    if SENTENCE_TRANSFORMERS_AVAILABLE:
        try:
            if embedding_model is None:
                # Load small all-MiniLM-L6-v2 model (~80MB)
                embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
            vector = embedding_model.encode(text).tolist()
            return vector
        except Exception as e:
            print(f"Embedding model error, falling back: {e}")
            
    return get_hashing_embedding(text)

def initialize_vector_db(db_dir=None):
    """
    Initializes Qdrant local client and collection.
    """
    global qdrant_client
    if not QDRANT_AVAILABLE:
        print("Qdrant not available. Running vector search in mock mode.")
        return False

    if db_dir is None:
        db_dir = os.path.join(os.path.dirname(__file__), "smriti_qdrant.db")

    try:
        qdrant_client = QdrantClient(path=db_dir)
        
        # Check if collection exists
        collections = qdrant_client.get_collections().collections
        exists = any(c.name == COLLECTION_NAME for c in collections)
        
        if not exists:
            qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
            )
        return True
    except Exception as e:
        print(f"Failed to initialize Qdrant client: {e}. Bypassing in mock mode.")
        qdrant_client = None
        return False

def index_chunk(chunk_id, doc_type, content, file_path=None, metadata=None):
    """
    Indexes a chunk of text (file_chunk, decision, commit, or rule) in Qdrant or Mock store.
    """
    global qdrant_client, mock_vector_store
    vector = get_embedding(content)
    
    payload = {
        "chunk_id": str(chunk_id),
        "type": doc_type,
        "content": content,
        "file_path": file_path or "",
        "metadata": metadata or {}
    }
    
    if QDRANT_AVAILABLE and qdrant_client is not None:
        try:
            qdrant_client.upsert(
                collection_name=COLLECTION_NAME,
                points=[
                    PointStruct(
                        id=str(uuid.UUID(int=uuid.UUID(str(chunk_id)).int)), # ensure uuid format
                        vector=vector,
                        payload=payload
                    )
                ]
            )
            return True
        except Exception as e:
            print(f"Qdrant index failed: {e}. Indexing to mock store.")
            
    # Mock fallback
    mock_vector_store.append({
        "id": chunk_id,
        "vector": vector,
        "payload": payload
    })
    return True

def cosine_similarity(v1, v2):
    dot = sum(a * b for a, b in zip(v1, v2))
    sum1 = sum(a * a for a in v1)
    sum2 = sum(b * b for b in v2)
    if sum1 == 0 or sum2 == 0:
        return 0.0
    return dot / (math.sqrt(sum1) * math.sqrt(sum2))

def search_chunks(query, limit=5):
    """
    Queries vector database (or mock database) and returns matching chunks with scores.
    """
    global qdrant_client, mock_vector_store
    query_vector = get_embedding(query)
    
    results = []
    
    if QDRANT_AVAILABLE and qdrant_client is not None:
        try:
            search_res = qdrant_client.search(
                collection_name=COLLECTION_NAME,
                query_vector=query_vector,
                limit=limit
            )
            for res in search_res:
                payload = res.payload
                results.append({
                    "type": payload.get("type", "file_chunk"),
                    "file_path": payload.get("file_path"),
                    "content": payload.get("content", ""),
                    "score": res.score,
                    "metadata": payload.get("metadata", {})
                })
            return results
        except Exception as e:
            print(f"Qdrant search failed: {e}. Searching mock store.")

    # Mock DB search
    scored_items = []
    for item in mock_vector_store:
        score = cosine_similarity(query_vector, item["vector"])
        scored_items.append((score, item["payload"]))
        
    # Sort by score descending
    scored_items.sort(key=lambda x: x[0], reverse=True)
    
    for score, payload in scored_items[:limit]:
        results.append({
            "type": payload.get("type", "file_chunk"),
            "file_path": payload.get("file_path"),
            "content": payload.get("content", ""),
            "score": score,
            "metadata": payload.get("metadata", {})
        })
        
    return results

def reset_vector_db():
    """
    Clears all vectors in the collection or mock database.
    """
    global qdrant_client, mock_vector_store
    mock_vector_store = []
    if QDRANT_AVAILABLE and qdrant_client is not None:
        try:
            qdrant_client.delete_collection(COLLECTION_NAME)
            qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
            )
        except Exception:
            pass
