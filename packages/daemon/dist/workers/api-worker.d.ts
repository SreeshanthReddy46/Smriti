import { Worker, WorkerStatus } from '../service-manager.js';
export declare class ApiWorker implements Worker {
    name: string;
    private status;
    private server?;
    private getDaemonStatus;
    private stopDaemon;
    constructor(getDaemonStatus: () => any, stopDaemon: () => void);
    start(): Promise<void>;
    stop(): void;
    getStatus(): WorkerStatus;
}
