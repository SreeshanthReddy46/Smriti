import type { BaseEvent, EventMap, SmritiEventType } from './index.js';

export type EventListener<K extends SmritiEventType> = (event: BaseEvent<K>) => void | Promise<void>;

export class SmritiEventBus {
  private static instance: SmritiEventBus;
  private subscribers: Map<SmritiEventType, Set<EventListener<any>>>;
  private wildcardSubscribers: Set<(event: BaseEvent) => void | Promise<void>>;

  private timeoutMs = 5000;
  private workspacePath: string = '';
  private secureMode = false;

  private constructor() {
    this.subscribers = new Map();
    this.wildcardSubscribers = new Set();
  }

  public static getInstance(): SmritiEventBus {
    if (!SmritiEventBus.instance) {
      SmritiEventBus.instance = new SmritiEventBus();
    }
    return SmritiEventBus.instance;
  }

  /**
   * Set configuration constraints for the event bus.
   */
  public setConfig(options: { workspacePath?: string; secureMode?: boolean; timeoutMs?: number }): void {
    if (options.workspacePath !== undefined) {
      this.workspacePath = options.workspacePath.replace(/\\/g, '/');
    }
    if (options.secureMode !== undefined) {
      this.secureMode = options.secureMode;
    }
    if (options.timeoutMs !== undefined) {
      this.timeoutMs = options.timeoutMs;
    }
  }

  /**
   * Subscribes to a specific event type. Returns unsubscribe function.
   */
  public subscribe<K extends SmritiEventType>(type: K, listener: EventListener<K>): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(listener);

    return () => {
      this.subscribers.get(type)?.delete(listener);
    };
  }

  /**
   * Subscribes to all events in the system.
   */
  public subscribeAll(listener: (event: BaseEvent) => void | Promise<void>): () => void {
    this.wildcardSubscribers.add(listener);
    return () => {
      this.wildcardSubscribers.delete(listener);
    };
  }

  /**
   * Publish an event. Intercepts, sanitizes, deep-freezes, and routes asynchronously.
   */
  public async publish<K extends SmritiEventType>(type: K, payload: EventMap[K]): Promise<void> {
    const sanitizedPayload = this.sanitizePayload(payload);
    
    const eventEnvelope: BaseEvent<K> = {
      id: crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      type,
      timestamp: new Date().toISOString(),
      payload: sanitizedPayload
    };

    const frozenEvent = this.deepFreeze(eventEnvelope);

    const listeners = [
      ...(this.subscribers.get(type) || []),
      ...this.wildcardSubscribers
    ];

    if (listeners.length === 0) return;

    // Run subscribers concurrently in safe isolation wraps
    const promises = listeners.map(async (listener) => {
      try {
        await Promise.race([
          listener(frozenEvent),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Subscriber timed out after ${this.timeoutMs}ms`)), this.timeoutMs)
          )
        ]);
      } catch (err) {
        this.handleListenerError(eventEnvelope, err);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Deep-freeze helper to block mutation modifications.
   */
  private deepFreeze<T>(obj: T): T {
    if (obj && typeof obj === 'object') {
      Object.freeze(obj);
      Object.keys(obj).forEach((key) => {
        const prop = (obj as any)[key];
        if (prop !== null && (typeof prop === 'object' || typeof prop === 'function') && !Object.isFrozen(prop)) {
          this.deepFreeze(prop);
        }
      });
    }
    return obj;
  }

  /**
   * Sweeps API keys and masks absolute folder paths in event payloads.
   */
  private sanitizePayload<T>(payload: T): T {
    if (!this.secureMode) return payload;

    const serializeAndReplace = (val: any): any => {
      if (typeof val === 'string') {
        let cleaned = val;

        // 1. Google Gemini Keys Sweeper
        cleaned = cleaned.replace(/AIzaSy[A-Za-z0-9_-]{30,40}/g, '[MASKED_GEMINI_KEY]');

        // 2. OpenAI Keys Sweeper
        cleaned = cleaned.replace(/sk-[a-zA-Z0-9-]{30,100}/g, '[MASKED_OPENAI_KEY]');

        // 3. Absolute Paths Masker
        if (this.workspacePath) {
          const normalizedVal = val.replace(/\\/g, '/');
          if (normalizedVal.includes(this.workspacePath)) {
            cleaned = normalizedVal.replace(new RegExp(this.escapeRegExp(this.workspacePath), 'g'), '<WORKSPACE>');
          }
        }
        
        return cleaned;
      }

      if (Array.isArray(val)) {
        return val.map(serializeAndReplace);
      }

      if (val !== null && typeof val === 'object') {
        const copy: any = {};
        for (const k of Object.keys(val)) {
          copy[k] = serializeAndReplace(val[k]);
        }
        return copy;
      }

      return val;
    };

    return serializeAndReplace(payload);
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Safe isolated error logger and diagnostic dispatcher.
   */
  private handleListenerError(event: BaseEvent, error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[EventBus Exception] ${event.type} failed:`, errorMsg);

    if (event.type !== 'system:error') {
      // Fire error notification on background bus thread
      this.publish('system:error', {
        failedEventId: event.id,
        failedEventType: event.type,
        error: errorMsg
      }).catch(err => {
        console.error('[EventBus Fatal] Failed to route system error:', err);
      });
    }
  }
}
