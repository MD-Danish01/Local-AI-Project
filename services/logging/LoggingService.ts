/**
 * LoggingService - Centralized logging for tracking events, errors, and debug info
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  details?: any;
}

class LoggingService {
  private logs: LogEntry[] = [];
  private maxLogs = 500; // Keep last 500 logs
  private listeners: Set<(logs: LogEntry[]) => void> = new Set();

  private addLog(level: LogLevel, category: string, message: string, details?: any) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      category,
      message,
      details,
    };

    this.logs.unshift(entry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Also log to console
    const emoji = this.getEmoji(level);
    const logMessage = `${emoji} [${category}] ${message}`;
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(logMessage, details || '');
        break;
      case LogLevel.WARN:
        console.warn(logMessage, details || '');
        break;
      case LogLevel.INFO:
        console.log(logMessage, details || '');
        break;
      case LogLevel.DEBUG:
        console.log(logMessage, details || '');
        break;
    }

    // Notify listeners
    this.notifyListeners();
  }

  private getEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return '❌';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.INFO: return '✅';
      case LogLevel.DEBUG: return '🔍';
      default: return '📝';
    }
  }

  debug(category: string, message: string, details?: any) {
    this.addLog(LogLevel.DEBUG, category, message, details);
  }

  info(category: string, message: string, details?: any) {
    this.addLog(LogLevel.INFO, category, message, details);
  }

  warn(category: string, message: string, details?: any) {
    this.addLog(LogLevel.WARN, category, message, details);
  }

  error(category: string, message: string, details?: any) {
    this.addLog(LogLevel.ERROR, category, message, details);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  // Subscribe to log updates
  subscribe(callback: (logs: LogEntry[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const loggingService = new LoggingService();
