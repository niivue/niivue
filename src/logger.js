/* not included in public docs
 * @class Log
 * @type Log
 * @param {number} logLevel
 */
export const Log = function (logLevel) {
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

Log.prototype.getTimeStamp = function () {
  return `${this.LOG_PREFIX} `
}

Log.prototype.debug = function () {
  if (this.logLevel === this.LOGGING_ON) {
    console.log(this.getTimeStamp(), 'DEBUG', ...arguments)
  }
}

Log.prototype.info = function () {
  if (this.logLevel === this.LOGGING_ON) {
    console.log(this.getTimeStamp(), 'INFO', ...arguments)
  }
}

Log.prototype.warn = function () {
  if (this.logLevel === this.LOGGING_ON) {
    console.warn(this.getTimeStamp(), 'WARN', ...arguments)
  }
}

Log.prototype.error = function () {
  console.error(this.getTimeStamp(), 'ERROR', ...arguments)
}

Log.prototype.setLogLevel = function (logLevel) {
  this.logLevel = logLevel
}
