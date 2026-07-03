export class Scheduler {
  private intervals: NodeJS.Timeout[] = [];

  public start(onSave: () => void, onBackup: () => void): void {
    // Save memory db check every 10 seconds (scaled down for testing verification)
    const saveId = setInterval(() => {
      onSave();
    }, 10000);

    // Database backup check every 30 seconds
    const backupId = setInterval(() => {
      onBackup();
    }, 30000);

    this.intervals.push(saveId, backupId);
  }

  public stop(): void {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
  }
}
