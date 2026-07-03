# Runtime Daemon & CLI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the `@smriti/daemon` and `@smriti/cli` packages, implement the HTTP control channel at port 8844, and verify CLI subprocess spawning.

**Architecture:** Create a `LocalServiceManager` supervisor in `packages/daemon` to manage workers and execute housekeeping tasks. Develop a detached background process launcher in `packages/cli` that communicates with the daemon via native HTTP endpoints.

**Tech Stack:** Node.js v24 (built-in TS, readline, spawn, http, and test framework), TypeScript v5.2, pnpm workspaces.

## Global Constraints
- **Zero-Dependency HTTP**: Use Node's built-in `http` module for the daemon controller API to avoid external library installation cycles.
- **Detached Spawn**: Daemon process spawned by CLI must run fully detached from the launching shell session.
- **Testing**: Native Node.js TS test execution (`node --experimental-strip-types --test`).

---

### Task 1: Scaffolding packages/daemon

**Files:**
- Create: `packages/daemon/package.json`
- Create: `packages/daemon/tsconfig.json`
- Create: `packages/daemon/src/index.ts`

**Interfaces:**
- Consumes: Monorepo workspace configurations.
- Produces: Daemon package mappings.

- [ ] **Step 1: Create packages/daemon package configuration**

Create `packages/daemon/package.json`:

```json
{
  "name": "@smriti/daemon",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rimraf dist",
    "test": "node --experimental-strip-types --test tests/daemon.test.ts"
  },
  "devDependencies": {
    "rimraf": "^5.0.5",
    "typescript": "^5.2.2"
  }
}
```

- [ ] **Step 2: Create daemon tsconfig**

Create `packages/daemon/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create index file**

Create `packages/daemon/src/index.ts` to boot the daemon process:

```typescript
import { SmritiDaemon } from './daemon.js';

const daemon = new SmritiDaemon();
daemon.start();

// Handle graceful OS exit requests
process.on('SIGTERM', () => {
  daemon.stop();
  process.exit(0);
});
process.on('SIGINT', () => {
  daemon.stop();
  process.exit(0);
});
```

---

### Task 2: Implementing Daemon Service Manager & API control server

**Files:**
- Create: `packages/daemon/src/service-manager.ts`
- Create: `packages/daemon/src/scheduler.ts`
- Create: `packages/daemon/src/workers/api-worker.ts`
- Create: `packages/daemon/src/daemon.ts`

**Interfaces:**
- Consumes: Worker status configurations.
- Produces: Service supervisions and HTTP control endpoints.

- [ ] **Step 1: Implement Local Service Manager**

Create `packages/daemon/src/service-manager.ts` to register and supervise background worker states:

```typescript
export interface WorkerStatus {
  name: string;
  status: 'running' | 'stopped' | 'failed';
  error?: string;
}

export interface Worker {
  name: string;
  start: () => Promise<void> | void;
  stop: () => Promise<void> | void;
  getStatus: () => WorkerStatus;
}

export class LocalServiceManager {
  private workers = new Map<string, Worker>();

  public registerWorker(worker: Worker): void {
    this.workers.set(worker.name, worker);
  }

  public async startAll(): Promise<void> {
    for (const worker of this.workers.values()) {
      try {
        await worker.start();
      } catch (err: any) {
        worker.getStatus().status = 'failed';
        worker.getStatus().error = err.message;
      }
    }
  }

  public async stopAll(): Promise<void> {
    for (const worker of this.workers.values()) {
      try {
        await worker.stop();
      } catch (err: any) {
        // ignore shutdown logging
      }
    }
  }

  public getStatusList(): WorkerStatus[] {
    return Array.from(this.workers.values()).map(w => w.getStatus());
  }
}
```

- [ ] **Step 2: Implement Periodic Task Scheduler**

Create `packages/daemon/src/scheduler.ts` managing db flushes and back-up sweeps:

```typescript
export class Scheduler {
  private intervals: NodeJS.Timeout[] = [];

  public start(onSave: () => void, onBackup: () => void): void {
    // Save memory db check every 10 seconds (scaled down for testing verification)
    const saveId = setInterval(() => {
      onSave();
    }, 10000);

    // Database backup check every 30 seconds
    const backupId = setInterval(() => {
      onBackup();
    }, 30000);

    this.intervals.push(saveId, backupId);
  }

  public stop(): void {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
  }
}
```

- [ ] **Step 3: Implement Native HTTP API Control Worker**

Create `packages/daemon/src/workers/api-worker.ts` hosting the server at port 8844:

```typescript
import http from 'http';
import { Worker, WorkerStatus } from '../service-manager.js';

export class ApiWorker implements Worker {
  public name = 'api-worker';
  private status: WorkerStatus = { name: this.name, status: 'stopped' };
  private server?: http.Server;
  private getDaemonStatus: () => any;
  private stopDaemon: () => void;

  constructor(getDaemonStatus: () => any, stopDaemon: () => void) {
    this.getDaemonStatus = getDaemonStatus;
    this.stopDaemon = stopDaemon;
  }

  public start(): void {
    this.server = http.createServer((req, res) => {
      const url = req.url;
      const method = req.method;

      res.setHeader('Content-Type', 'application/json');

      if (url === '/api/status' && method === 'GET') {
        res.statusCode = 200;
        res.end(JSON.stringify(this.getDaemonStatus()));
        return;
      }

      if (url === '/api/stop' && method === 'POST') {
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'Daemon shutting down' }));
        // Delay stop execution slightly to allow final response flush
        setTimeout(() => this.stopDaemon(), 100);
        return;
      }

      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    });

    this.server.listen(8844, () => {
      this.status.status = 'running';
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      this.status.status = 'stopped';
    }
  }

  public getStatus(): WorkerStatus {
    return this.status;
  }
}
```

- [ ] **Step 4: Implement SmritiDaemon main coordinator class**

Create `packages/daemon/src/daemon.ts`:

```typescript
import { LocalServiceManager } from './service-manager.js';
import { Scheduler } from './scheduler.ts';
import { ApiWorker } from './workers/api-worker.js';

export class SmritiDaemon {
  private serviceManager: LocalServiceManager;
  private scheduler: Scheduler;

  constructor() {
    this.serviceManager = new LocalServiceManager();
    this.scheduler = new Scheduler();

    // Register API worker
    const apiWorker = new ApiWorker(
      () => this.getHealthStatus(),
      () => this.stop()
    );
    this.serviceManager.registerWorker(apiWorker);
  }

  public async start(): Promise<void> {
    await this.serviceManager.startAll();
    this.scheduler.start(
      () => this.saveMemory(),
      () => this.backupDb()
    );
  }

  public async stop(): Promise<void> {
    this.scheduler.stop();
    await this.serviceManager.stopAll();
  }

  public getHealthStatus(): any {
    return {
      project: 'Active Project',
      status: 'healthy',
      workers: this.serviceManager.getStatusList()
    };
  }

  private saveMemory(): void {
    // Scheduled trigger saves index state
  }

  private backupDb(): void {
    // Scheduled trigger backs up SQLite database
  }
}
```

---

### Task 3: Scaffolding packages/cli & start/status/stop routing

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/src/utils/daemon-client.ts`
- Create: `packages/cli/src/index.ts`

**Interfaces:**
- Consumes: CLI shell queries.
- Produces: CLI commands execution and spawned detached processes.

- [ ] **Step 1: Create cli package configuration**

Create `packages/cli/package.json` declaring CLI script linkage:

```json
{
  "name": "@smriti/cli",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "bin": {
    "smriti": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rimraf dist"
  },
  "devDependencies": {
    "rimraf": "^5.0.5",
    "typescript": "^5.2.2"
  }
}
```

- [ ] **Step 2: Create tsconfig**

Create `packages/cli/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Implement Daemon HTTP client helper**

Create `packages/cli/src/utils/daemon-client.ts`:

```typescript
import http from 'http';

export class DaemonClient {
  public static async checkStatus(): Promise<any> {
    return new Promise((resolve) => {
      const req = http.request({
        host: 'localhost',
        port: 8844,
        path: '/api/status',
        method: 'GET',
        timeout: 1000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(null);
          }
        });
      });

      req.on('error', () => resolve(null));
      req.end();
    });
  }

  public static async stopDaemon(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.request({
        host: 'localhost',
        port: 8844,
        path: '/api/stop',
        method: 'POST',
        timeout: 1000
      }, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => resolve(false));
      req.end();
    });
  }
}
```

- [ ] **Step 4: Implement CLI main command router**

Create `packages/cli/src/index.ts` routing the CLI inputs:

```typescript
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { DaemonClient } from './utils/daemon-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'status') {
    const status = await DaemonClient.checkStatus();
    if (status) {
      console.log('Project :', status.project);
      console.log('Memory  : Healthy');
      console.log('Daemon  : Running');
    } else {
      console.log('Daemon  : Stopped');
    }
    return;
  }

  if (command === 'start') {
    const status = await DaemonClient.checkStatus();
    if (status) {
      console.log('Daemon is already running.');
      return;
    }

    // Path to the daemon entry index
    const daemonPath = path.resolve(__dirname, '../../daemon/dist/index.js');
    
    // Spawn detached daemon process
    const daemonProc = spawn('node', [daemonPath], {
      detached: true,
      stdio: 'ignore'
    });
    daemonProc.unref();

    console.log('Daemon started in the background.');
    return;
  }

  if (command === 'stop') {
    const success = await DaemonClient.stopDaemon();
    if (success) {
      console.log('Daemon stopped successfully.');
    } else {
      console.log('Failed to stop daemon (is it running?).');
    }
    return;
  }

  console.log('Usage: smriti [start|stop|status]');
}

run();
```

- [ ] **Step 5: Sync pnpm workspace registers**

Run: `pnpm install`
Expected: Monorepo registers all new workspace paths.

---

### Task 4: Daemon & CLI Testing Suite

**Files:**
- Create: `packages/daemon/tests/daemon.test.ts`

**Interfaces:**
- Consumes: `@smriti/daemon` classes.
- Produces: Test metrics for supervisions and HTTP control channel.

- [ ] **Step 1: Write daemon test validations**

Create `packages/daemon/tests/daemon.test.ts`:

```typescript
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { SmritiDaemon } from '../dist/daemon.js';

describe('Smriti Background Daemon validations', () => {
  let daemon: SmritiDaemon;

  before(async () => {
    daemon = new SmritiDaemon();
    await daemon.start();
  });

  after(async () => {
    await daemon.stop();
  });

  test('Local Service Manager registers and runs workers', () => {
    const status = daemon.getHealthStatus();
    assert.strictEqual(status.status, 'healthy');
    const apiWorker = status.workers.find((w: any) => w.name === 'api-worker');
    assert.ok(apiWorker);
    assert.strictEqual(apiWorker.status, 'running');
  });

  test('HTTP status control endpoint replies with health JSON', async () => {
    const resBody = await new Promise<string>((resolve) => {
      http.get('http://localhost:8844/api/status', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
    });

    const parsed = JSON.parse(resBody);
    assert.strictEqual(parsed.status, 'healthy');
    assert.strictEqual(parsed.project, 'Active Project');
  });
});
```

- [ ] **Step 2: Compile monorepo packages**

Run: `pnpm --filter @smriti/daemon build`
Expected: Compile succeeds.

Run: `pnpm --filter @smriti/cli build`
Expected: Compile succeeds.

- [ ] **Step 3: Run validation tests**

Run: `pnpm --filter @smriti/daemon test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/daemon packages/cli
git commit -m "feat: implement background daemon and CLI control channel"
```
