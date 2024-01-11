import pino from 'pino'
class Log {
  logger: pino.Logger
  level: string
  name: string
  constructor({ name = 'niivue', level = 'info' } = {}) {
    this.logger = pino.default({
      level,
      name,
      msgPrefix: name,
      browser: {
        asObject: false
      }
    })
    this.name = `${name}`
    this.level = level
  }

  debug(...args: unknown[]): void {
    this.logger.debug(`${this.name}-${this.level}`, ...args)
  }

  info(...args: unknown[]): void {
    this.logger.info(`${this.name}-${this.level}`, ...args)
  }

  warn(...args: unknown[]): void {
    this.logger.warn(`${this.name}-${this.level}`, ...args)
  }

  error(...args: unknown[]): void {
    this.logger.error(`${this.name}-${this.level}`, ...args)
  }

  fatal(...args: unknown[]): void {
    this.logger.fatal(`${this.name}-${this.level}`, ...args)
  }

  setLogLevel(level: string): void {
    this.logger.level = level
  }
}

// make a log instance and export it
const log = new Log({ name: 'niivue', level: 'info' })
export { log }
