from pydantic import BaseModel, Field
from typing import List, Optional

class SettingsUpdate(BaseModel):
    llm_provider: Optional[str] = "gemini"  # "gemini", "openai", "ollama"
    gemini_api_key: Optional[str] = ""
    openai_api_key: Optional[str] = ""
    ollama_url: Optional[str] = "http://localhost:11434"
    last_scanned_path: Optional[str] = ""

class SettingsResponse(BaseModel):
    llm_provider: str
    gemini_api_key_set: bool
    openai_api_key_set: bool
    ollama_url: str
    last_scanned_path: str

class ScanRequest(BaseModel):
    path: str

class ScanResponse(BaseModel):
    success: bool
    path: str
    name: str
    framework: str
    languages: List[str]
    total_files: int
    total_lines: int
    message: str

class ADRDecisionCreate(BaseModel):
    title: str
    status: str  # "Accepted", "Rejected", "Proposed"
    author: str
    reason: str
    alternatives: str

class ADRDecision(BaseModel):
    id: int
    title: str
    status: str
    author: str
    reason: str
    alternatives: str
    created_at: str

class FeatureCreate(BaseModel):
    name: str
    progress: int = 0
    status: str = "Not Started"
    description: str = ""

class FeatureUpdate(BaseModel):
    progress: int
    status: str
    description: str

class Feature(BaseModel):
    id: int
    name: str
    progress: int
    status: str
    description: str

class BugCreate(BaseModel):
    title: str
    severity: str  # "Low", "Medium", "High"
    related_files: str  # Comma separated
    description: str

class BugUpdate(BaseModel):
    status: str
    severity: str
    related_files: str
    description: str

class Bug(BaseModel):
    id: int
    title: str
    status: str
    severity: str
    related_files: str
    description: str
    created_at: str

class MemoryRuleUpdate(BaseModel):
    content: str

class MemoryRule(BaseModel):
    key: str
    content: str
    updated_at: str

class SearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 5

class SearchResult(BaseModel):
    type: str  # "file_chunk", "decision", "commit", "rule"
    file_path: Optional[str] = None
    content: str
    score: float
    metadata: Optional[dict] = None

class ChatRequest(BaseModel):
    query: str
    llm_provider: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    context_used: List[SearchResult]
