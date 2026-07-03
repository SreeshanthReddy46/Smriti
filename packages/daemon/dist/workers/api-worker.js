import http from 'http';
export class ApiWorker {
    name = 'api-worker';
    status = { name: this.name, status: 'stopped' };
    server;
    getDaemonStatus;
    stopDaemon;
    constructor(getDaemonStatus, stopDaemon) {
        this.getDaemonStatus = getDaemonStatus;
        this.stopDaemon = stopDaemon;
    }
    start() {
        return new Promise((resolve, reject) => {
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
    stop() {
        if (this.server) {
            this.server.close();
            this.status.status = 'stopped';
        }
    }
    getStatus() {
        return this.status;
    }
}
