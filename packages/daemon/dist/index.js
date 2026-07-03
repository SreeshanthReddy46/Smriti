import { SmritiDaemon } from './daemon.js';
const daemon = new SmritiDaemon();
daemon.start();
// Handle graceful OS exit requests
process.on('SIGTERM', () => {
    daemon.stop();
    process.exit(0);
});
process.on('SIGINT', () => {
    daemon.stop();
    process.exit(0);
});
