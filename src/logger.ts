export class Log {
  static LOGGING_ON = true
  static LOGGING_OFF = false
  static LOG_PREFIX = 'NiiVue:'

  useLogging: boolean

  constructor(useLogging = false) {
    this.useLogging = useLogging
  }

  getTimeStamp() {
    return `${Log.LOG_PREFIX} `
  }

  debug(...args: unknown[]) {
    if (this.useLogging) {
      console.log(this.getTimeStamp(), 'DEBUG', ...args)
    }
  }

  info(...args: unknown[]) {
    if (this.useLogging) {
      console.info(this.getTimeStamp(), 'INFO', ...args)
    }
  }

  warn(...args: unknown[]) {
    if (this.useLogging) {
      console.warn(this.getTimeStamp(), 'WARN', ...args)
    }
  }

  error(...args: unknown[]) {
    console.error(this.getTimeStamp(), 'ERROR', ...args)
  }

  setLogLevel(useLogging: boolean) {
    this.useLogging = useLogging
  }
}
