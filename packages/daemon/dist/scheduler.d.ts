export declare class Scheduler {
    private intervals;
    start(onSave: () => void, onBackup: () => void): void;
    stop(): void;
}
