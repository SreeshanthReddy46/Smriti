# Smriti Core Runtime Daemon & CLI Design Spec

This document details the architectural specification for the **Smriti Background Daemon** and **CLI (Command Line Interface)**. It outlines how the CLI initiates, stops, and queries the background daemon over an HTTP control channel, and how the Daemon's `LocalServiceManager` orchestrates memory indexing, file/git workers, and scheduler triggers.

---

## 🏗️ 1. Runtime Architecture Overview

```
                      ┌──────────────────────┐
                      │      Developer       │
                      └──────────┬───────────┘
                                 │
                            smriti start
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │      Smriti CLI      │
                      └──────────┬───────────┘
                                 │
                    Spawns detached background process
                                 │
                                 ▼
  ┌────────────────────────────────────────────────────────────────┐
  │                         SMRITI DAEMON                          │
  │                                                                │
  │  ┌──────────────────────┐            ┌──────────────────────┐  │
  │  │  LocalServiceManager │ ─────────► │  Scheduler Engine    │  │
  │  └──────────┬───────────┘            └──────────────────────┘  │
  │             │                                                  │
  │             ├───────────────┬───────────────┬────────────────  │
  │             ▼               ▼               ▼                  │
  │       [API Worker]    [MCP Worker]    [File Watcher]           │
  │       (Port 8844)     (Stdio bridge)  (Chokidar/Fs)            │
  └────────────────────────────────────────────────────────────────┘
```

---

## 📂 2. Directory Layouts

We will structure two new packages in the monorepo:

### 2.1 CLI (`packages/cli/`)
```
packages/cli/
├── package.json
├── tsconfig.json
├── bin/
│   └── smriti.js                # Shell entry point
└── src/
    ├── index.ts                 # CLI commander router
    ├── commands/
    │   ├── init.ts
    │   ├── start.ts
    │   ├── stop.ts
    │   └── status.ts
    └── utils/
        └── daemon-client.ts     # HTTP requests handler
```

### 2.2 Daemon (`packages/daemon/`)
```
packages/daemon/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                 # Daemon entry point
    ├── daemon.ts                # Main Daemon class
    ├── service-manager.ts       # Local Service Manager
    ├── scheduler.ts             # Task scheduler
    └── workers/
        ├── api-worker.ts        # Fastify / native http control api
        ├── mcp-worker.ts        # MCP bridge listener
        └── file-watcher.ts      # Fs watch worker
```

---

## ⚡ 3. The Local Service Manager

The `LocalServiceManager` coordinates the lifecycle of all internal workers. It serves as a supervisor:

```typescript
export interface WorkerStatus {
  name: string;
  status: 'running' | 'stopped' | 'failed';
  error?: string;
}

export class LocalServiceManager {
  private workers = new Map<string, { start: () => void; stop: () => void; getStatus: () => WorkerStatus }>();

  public registerWorker(name: string, start: () => void, stop: () => void, getStatus: () => WorkerStatus): void;
  public startAll(): void;
  public stopAll(): void;
  public getStatusList(): WorkerStatus[];
}
```

If a worker encounters an error, the supervisor registers its state as `failed` and attempts a restart cycle.

---

## 🛡️ 4. Daemon API Endpoints (Control Channel)

The CLI queries status or sends directives to the daemon via a local HTTP server listening on port `8844`. To ensure instant, offline-first execution, the API is implemented using Node's native `http` module.

### 4.1 `GET /api/status`
Returns the status of all daemon workers and the active project:
```json
{
  "project": "AI Gateway",
  "status": "healthy",
  "workers": [
    { "name": "api-worker", "status": "running" },
    { "name": "mcp-worker", "status": "running" },
    { "name": "file-watcher", "status": "running" }
  ]
}
```

### 4.2 `POST /api/stop`
Gracefully stops the scheduler, flush databases, and kills the daemon process.
Response:
```json
{ "success": true, "message": "Daemon shutting down" }
```

---

## 🕒 5. Scheduler Engine

The `Scheduler` runs in the background and executes periodic housekeeping tasks:
- **Every 30 seconds**: Save active memory frames to database.
- **Every 1 minute**: Perform database backup check.
- **Every 10 minutes**: Prune inactive search cache frames.

---

## 🚀 6. CLI Execution Commands

### 6.1 `smriti init`
Creates the `.smriti/` workspace folder structure inside the current working directory:
- `.smriti/config.json` (stores local configuration parameters)
- `.smriti/memory.db` (local SQLite relational database)
- `.smriti/logs/` (stderr/stdout logging output)
- `.smriti/vectors/` (LanceDB workspace files)

### 6.2 `smriti start`
1. Checks if the HTTP server at `http://localhost:8844/api/status` is already responsive. If yes, exits warning that daemon is already running.
2. Spawns the daemon process as a **detached subprocess**:
   ```typescript
   const daemonProc = spawn('node', ['--experimental-strip-types', daemonPath], {
     detached: true,
     stdio: 'ignore' // redirect to logs/daemon.log in production
   });
   daemonProc.unref();
   ```
3. Exits, leaving the daemon running in the background.

### 6.3 `smriti stop`
Sends a `POST` request to `http://localhost:8844/api/stop`. If unresponsive, checks for a PID file or prints an error.

### 6.4 `smriti status`
Calls `GET /api/status` and prints a formatted terminal output.

---

## 🧪 7. Testing Plan

We will configure tests to verify:
1. **Service Manager Lifecycle**: Assert `startAll` and `stopAll` invoke registered worker handlers.
2. **Control channel routing**: Spin up the HTTP API server, send mock `GET /api/status` and `POST /api/stop` requests, and assert responses.
3. **CLI spawn logic**: Mock the subprocess spawn parameters to ensure `detached: true` is set.
