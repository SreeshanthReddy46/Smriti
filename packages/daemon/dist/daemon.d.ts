export declare class SmritiDaemon {
    private serviceManager;
    private scheduler;
    constructor();
    start(): Promise<void>;
    stop(): Promise<void>;
    getHealthStatus(): any;
    private saveMemory;
    private backupDb;
}
