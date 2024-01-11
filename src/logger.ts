interface LogLevelMap {
  [key: string]: number
}
class Log {
  level: string
  name: string
  constructor({ name = 'niivue', level = 'info' } = {}) {
    this.name = `${name}`
    this.level = level
  }

  // map 'debug' 'info' 'warn' 'error' 'fatal' 'silent' to numbers
  // for comparison
  static levels: LogLevelMap = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
    silent: Infinity
  }

  debug(...args: unknown[]): void {
    if (Log.levels[this.level] > Log.levels.debug) {
      return
    }
    // eslint-disable-next-line
    console.debug(`${this.name}-debug`, ...args)
  }

  info(...args: unknown[]): void {
    if (Log.levels[this.level] > Log.levels.info) {
      return
    }
    // eslint-disable-next-line
    console.info(`${this.name}-info`, ...args)
  }

  warn(...args: unknown[]): void {
    if (Log.levels[this.level] > Log.levels.warn) {
      return
    }
    // eslint-disable-next-line
    console.warn(`${this.name}-warn`, ...args)
  }

  error(...args: unknown[]): void {
    if (Log.levels[this.level] > Log.levels.error) {
      return
    }
    // eslint-disable-next-line
    console.error(`${this.name}-error`, ...args)
  }

  fatal(...args: unknown[]): void {
    if (Log.levels[this.level] > Log.levels.fatal) {
      return
    }
    // eslint-disable-next-line
    console.error(`${this.name}-fatal`, ...args)
  }

  setLogLevel(level: string): void {
    this.level = level
  }

  setName(name: string): void {
    this.name = name
  }
}

// make a log instance and export it
const log = new Log({ name: 'niivue', level: 'info' })
export { log }
