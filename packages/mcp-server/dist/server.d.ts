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
export declare class SmritiMcpServer {
    private static instance;
    private isInitialized;
    private classifier;
    private rl?;
    private constructor();
    static getInstance(): SmritiMcpServer;
    /**
     * Start the MCP server stdio listener.
     */
    start(): void;
    /**
     * Stop the stdio listener.
     */
    stop(): void;
    handleInputLine(line: string): Promise<void>;
    private handleRequest;
    private handleToolCall;
    private sendResponse;
    private sendError;
}
