export class Log {
  static LOGGING_ON = true
  static LOGGING_OFF = false
  static LOG_PREFIX = 'NiiVue:'

  useLogging: boolean

  constructor(useLogging = false) {
    this.useLogging = useLogging
  }

  getTimeStamp(): string {
    return `${Log.LOG_PREFIX} `
  }

  debug(...args: unknown[]): void {
    if (this.useLogging) {
      console.log(this.getTimeStamp(), 'DEBUG', ...args)
    }
  }

  info(...args: unknown[]): void {
    if (this.useLogging) {
      console.info(this.getTimeStamp(), 'INFO', ...args)
    }
  }

  warn(...args: unknown[]): void {
    if (this.useLogging) {
      console.warn(this.getTimeStamp(), 'WARN', ...args)
    }
  }

  error(...args: unknown[]): void {
    console.error(this.getTimeStamp(), 'ERROR', ...args)
  }

  setLogLevel(useLogging: boolean): void {
    this.useLogging = useLogging
  }
}
