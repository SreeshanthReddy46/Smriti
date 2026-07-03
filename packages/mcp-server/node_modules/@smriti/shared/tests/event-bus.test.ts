import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { SmritiEventBus } from '../dist/event-bus.js';

describe('SmritiEventBus core verification', () => {
  let bus: SmritiEventBus;

  before(() => {
    bus = SmritiEventBus.getInstance();
  });

  test('Type-safe publish and subscribe mechanics', async () => {
    let capturedPath = '';
    const unsubscribe = bus.subscribe('file:created', (event) => {
      capturedPath = event.payload.path;
    });

    await bus.publish('file:created', { path: 'src/main.ts', size: 1024 });
    assert.strictEqual(capturedPath, 'src/main.ts');
    
    unsubscribe();
  });

  test('Subscriber error isolation boundaries', async () => {
    let secondSubscriberCompleted = false;
    let systemErrorCaptured = false;

    const unsubErr = bus.subscribe('file:modified', () => {
      throw new Error('Failing Subscriber Mock');
    });

    const unsubSucc = bus.subscribe('file:modified', () => {
      secondSubscriberCompleted = true;
    });

    const unsubDiag = bus.subscribe('system:error', (event) => {
      if (event.payload.failedEventType === 'file:modified') {
        systemErrorCaptured = true;
      }
    });

    await bus.publish('file:modified', { path: 'src/config.ts' });

    assert.strictEqual(secondSubscriberCompleted, true);
    assert.strictEqual(systemErrorCaptured, true);

    unsubErr();
    unsubSucc();
    unsubDiag();
  });

  test('Subscriber execution timeouts', async () => {
    bus.setConfig({ timeoutMs: 100 });
    let errorLogged = false;

    const unsubDiag = bus.subscribe('system:error', (event) => {
      if (event.payload.error.includes('Subscriber timed out')) {
        errorLogged = true;
      }
    });

    const unsubHang = bus.subscribe('file:deleted', async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    await bus.publish('file:deleted', { path: 'src/old.ts' });
    assert.strictEqual(errorLogged, true);

    // Restore default timeout
    bus.setConfig({ timeoutMs: 5000 });
    unsubDiag();
    unsubHang();
  });

  test('Privacy Mode credential sweeping & path masking', async () => {
    bus.setConfig({
      workspacePath: '/Users/testuser/Smriti',
      secureMode: true
    });

    let cleanedMessage = '';
    let cleanedPath = '';

    const unsub = bus.subscribe('git:commit', (event) => {
      cleanedMessage = event.payload.message;
      cleanedPath = event.payload.files[0];
    });

    await bus.publish('git:commit', {
      hash: 'abc',
      author: 'Tester',
      date: '2026-07-03',
      message: 'feat: add keys with Gemini key AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q',
      files: ['/Users/testuser/Smriti/packages/shared/src/index.ts']
    });

    assert.ok(cleanedMessage.includes('[MASKED_GEMINI_KEY]'));
    assert.ok(!cleanedMessage.includes('AIzaSyA1B2C3D4E5F6'));
    assert.strictEqual(cleanedPath, '<WORKSPACE>/packages/shared/src/index.ts');

    unsub();
  });

  test('Deep freeze immutability contract', async () => {
    const unsub = bus.subscribe('file:created', (event) => {
      assert.throws(() => {
        (event.payload as any).path = 'changed.ts';
      }, TypeError);
    });

    await bus.publish('file:created', { path: 'immutable.ts' });
    unsub();
  });
});
