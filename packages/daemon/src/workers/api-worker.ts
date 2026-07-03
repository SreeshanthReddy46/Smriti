import http from 'http';
import { Worker, WorkerStatus } from '../service-manager.js';

export class ApiWorker implements Worker {
  public name = 'api-worker';
  private status: WorkerStatus = { name: this.name, status: 'stopped' };
  private server?: http.Server;
  private getDaemonStatus: () => any;
  private stopDaemon: () => void;

  constructor(getDaemonStatus: () => any, stopDaemon: () => void) {
    this.getDaemonStatus = getDaemonStatus;
    this.stopDaemon = stopDaemon;
  }

  public start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const url = req.url;
        const method = req.method;

        res.setHeader('Content-Type', 'application/json');

        if (url === '/api/status' && method === 'GET') {
          res.statusCode = 200;
          res.end(JSON.stringify(this.getDaemonStatus()));
          return;
        }

        if (url === '/api/stop' && method === 'POST') {
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, message: 'Daemon shutting down' }));
          // Delay stop execution slightly to allow final response flush
          setTimeout(() => this.stopDaemon(), 100);
          return;
        }

        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
      });

      this.server.on('error', (err) => {
        this.status.status = 'failed';
        this.status.error = err.message;
        reject(err);
      });

      this.server.listen(8844, () => {
        this.status.status = 'running';
        resolve();
      });
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      this.status.status = 'stopped';
    }
  }

  public getStatus(): WorkerStatus {
    return this.status;
  }
}
