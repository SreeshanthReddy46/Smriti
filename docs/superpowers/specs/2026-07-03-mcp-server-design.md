# Smriti MCP Server (Core Integration Layer) Design Spec

This document details the architectural specifications for the **Smriti Stdio-based MCP Server**. It defines a zero-dependency, JSON-RPC 2.0-compliant Stdio transport layer that exposes project memories, timeline statistics, and retrieval orchestration tools directly to compatible AI agents.

---

## 🎯 1. Design Goals

1. **Zero-Dependency Stdio Transport**: Standard input/output communication conforming to the Model Context Protocol (MCP) JSON-RPC 2.0 structure.
2. **First-Class Memory Tools**: Expose the high-performance memory search and storage APIs.
3. **Pluggable Architecture**: Structure handler registries so new tools (e.g., `git.timeline`, `architecture.graph`) can be registered easily.
4. **Resiliency**: Ensure parsing exceptions or tool execution rejections are caught and wrapped in valid JSON-RPC error frames, preventing subprocess terminations.

---

## 🌐 2. JSON-RPC Message Formats

Communication is exchange-based over standard I/O streams using newline-delimited JSON messages.

### 2.1 Initialization Request (`initialize`)
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "ClaudeCode", "version": "0.1.0" }
  }
}
```

### 2.2 Initialization Response
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": { "name": "smriti-mcp-server", "version": "1.0.0" }
  }
}
```

### 2.3 List Tools Request (`tools/list`)
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

### 2.4 List Tools Response
Exposes core Memory Tools to client:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "memory.search",
        "description": "Queries Smriti's Project Intelligence Engine for relevant code snippet context, git timelines, and decisions.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": { "type": "string", "description": "The search query (e.g., 'where is authentication?')" },
            "limit": { "type": "number", "description": "Max search results limit", "default": 5 }
          },
          "required": ["query"]
        }
      },
      {
        "name": "memory.store",
        "description": "Stores a rule, business logic constraint, or fact in Smriti's project memory.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "key": { "type": "string", "description": "The category key (e.g. 'coding_standards', 'business_logic')" },
            "content": { "type": "string", "description": "The instruction standard or fact string" }
          },
          "required": ["key", "content"]
        }
      }
    ]
  }
}
```

---

## ⚡ 3. Class Interface & Routing Logic

The server operates as a singleton reading from `process.stdin` line-by-line using Node's `readline` library.

```typescript
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class SmritiMcpServer {
  private static instance: SmritiMcpServer;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): SmritiMcpServer;

  /**
   * Listens on process.stdin. Parses incoming JSON lines.
   */
  public start(): void;

  private async handleRequest(request: JsonRpcRequest): Promise<void>;
  private sendResponse(id: string | number | null, result: any): void;
  private sendError(id: string | number | null, code: number, message: string): void;
}
```

### 3.1 Error Frame Codes
- **Parse Error (-32700)**: Invalid JSON payload.
- **Invalid Request (-32600)**: Request structure is invalid.
- **Method Not Found (-32601)**: The client called a method we do not support.
- **Internal Error (-32603)**: Running a tool threw an exception.

---

## 🕒 4. Tools Execution & Integration Flow

### 4.1 `memory.search` Flow
When called:
1. Passes `query` to `@smriti/ai` `HybridClassifier` to check query intent.
2. Queries the daemon API (`/api/prompt-context` or vector indexing searches) depending on classification output.
3. Formats matches to a structured markdown summary.
4. Returns result in `content` list envelope:
   ```json
   {
     "content": [
       { "type": "text", "text": "Generated Markdown context..." }
     ]
   }
   ```

### 4.2 `memory.store` Flow
When called:
1. Makes a POST query to the daemon memory rules endpoint (`/api/rules/{key}`).
2. Re-indexes matching vector structures.
3. Returns success report.

---

## 🧪 5. Testing Plan

We will configure `packages/mcp-server/tests/mcp-server.test.ts` to assert:
1. **Handshake Initialization**: Send `initialize` request on stdio mock stream and assert correct Capabilities response.
2. **Tools Listing**: Assert `tools/list` returns both `memory.search` and `memory.store` schemas.
3. **Invalid Methods Handling**: Assert that unknown method requests yield `-32601` error codes.
4. **Execution Boundaries**: Mock a failing database response inside `memory.search` and check that the JSON-RPC server handles it gracefully, returning a `-32603` response rather than crashing.
