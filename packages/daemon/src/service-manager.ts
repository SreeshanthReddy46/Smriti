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

export class LocalServiceManager {
  private workers = new Map<string, Worker>();

  public registerWorker(worker: Worker): void {
    this.workers.set(worker.name, worker);
  }

  public async startAll(): Promise<void> {
    for (const worker of this.workers.values()) {
      try {
        await worker.start();
      } catch (err: any) {
        worker.getStatus().status = 'failed';
        worker.getStatus().error = err.message;
      }
    }
  }

  public async stopAll(): Promise<void> {
    for (const worker of this.workers.values()) {
      try {
        await worker.stop();
      } catch (err: any) {
        // ignore shutdown logging
      }
    }
  }

  public getStatusList(): WorkerStatus[] {
    return Array.from(this.workers.values()).map(w => w.getStatus());
  }
}
