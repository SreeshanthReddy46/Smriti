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
