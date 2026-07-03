// --- Domain Entities ---

export interface RepositoryMetadata {
  id?: number;
  name: string;
  path: string;
  framework?: string;
  languages?: string;
  total_files: number;
  total_lines: number;
  last_scanned?: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  size?: number;
  lines?: number;
  children?: FileNode[];
}

export interface CommitMetadata {
  id?: string;
  hash: string;
  author: string;
  date: string;
  message: string;
  files_changed: string; // JSON string of array
  summary?: string;
  intent?: string;
}

export interface DecisionRecord {
  id?: number;
  title: string;
  status: 'Draft' | 'Proposed' | 'Accepted' | 'Rejected' | 'Deprecated';
  author: string;
  reason: string;
  alternatives: string;
  created_at?: string;
}

export interface FeatureItem {
  id?: number;
  name: string;
  description?: string;
  status: 'Backlog' | 'In Progress' | 'Completed';
  progress: number; // 0 to 100
  updated_at?: string;
}

export interface BugRecord {
  id?: number;
  title: string;
  description?: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Closed';
  related_files?: string;
  created_at?: string;
}

export interface TaskItem {
  id?: number;
  title: string;
  status: 'Todo' | 'Doing' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  due_date?: string;
}

export interface AppSettings {
  llm_provider: 'gemini' | 'ollama' | 'openai';
  gemini_api_key_set?: boolean;
  openai_api_key_set?: boolean;
  ollama_url: string;
  last_scanned_path?: string;
}

// --- Event Bus Payload Layouts ---

export interface FileEventPayload {
  path: string;
  oldPath?: string;
  size?: number;
}

export interface GitEventPayload {
  hash: string;
  author: string;
  message: string;
  date: string;
  files: string[];
}

export interface AiSessionPayload {
  sessionId: string;
  prompt: string;
  response: string;
}

export interface DecisionEventPayload {
  decisionId: number;
  title: string;
  status: 'Draft' | 'Proposed' | 'Accepted' | 'Rejected' | 'Deprecated';
}

export interface BugEventPayload {
  bugId: number;
  title: string;
  status: 'Open' | 'In Progress' | 'Closed';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface TaskEventPayload {
  taskId: number;
  title: string;
  status: 'Todo' | 'Doing' | 'Done';
}

export interface ErrorEventPayload {
  failedEventId: string;
  failedEventType: string;
  error: string;
}

// --- Global Event Registry ---

export interface EventMap {
  'file:created': FileEventPayload;
  'file:modified': FileEventPayload;
  'file:deleted': FileEventPayload;
  'file:renamed': FileEventPayload;
  'git:commit': GitEventPayload;
  'ai:session': AiSessionPayload;
  'memory:decision': DecisionEventPayload;
  'memory:bug': BugEventPayload;
  'memory:task': TaskEventPayload;
  'system:error': ErrorEventPayload;
}

export type SmritiEventType = keyof EventMap;

export interface BaseEvent<K extends SmritiEventType = SmritiEventType> {
  id: string;
  type: K;
  timestamp: string;
  payload: EventMap[K];
}

export * from './event-bus.js';
