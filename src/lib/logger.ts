export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDev = process.env.NODE_ENV !== 'production';

  private formatMessage(level: LogLevel, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...meta,
    };

    if (this.isDev) {
      // In development, print readable logs
      const color = this.getColor(level);
      console.log(
        `${color}[${level.toUpperCase()}] \x1b[0m${message}`,
        meta ? meta : ''
      );
    } else {
      // In production, log as JSON for observability tools
      console.log(JSON.stringify(logData));
    }
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case 'info': return '\x1b[36m'; // Cyan
      case 'warn': return '\x1b[33m'; // Yellow
      case 'error': return '\x1b[31m'; // Red
      case 'debug': return '\x1b[35m'; // Magenta
      default: return '\x1b[0m'; // White
    }
  }

  info(message: string, meta?: any) {
    this.formatMessage('info', message, meta);
  }

  warn(message: string, meta?: any) {
    this.formatMessage('warn', message, meta);
  }

  error(message: string, meta?: any) {
    this.formatMessage('error', message, meta);
  }

  debug(message: string, meta?: any) {
    if (this.isDev) {
      this.formatMessage('debug', message, meta);
    }
  }
}

export const logger = new Logger();
