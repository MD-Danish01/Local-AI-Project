/**
 * ConsoleLogger - Captures console logs for display in debug UI
 */

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  args: any[];
}

class ConsoleLoggerService {
  private logs: LogEntry[] = [];
  private maxLogs = 500;
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  constructor() {
    this.interceptConsole();
  }

  private interceptConsole() {
    const self = this;

    console.log = function (...args: any[]) {
      self.addLog('log', args);
      self.originalConsole.log.apply(console, args);
    };

    console.info = function (...args: any[]) {
      self.addLog('info', args);
      self.originalConsole.info.apply(console, args);
    };

    console.warn = function (...args: any[]) {
      self.addLog('warn', args);
      self.originalConsole.warn.apply(console, args);
    };

    console.error = function (...args: any[]) {
      self.addLog('error', args);
      self.originalConsole.error.apply(console, args);
    };

    console.debug = function (...args: any[]) {
      self.addLog('debug', args);
      self.originalConsole.debug.apply(console, args);
    };
  }

  private addLog(level: LogEntry['level'], args: any[]) {
    const message = args
      .map((arg) => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');

    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      args,
    };

    this.logs.push(entry);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Notify listeners
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener([...this.logs]);
      } catch (err) {
        this.originalConsole.error('Error in log listener:', err);
      }
    }
);
  }

  subscribe(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.push(listener);
    // Immediately send current logs
    listener([...this.logs]);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.notifyListeners();
  }
}

export const consoleLogger = new ConsoleLoggerService();
