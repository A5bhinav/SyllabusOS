/**
 * Logger Utility
 * Centralized logging for the application
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const formattedMessage = this.formatMessage(level, message, context)

    switch (level) {
      case 'debug':
        if (this.isDevelopment()) {
          console.debug(formattedMessage)
        }
        break
      case 'info':
        console.info(formattedMessage)
        break
      case 'warn':
        console.warn(formattedMessage)
        break
      case 'error':
        console.error(formattedMessage)
        if (context?.error && context.error instanceof Error) {
          console.error('Stack trace:', context.error.stack)
        }
        break
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      ...(error instanceof Error
        ? { error, message: error.message, stack: error.stack }
        : { error: String(error) }),
    }
    this.log('error', message, errorContext)
  }

  /**
   * Log API request
   */
  apiRequest(method: string, path: string, userId?: string, context?: LogContext): void {
    this.info(`API ${method} ${path}`, {
      ...context,
      userId,
      method,
      path,
    })
  }

  /**
   * Log API response
   */
  apiResponse(
    method: string,
    path: string,
    statusCode: number,
    duration?: number,
    context?: LogContext
  ): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    this.log(level, `API ${method} ${path} - ${statusCode}`, {
      ...context,
      method,
      path,
      statusCode,
      ...(duration && { durationMs: duration }),
    })
  }

  /**
   * Log API error
   */
  apiError(
    method: string,
    path: string,
    error: Error | unknown,
    statusCode: number = 500,
    context?: LogContext
  ): void {
    this.error(`API ${method} ${path} - ${statusCode}`, error, {
      ...context,
      method,
      path,
      statusCode,
    })
  }
}

// Export singleton instance
export const logger = new Logger()

