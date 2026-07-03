# Smriti Resilient, Type-Safe, and Secure Event Bus Design Spec

This document details the architectural specification for the Smriti Event Bus system. It coordinates file modifications, Git commits, and AI interaction triggers across the local Smriti daemon ecosystem.

---

## 🎯 1. Design Goals

1. **Strong Type-Safety**: Ensure full TypeScript compiler support. No generic `any` values. Mapped event names to exact payload interfaces.
2. **Security & Privacy Guards**: Intercept events before execution to purge credential leaks (API keys, secrets) and mask absolute folder paths.
3. **Execution Resiliency**: Run async subscribers concurrently, preventing a hang or crash in one subscriber from freezing the daemon or affecting other subscribers.
4. **Immutability Protection**: Prevent memory contamination by enforcing frozen objects at the boundary of event publication.
5. **Traceability**: Output diagnostic errors on `system:error` topic when events reject or time out.

---

## 🛠️ 2. Type Mappings & Event Schema

All events pass through a mapped type schema defined in `packages/shared/src/index.ts`.

### 2.1 Mapped Event Schemas

```typescript
export interface FileEventPayload {
  path: string;
  oldPath?: string; // used specifically for rename actions
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

// Global Strong Map
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
```

### 2.2 Structural Payload Envelope

```typescript
export type SmritiEventType = keyof EventMap;

export interface BaseEvent<K extends SmritiEventType = SmritiEventType> {
  id: string;        // UUIDv4 format identifier
  type: K;
  timestamp: string; // ISO-8601 formatting timestamp
  payload: EventMap[K];
}
```

---

## 🔒 3. Security Middleware & Sanitization

The Event Bus executes an interceptor pipeline prior to routing payloads to subscribers. 

### 3.1 Credential & Secret Sweeping
The Event Bus runs a recursive string scanner checking values for known secret regex matches:
- **Google/Gemini Keys**: `/AIzaSy[A-Za-z0-9_-]{35}/`
- **OpenAI API Keys**: `/sk-[a-zA-Z0-9]{48,}/`
- **Ollama URL / Basic Headers**: General authorization tokens or header fields containing passwords.

Any matches are sanitized to `[MASKED_SECRET]`.

### 3.2 Workplace Path Masking
When "Secure Mode" is activated, the bus replaces absolute user directory paths with a workspace token:
- Ex: `C:\Users\hp\Smriti\packages\shared\src\index.ts` -> `<WORKSPACE>/packages/shared/src/index.ts`.
- Home directories outside the workspace are masked to `<HOME_DIR>`.

---

## ⚡ 4. Event Bus Class Interface

The `SmritiEventBus` class replaces the generic standard `EventEmitter` with a strongly typed system:

```typescript
export type EventListener<K extends SmritiEventType> = (event: BaseEvent<K>) => void | Promise<void>;

export class SmritiEventBus {
  private static instance: SmritiEventBus;
  
  // Maps event names to their subscriber sets
  private subscribers: Map<SmritiEventType, Set<EventListener<any>>>;
  private wildcardSubscribers: Set<(event: BaseEvent) => void | Promise<void>>;
  
  private timeoutMs = 5000; // Strict subscriber execution timeout
  private workspacePath: string = '';
  private secureMode = false;

  private constructor() {
    this.subscribers = new Map();
    this.wildcardSubscribers = new Set();
  }

  public static getInstance(): SmritiEventBus;

  public setConfig(options: { workspacePath?: string; secureMode?: boolean }): void;

  /**
   * Subscribe to a specific event type. Returns an unsubscribe handler.
   */
  public subscribe<K extends SmritiEventType>(
    type: K,
    listener: EventListener<K>
  ): () => void;

  /**
   * Subscribe to all events passing through the bus.
   */
  public subscribeAll(
    listener: (event: BaseEvent) => void | Promise<void>
  ): () => void;

  /**
   * Publish an event. Intercepts, deep-freezes, and dispatches to subscribers concurrently.
   */
  public async publish<K extends SmritiEventType>(
    type: K,
    payload: EventMap[K]
  ): Promise<void>;
  
  // Internals for sanitization and deep freezing
  private sanitizePayload<T>(payload: T): T;
  private deepFreeze<T>(obj: T): T;
}
```

---

## 🛡️ 5. Resiliency Rules & Runtime Protections

### 5.1 Isolated Execution Boundaries
Each listener is evaluated independently inside a wrapper context:
```typescript
try {
  await Promise.race([
    listener(frozenEvent),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Subscriber execution timed out')), this.timeoutMs))
  ]);
} catch (err) {
  this.handleListenerError(event, err);
}
```
If a subscriber fails or times out:
1. It is logged immediately via stdout/stderr.
2. A diagnostics payload is generated on the `'system:error'` topic.
3. The remaining subscribers of the active event continue execution unaffected.

---

## 🧪 6. Verification Plan

### Automated Unit Tests
We will add `packages/shared/tests/event-bus.test.ts` to test:
1. **Strict Type Constraints**: Attempt invalid publishes and ensure TypeScript compilation alerts.
2. **Isolated Failures**: Run two subscribers where one throws a sync/async error, and verify the other still finishes.
3. **Execution Timeouts**: Mock a subscriber that takes 10 seconds to resolve and verify that the timeout catches it within 5 seconds without freezing other subscribers.
4. **Sanitization Interception**: Verify that high-risk keys are stripped of their secret content and absolute paths are masked.
5. **Wildcard Listeners**: Confirm wildcard subscribers capture all events.
