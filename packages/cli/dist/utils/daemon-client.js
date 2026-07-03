import http from 'http';
export class DaemonClient {
    static async checkStatus() {
        return new Promise((resolve) => {
            const req = http.request({
                host: 'localhost',
                port: 8844,
                path: '/api/status',
                method: 'GET',
                timeout: 1000
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    }
                    catch {
                        resolve(null);
                    }
                });
            });
            req.on('error', () => resolve(null));
            req.end();
        });
    }
    static async stopDaemon() {
        return new Promise((resolve) => {
            const req = http.request({
                host: 'localhost',
                port: 8844,
                path: '/api/stop',
                method: 'POST',
                timeout: 1000
            }, (res) => {
                resolve(res.statusCode === 200);
            });
            req.on('error', () => resolve(false));
            req.end();
        });
    }
}
