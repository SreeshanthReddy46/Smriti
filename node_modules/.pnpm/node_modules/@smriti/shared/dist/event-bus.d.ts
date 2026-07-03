import type { BaseEvent, EventMap, SmritiEventType } from './index.js';
export type EventListener<K extends SmritiEventType> = (event: BaseEvent<K>) => void | Promise<void>;
export declare class SmritiEventBus {
    private static instance;
    private subscribers;
    private wildcardSubscribers;
    private timeoutMs;
    private workspacePath;
    private secureMode;
    private constructor();
    static getInstance(): SmritiEventBus;
    /**
     * Set configuration constraints for the event bus.
     */
    setConfig(options: {
        workspacePath?: string;
        secureMode?: boolean;
        timeoutMs?: number;
    }): void;
    /**
     * Subscribes to a specific event type. Returns unsubscribe function.
     */
    subscribe<K extends SmritiEventType>(type: K, listener: EventListener<K>): () => void;
    /**
     * Subscribes to all events in the system.
     */
    subscribeAll(listener: (event: BaseEvent) => void | Promise<void>): () => void;
    /**
     * Publish an event. Intercepts, sanitizes, deep-freezes, and routes asynchronously.
     */
    publish<K extends SmritiEventType>(type: K, payload: EventMap[K]): Promise<void>;
    /**
     * Deep-freeze helper to block mutation modifications.
     */
    private deepFreeze;
    /**
     * Sweeps API keys and masks absolute folder paths in event payloads.
     */
    private sanitizePayload;
    private escapeRegExp;
    /**
     * Safe isolated error logger and diagnostic dispatcher.
     */
    private handleListenerError;
}
