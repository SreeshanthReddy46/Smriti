const API_BASE = "http://localhost:8000/api";

async function request(path: string, options: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Settings
  getSettings: () => request("/settings"),
  saveSettings: (settings: {
    llm_provider: string;
    gemini_api_key?: string;
    openai_api_key?: string;
    ollama_url: string;
  }) => request("/settings", {
    method: "POST",
    body: JSON.stringify(settings)
  }),

  // Scanner
  scanProject: (path: string) => request("/scan", {
    method: "POST",
    body: JSON.stringify({ path })
  }),
  getStatus: () => request("/status"),

  // Repository Tree
  getRepository: () => request("/repository"),

  // Git Commits
  getCommits: () => request("/commits"),

  // Architecture Decisions (ADRs)
  getDecisions: () => request("/decisions"),
  createDecision: (decision: {
    title: string;
    status: string;
    author: string;
    reason: string;
    alternatives: string;
  }) => request("/decisions", {
    method: "POST",
    body: JSON.stringify(decision)
  }),

  // Features Tracker
  getFeatures: () => request("/features"),
  addFeature: (feature: {
    name: string;
    progress: number;
    status: string;
    description: string;
  }) => request("/features", {
    method: "POST",
    body: JSON.stringify(feature)
  }),
  updateFeature: (id: number, data: {
    progress: number;
    status: string;
    description: string;
  }) => request(`/features/${id}`, {
    method: "POST",
    body: JSON.stringify(data)
  }),

  // Bug Tracker
  getBugs: () => request("/bugs"),
  createBug: (bug: {
    title: string;
    severity: string;
    related_files: string;
    description: string;
  }) => request("/bugs", {
    method: "POST",
    body: JSON.stringify(bug)
  }),
  updateBug: (id: number, data: {
    status: string;
    severity: string;
    related_files: string;
    description: string;
  }) => request(`/bugs/${id}`, {
    method: "POST",
    body: JSON.stringify(data)
  }),

  // Memory Rules
  getRules: () => request("/rules"),
  updateRule: (key: string, content: string) => request(`/rules/${key}`, {
    method: "POST",
    body: JSON.stringify({ content })
  }),

  // Search & Retrieval
  searchMemory: (query: string, limit = 5) => request("/search", {
    method: "POST",
    body: JSON.stringify({ query, limit })
  }),
  getPromptContext: (query: string, limit = 5) => request("/prompt-context", {
    method: "POST",
    body: JSON.stringify({ query, limit })
  }),
  chat: (query: string) => request("/chat", {
    method: "POST",
    body: JSON.stringify({ query })
  })
};
