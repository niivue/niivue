/* not included in public docs
 * @class Log
 * @type Log
 * @param {number} logLevel
 */
export class Log {
  constructor(logLevel) {
    // log levels:
    // - 'debug'
    // - 'info'
    // - 'warn'
    // - 'error'
    this.LOGGING_ON = true
    this.LOGGING_OFF = false
    this.LOG_PREFIX = 'NiiVue:'
    this.logLevel = logLevel // true or false

    // logs take the form of `NiiVue: <unix_time> ...arguments` when printed to the console
  }

  getTimeStamp() {
    return `${this.LOG_PREFIX} `
  }

  debug() {
    if (this.logLevel === this.LOGGING_ON) {
      console.log(this.getTimeStamp(), 'DEBUG', ...arguments)
    }
  }

  info() {
    if (this.logLevel === this.LOGGING_ON) {
      console.log(this.getTimeStamp(), 'INFO', ...arguments)
    }
  }

  warn() {
    if (this.logLevel === this.LOGGING_ON) {
      console.warn(this.getTimeStamp(), 'WARN', ...arguments)
    }
  }

  error() {
    console.error(this.getTimeStamp(), 'ERROR', ...arguments)
  }

  setLogLevel(logLevel) {
    this.logLevel = logLevel
  }
}
