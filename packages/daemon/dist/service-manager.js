export class LocalServiceManager {
    workers = new Map();
    registerWorker(worker) {
        this.workers.set(worker.name, worker);
    }
    async startAll() {
        for (const worker of this.workers.values()) {
            try {
                await worker.start();
            }
            catch (err) {
                worker.getStatus().status = 'failed';
                worker.getStatus().error = err.message;
            }
        }
    }
    async stopAll() {
        for (const worker of this.workers.values()) {
            try {
                await worker.stop();
            }
            catch (err) {
                // ignore shutdown logging
            }
        }
    }
    getStatusList() {
        return Array.from(this.workers.values()).map(w => w.getStatus());
    }
}
