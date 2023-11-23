/* not included in public docs
 * @class Log
 * @type Log
 * @param {number} logLevel
 */
export class Log {
  static LOGGING_ON = true
  static LOGGING_OFF = false
  static LOG_PREFIX = 'NiiVue:'

  constructor(logLevel) {
    // log levels:
    // - 'debug'
    // - 'info'
    // - 'warn'
    // - 'error'
    this.logLevel = logLevel // true or false

    // logs take the form of `NiiVue: <unix_time> ...arguments` when printed to the console
  }

  getTimeStamp() {
    return `${this.LOG_PREFIX} `
  }

  debug() {
    if (this.logLevel === Log.LOGGING_ON) {
      console.log(this.getTimeStamp(), 'DEBUG', ...arguments)
    }
  }

  info() {
    if (this.logLevel === Log.LOGGING_ON) {
      console.log(this.getTimeStamp(), 'INFO', ...arguments)
    }
  }

  warn() {
    if (this.logLevel === Log.LOGGING_ON) {
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
