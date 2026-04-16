/**
 * Frontend Logging Service
 * Provides structured logging that persists to backend and local storage
 * Tracks all UI interactions and state changes
 */

export interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  source: 'frontend';
  message: string;
  module: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  sessionId: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

interface LogBatch {
  logs: LogEntry[];
  timestamp: string;
}

class FrontendLogger {
  private logQueue: LogEntry[] = [];
  private batchSize = 50;
  private flushInterval = 30000; // 30 seconds
  private sessionId: string;
  private userId?: string;
  private flushTimer?: NodeJS.Timeout;
  private baseUrl: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    this.startPeriodicFlush();
    this.setupErrorHandling();
    this.setupBeforeUnload();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    module: string,
    options: Partial<LogEntry> = {}
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      source: 'frontend',
      message,
      module,
      sessionId: this.sessionId,
      userId: this.userId,
      ...options,
    };
  }

  debug(message: string, module: string, options?: Partial<LogEntry>) {
    const entry = this.createLogEntry('DEBUG', message, module, options);
    this.addToQueue(entry);
    console.debug(`[${module}]`, message, options?.metadata);
  }

  info(message: string, module: string, options?: Partial<LogEntry>) {
    const entry = this.createLogEntry('INFO', message, module, options);
    this.addToQueue(entry);
    console.info(`[${module}]`, message, options?.metadata);
  }

  warning(message: string, module: string, options?: Partial<LogEntry>) {
    const entry = this.createLogEntry('WARNING', message, module, options);
    this.addToQueue(entry);
    console.warn(`[${module}]`, message, options?.metadata);
  }

  error(message: string, module: string, error?: Error, options?: Partial<LogEntry>) {
    const entry = this.createLogEntry('ERROR', message, module, {
      ...options,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
    this.addToQueue(entry);
    console.error(`[${module}]`, message, error, options?.metadata);
  }

  critical(message: string, module: string, error?: Error, options?: Partial<LogEntry>) {
    const entry = this.createLogEntry('CRITICAL', message, module, {
      ...options,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
    this.addToQueue(entry);
    // Immediately flush critical errors
    this.flushLogs();
    console.error(`[CRITICAL][${module}]`, message, error, options?.metadata);
  }

  // Structured logging for user actions
  logUserAction(
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: Record<string, any>
  ) {
    this.info(
      `User action: ${action} on ${entityType}${entityId ? ` (${entityId})` : ''}`,
      'UserActions',
      {
        action,
        entityType,
        entityId,
        metadata,
      }
    );
  }

  // Navigation tracking
  logNavigation(fromPath: string, toPath: string, metadata?: Record<string, any>) {
    this.info(`Navigation: ${fromPath} → ${toPath}`, 'Navigation', {
      action: 'navigate',
      entityType: 'route',
      metadata: { fromPath, toPath, ...metadata },
    });
  }

  // API call logging
  logApiCall(
    method: string,
    url: string,
    status: number,
    duration: number,
    metadata?: Record<string, any>
  ) {
    const level = status >= 400 ? 'ERROR' : 'DEBUG';
    this[level.toLowerCase() as keyof FrontendLogger](
      `API ${method} ${url} - ${status} (${duration}ms)`,
      'ApiClient',
      {
        action: 'api_call',
        entityType: 'http_request',
        metadata: { method, url, status, duration, ...metadata },
      }
    );
  }

  // Component lifecycle logging
  logComponentLifecycle(
    componentName: string,
    lifecycle: 'mount' | 'unmount' | 'update',
    metadata?: Record<string, any>
  ) {
    this.debug(`Component ${componentName} ${lifecycle}`, 'ComponentLifecycle', {
      action: lifecycle,
      entityType: 'component',
      entityId: componentName,
      metadata,
    });
  }

  // State change logging
  logStateChange(
    storeName: string,
    action: string,
    before?: any,
    after?: any,
    metadata?: Record<string, any>
  ) {
    this.debug(`State change in ${storeName}: ${action}`, 'StateManagement', {
      action: 'state_change',
      entityType: 'store',
      entityId: storeName,
      metadata: { action, before, after, ...metadata },
    });
  }

  private addToQueue(entry: LogEntry) {
    this.logQueue.push(entry);
    
    // Also save to local storage for offline persistence
    this.saveToLocalStorage(entry);

    if (this.logQueue.length >= this.batchSize) {
      this.flushLogs();
    }
  }

  private saveToLocalStorage(entry: LogEntry) {
    try {
      const key = `tg_logs_${new Date().toISOString().split('T')[0]}`;
      const existing = localStorage.getItem(key);
      const logs = existing ? JSON.parse(existing) : [];
      
      logs.push(entry);
      
      // Keep only last 1000 logs per day
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }
      
      localStorage.setItem(key, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save log to localStorage:', error);
    }
  }

  private async flushLogs() {
    if (this.logQueue.length === 0) return;

    const batch: LogBatch = {
      logs: [...this.logQueue],
      timestamp: new Date().toISOString(),
    };

    this.logQueue = [];

    try {
      const response = await fetch(`${this.baseUrl}/api/logs/frontend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.getAuthToken() && { Authorization: `Bearer ${this.getAuthToken()}` }),
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        throw new Error(`Failed to send logs: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send logs to backend:', error);
      // Put logs back in queue for retry
      this.logQueue.unshift(...batch.logs);
    }
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flushLogs();
    }, this.flushInterval);
  }

  private setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.error(
        `Unhandled error: ${event.message}`,
        'GlobalErrorHandler',
        event.error,
        {
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        }
      );
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error(
        `Unhandled promise rejection: ${event.reason}`,
        'GlobalErrorHandler',
        event.reason instanceof Error ? event.reason : undefined,
        {
          metadata: {
            type: 'unhandledrejection',
            reason: event.reason,
          },
        }
      );
    });
  }

  private setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      // Synchronously flush remaining logs
      if (this.logQueue.length > 0) {
        navigator.sendBeacon(
          `${this.baseUrl}/api/logs/frontend`,
          JSON.stringify({
            logs: this.logQueue,
            timestamp: new Date().toISOString(),
          })
        );
      }
    });
  }

  // Public method to manually flush logs
  flush() {
    return this.flushLogs();
  }

  // Cleanup method
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushLogs();
  }
}

// Create singleton instance
const logger = new FrontendLogger();

// Export both the class and singleton
export { FrontendLogger };
export default logger;

// Helper hooks for React components
export const useLogger = () => {
  return logger;
};

// Utility function for logging function calls
export function loggedFunction<T extends (...args: any[]) => any>(
  fn: T,
  module: string,
  functionName?: string
): T {
  return ((...args: any[]) => {
    const name = functionName || fn.name || 'anonymous';
    logger.debug(`Calling function: ${name}`, module, {
      metadata: { args: args.length },
    });

    try {
      const result = fn(...args);
      
      // Handle promises
      if (result instanceof Promise) {
        return result.catch((error) => {
          logger.error(`Function ${name} failed`, module, error);
          throw error;
        });
      }

      return result;
    } catch (error) {
      logger.error(`Function ${name} failed`, module, error as Error);
      throw error;
    }
  }) as T;
}