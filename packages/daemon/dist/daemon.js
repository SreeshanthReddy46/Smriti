import { LocalServiceManager } from './service-manager.js';
import { Scheduler } from './scheduler.js';
import { ApiWorker } from './workers/api-worker.js';
export class SmritiDaemon {
    serviceManager;
    scheduler;
    constructor() {
        this.serviceManager = new LocalServiceManager();
        this.scheduler = new Scheduler();
        // Register API worker
        const apiWorker = new ApiWorker(() => this.getHealthStatus(), () => this.stop());
        this.serviceManager.registerWorker(apiWorker);
    }
    async start() {
        await this.serviceManager.startAll();
        this.scheduler.start(() => this.saveMemory(), () => this.backupDb());
    }
    async stop() {
        this.scheduler.stop();
        await this.serviceManager.stopAll();
    }
    getHealthStatus() {
        return {
            project: 'Active Project',
            status: 'healthy',
            workers: this.serviceManager.getStatusList()
        };
    }
    saveMemory() {
        // Scheduled trigger saves index state
    }
    backupDb() {
        // Scheduled trigger backs up SQLite database
    }
}
