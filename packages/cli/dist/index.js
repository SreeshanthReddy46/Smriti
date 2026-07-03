import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { DaemonClient } from './utils/daemon-client.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function run() {
    const args = process.argv.slice(2);
    const command = args[0];
    if (command === 'status') {
        const status = await DaemonClient.checkStatus();
        if (status) {
            console.log('Project :', status.project);
            console.log('Memory  : Healthy');
            console.log('Daemon  : Running');
        }
        else {
            console.log('Daemon  : Stopped');
        }
        return;
    }
    if (command === 'start') {
        const status = await DaemonClient.checkStatus();
        if (status) {
            console.log('Daemon is already running.');
            return;
        }
        // Path to the daemon entry index
        const daemonPath = path.resolve(__dirname, '../../daemon/dist/index.js');
        // Spawn detached daemon process
        const daemonProc = spawn('node', [daemonPath], {
            detached: true,
            stdio: 'ignore'
        });
        daemonProc.unref();
        console.log('Daemon started in the background.');
        return;
    }
    if (command === 'stop') {
        const success = await DaemonClient.stopDaemon();
        if (success) {
            console.log('Daemon stopped successfully.');
        }
        else {
            console.log('Failed to stop daemon (is it running?).');
        }
        return;
    }
    console.log('Usage: smriti [start|stop|status]');
}
run();
