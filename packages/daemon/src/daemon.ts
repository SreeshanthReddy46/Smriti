import { LocalServiceManager } from './service-manager.js';
import { Scheduler } from './scheduler.js';
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
