/**
 * LOGGER UTILITY
 * SYSTEM ARCHITECT: Centralized logging infrastructure
 *
 * Provides:
 * - Consistent log formatting with emojis and context
 * - PII redaction for production safety
 * - Environment-aware filtering (dev vs production)
 * - Contextual loggers to reduce boilerplate
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext =
  | 'db'
  | 'migration'
  | 'storage'
  | 'settlement'
  | 'expense'
  | 'trip'
  | 'participant'
  | 'currency'
  | 'ui'
  | 'dev';

interface LoggerConfig {
  /** Show debug logs in development */
  enableDebug: boolean;
  /** Minimum log level to display in production */
  minProductionLevel: LogLevel;
  /** Redact potentially sensitive data */
  redactPII: boolean;
}

const defaultConfig: LoggerConfig = {
  enableDebug: __DEV__,
  minProductionLevel: 'warn',
  redactPII: !__DEV__, // Only show full data in development
};

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CONTEXT_EMOJI: Record<LogContext, string> = {
  db: '💾',
  migration: '🔄',
  storage: '📦',
  settlement: '💰',
  expense: '💸',
  trip: '✈️',
  participant: '👤',
  currency: '💱',
  ui: '🎨',
  dev: '🔧',
};

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  private shouldLog(level: LogLevel): boolean {
    if (__DEV__) {
      // In development, show all logs (unless debug is disabled)
      if (level === 'debug' && !this.config.enableDebug) return false;
      return true;
    }

    // In production, filter by minimum level
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minProductionLevel];
  }

  private formatMessage(
    level: LogLevel,
    context: LogContext,
    message: string,
    data?: unknown
  ): string {
    const emoji = CONTEXT_EMOJI[context];
    const prefix = `${emoji} [${context.toUpperCase()}]`;

    if (!data) {
      return `${prefix} ${message}`;
    }

    // Redact PII if enabled
    const formattedData = this.config.redactPII ? this.redactData(data) : data;

    // Smart formatting: one-line for simple data, multi-line for complex/errors
    const dataStr = this.formatData(formattedData, level);
    return `${prefix} ${message} ${dataStr}`;
  }

  /**
   * Format data intelligently based on complexity
   * - Simple objects (<=3 keys): inline format
   * - Errors or complex objects: multi-line JSON
   */
  private formatData(data: unknown, level: LogLevel): string {
    if (data === null || data === undefined) {
      return '';
    }

    // For errors, always use multi-line for readability
    if (level === 'error' || (typeof data === 'object' && 'stack' in data)) {
      return `\n${JSON.stringify(data, null, 2)}`;
    }

    // For simple objects, format inline
    if (typeof data === 'object' && !Array.isArray(data)) {
      const entries = Object.entries(data as Record<string, unknown>);

      // Simple object: format inline (key: value, key: value)
      if (entries.length <= 3) {
        const formatted = entries
          .map(([key, value]) => {
            const valStr = typeof value === 'string' ? value : JSON.stringify(value);
            return `${key}: ${valStr}`;
          })
          .join(', ');
        return `(${formatted})`;
      }
    }

    // Complex data: multi-line JSON
    return `\n${JSON.stringify(data, null, 2)}`;
  }

  /**
   * Redact potentially sensitive information
   * - Replace names with UUIDs (first 8 chars)
   * - Keep IDs for debugging
   */
  private redactData(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.redactData(item));
    }

    const redacted: Record<string, unknown> = {};
    const obj = data as Record<string, unknown>;

    for (const [key, value] of Object.entries(obj)) {
      // Keep IDs for debugging
      if (key.endsWith('Id') || key === 'id') {
        redacted[key] = typeof value === 'string' ? `${value.slice(0, 8)}...` : value;
      }
      // Redact names
      else if (key.includes('name') || key.includes('Name')) {
        redacted[key] = '[REDACTED]';
      }
      // Redact descriptions
      else if (key.includes('description') || key.includes('Description')) {
        redacted[key] = '[REDACTED]';
      }
      // Keep everything else
      else {
        redacted[key] = typeof value === 'object' ? this.redactData(value) : value;
      }
    }

    return redacted;
  }

  debug(context: LogContext, message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', context, message, data));
    }
  }

  info(context: LogContext, message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', context, message, data));
    }
  }

  warn(context: LogContext, message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', context, message, data));
    }
  }

  error(context: LogContext, message: string, error?: unknown): void {
    if (this.shouldLog('error')) {
      const errorData = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;
      console.error(this.formatMessage('error', context, message, errorData));
    }
  }

  /**
   * Create a contextual logger for a specific module
   * Reduces boilerplate by pre-filling the context
   */
  createContextLogger(context: LogContext) {
    return {
      debug: (message: string, data?: unknown) => this.debug(context, message, data),
      info: (message: string, data?: unknown) => this.info(context, message, data),
      warn: (message: string, data?: unknown) => this.warn(context, message, data),
      error: (message: string, error?: unknown) => this.error(context, message, error),
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports for common contexts
export const dbLogger = logger.createContextLogger('db');
export const migrationLogger = logger.createContextLogger('migration');
export const storageLogger = logger.createContextLogger('storage');
export const settlementLogger = logger.createContextLogger('settlement');
export const expenseLogger = logger.createContextLogger('expense');
export const tripLogger = logger.createContextLogger('trip');
export const participantLogger = logger.createContextLogger('participant');
export const currencyLogger = logger.createContextLogger('currency');
export const uiLogger = logger.createContextLogger('ui');
export const devLogger = logger.createContextLogger('dev');
