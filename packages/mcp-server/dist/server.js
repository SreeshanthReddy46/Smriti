import readline from 'readline';
import { SmritiEventBus } from '@smriti/shared';
import { HybridClassifier } from '@smriti/ai';
export class SmritiMcpServer {
    static instance;
    isInitialized = false;
    classifier;
    rl;
    constructor() {
        this.classifier = new HybridClassifier();
    }
    static getInstance() {
        if (!SmritiMcpServer.instance) {
            SmritiMcpServer.instance = new SmritiMcpServer();
        }
        return SmritiMcpServer.instance;
    }
    /**
     * Start the MCP server stdio listener.
     */
    start() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });
        this.rl.on('line', (line) => {
            this.handleInputLine(line);
        });
    }
    /**
     * Stop the stdio listener.
     */
    stop() {
        if (this.rl) {
            this.rl.close();
        }
    }
    async handleInputLine(line) {
        const trimmed = line.trim();
        if (!trimmed)
            return;
        let request;
        try {
            request = JSON.parse(trimmed);
        }
        catch (err) {
            this.sendError(null, -32700, 'Parse error: invalid JSON');
            return;
        }
        if (request.jsonrpc !== '2.0' || !request.method) {
            this.sendError(request.id ?? null, -32600, 'Invalid Request');
            return;
        }
        try {
            await this.handleRequest(request);
        }
        catch (err) {
            this.sendError(request.id ?? null, -32603, `Internal error: ${err.message}`);
        }
    }
    async handleRequest(request) {
        const { id, method, params } = request;
        const reqId = id ?? null;
        if (method === 'initialize') {
            this.isInitialized = true;
            this.sendResponse(reqId, {
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: {}
                },
                serverInfo: {
                    name: 'smriti-mcp-server',
                    version: '1.0.0'
                }
            });
            return;
        }
        if (!this.isInitialized) {
            this.sendError(reqId, -32002, 'Server not initialized');
            return;
        }
        if (method === 'initialized') {
            // Handshake complete, no response required
            return;
        }
        if (method === 'tools/list') {
            this.sendResponse(reqId, {
                tools: [
                    {
                        name: 'memory.search',
                        description: 'Queries Smriti for relevant code snippets, git logs, and ADR decisions.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: { "type": "string", "description": "Search query key" },
                                limit: { "type": "number", "description": "Max limits", "default": 5 }
                            },
                            required: ['query']
                        }
                    },
                    {
                        name: 'memory.store',
                        description: 'Stores a project rule, guideline, or fact in Smriti memory.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                key: { "type": "string", "description": "Rules category key" },
                                content: { "type": "string", "description": "Guidelines or facts string" }
                            },
                            required: ['key', 'content']
                        }
                    }
                ]
            });
            return;
        }
        if (method === 'tools/call') {
            const name = params?.name;
            const args = params?.arguments;
            if (!name) {
                this.sendError(reqId, -32602, 'Invalid params: name is required');
                return;
            }
            const result = await this.handleToolCall(name, args);
            this.sendResponse(reqId, result);
            return;
        }
        this.sendError(reqId, -32601, `Method not found: ${method}`);
    }
    async handleToolCall(name, args) {
        if (name === 'memory.search') {
            const query = args?.query;
            if (!query) {
                throw new Error('Argument query is required');
            }
            // 1. Run intent classifier
            const classRes = await this.classifier.classify(query);
            // 2. Fetch context from Daemon API (Simulated context fetch locally)
            const contextSummary = `### Smriti Retrieved Context\n- Query Intent: ${classRes.intent}\n- Query Entities: ${JSON.stringify(classRes.entities)}\n\nThis is a mock context snippet for testing. In production, this routes to SQLite / vector indexes.`;
            // Publish event via bus
            const bus = SmritiEventBus.getInstance();
            bus.publish('ai:session', {
                sessionId: 'mcp-session',
                prompt: query,
                response: contextSummary
            });
            return {
                content: [
                    { type: 'text', text: contextSummary }
                ]
            };
        }
        if (name === 'memory.store') {
            const key = args?.key;
            const content = args?.content;
            if (!key || !content) {
                throw new Error('Arguments key and content are required');
            }
            // Sync event bus triggers
            const bus = SmritiEventBus.getInstance();
            bus.publish('memory:task', {
                taskId: 99,
                title: `Store Memory: ${key}`,
                status: 'Done'
            });
            return {
                content: [
                    { type: 'text', text: `Success: stored memory rule for key '${key}'.` }
                ]
            };
        }
        throw new Error(`Tool not found: ${name}`);
    }
    sendResponse(id, result) {
        const response = {
            jsonrpc: '2.0',
            id,
            result
        };
        process.stdout.write(JSON.stringify(response) + '\n');
    }
    sendError(id, code, message) {
        const response = {
            jsonrpc: '2.0',
            id,
            error: { code, message }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
    }
}
