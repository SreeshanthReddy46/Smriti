import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { SmritiMcpServer } from '../dist/server.js';
import type { JsonRpcResponse } from '../src/server.ts';
import { SmritiEventBus } from '@smriti/shared';

describe('Smriti Stdio MCP Server core verification', () => {
  let server: SmritiMcpServer;
  let stdoutMessages: string[] = [];

  before(() => {
    server = SmritiMcpServer.getInstance();
    
    // Stub process.stdout.write to capture outgoing JSON-RPC messages
    process.stdout.write = (chunk: any) => {
      stdoutMessages.push(chunk.toString());
      return true;
    };
  });

  test('Handshake Initialize and Initialized protocols', async () => {
    stdoutMessages = [];
    
    // 1. Check blocked call before initialize
    await server.handleInputLine(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    }));
    
    const errRes: JsonRpcResponse = JSON.parse(stdoutMessages[0].trim());
    assert.strictEqual(errRes.error?.code, -32002);
    
    // 2. Initialize
    stdoutMessages = [];
    await server.handleInputLine(JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: { name: 'TestClient', version: '1.0.0' }
      }
    }));
    
    const initRes: JsonRpcResponse = JSON.parse(stdoutMessages[0].trim());
    assert.strictEqual(initRes.result.protocolVersion, '2024-11-05');
    assert.strictEqual(initRes.result.serverInfo.name, 'smriti-mcp-server');
  });

  test('Tools schema listing (tools/list)', async () => {
    stdoutMessages = [];
    await server.handleInputLine(JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list'
    }));

    const listRes: JsonRpcResponse = JSON.parse(stdoutMessages[0].trim());
    const tools = listRes.result.tools;
    assert.ok(Array.isArray(tools));
    assert.strictEqual(tools[0].name, 'memory.search');
    assert.strictEqual(tools[1].name, 'memory.store');
  });

  test('Tools call execution and Event Bus triggers', async () => {
    stdoutMessages = [];
    let eventCaptured = false;

    const bus = SmritiEventBus.getInstance();
    const unsub = bus.subscribe('ai:session', (event) => {
      if (event.payload.prompt === 'where is the event bus?') {
        eventCaptured = true;
      }
    });

    await server.handleInputLine(JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'memory.search',
        arguments: { query: 'where is the event bus?' }
      }
    }));

    const callRes: JsonRpcResponse = JSON.parse(stdoutMessages[0].trim());
    assert.ok(callRes.result.content[0].text.includes('CODE_SEARCH'));
    assert.strictEqual(eventCaptured, true);

    unsub();
  });

  test('Protocol error frames and parsing guards', async () => {
    // Parse error
    stdoutMessages = [];
    await server.handleInputLine('invalid-json');
    const parseRes: JsonRpcResponse = JSON.parse(stdoutMessages[0].trim());
    assert.strictEqual(parseRes.error?.code, -32700);

    // Method not found
    stdoutMessages = [];
    await server.handleInputLine(JSON.stringify({
      jsonrpc: '2.0',
      id: 5,
      method: 'unknown/method'
    }));
    const methodRes: JsonRpcResponse = JSON.parse(stdoutMessages[0].trim());
    assert.strictEqual(methodRes.error?.code, -32601);
  });
});
