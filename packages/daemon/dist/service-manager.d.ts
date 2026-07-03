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
export declare class LocalServiceManager {
    private workers;
    registerWorker(worker: Worker): void;
    startAll(): Promise<void>;
    stopAll(): Promise<void>;
    getStatusList(): WorkerStatus[];
}
