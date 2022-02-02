export const Log = function (logLevel) {
  // log levels:
  // - 'debug'
  // - 'info'
  // - 'warn'
  // - 'error'
  this.DEBUG = "debug";
  this.INFO = "info";
  this.WARN = "warn";
  this.ERROR = "error";
  this.LOG_PREFIX = "NiiVue: ";
  this.logLevel = logLevel;

	//logs take the form of `NiiVue: <unix_time> ...arguments` when printed to the console
};

Log.prototype.getTimeStamp = function () {
  return `${this.LOG_PREFIX}${Date.now()} `;
};

Log.prototype.debug = function () {
  if (this.logLevel === this.DEBUG) {
    console.log(this.getTimeStamp(), ...arguments);
  }
};

Log.prototype.info = function () {
  if (this.logLevel === this.INFO) {
    console.log(this.getTimeStamp(), ...arguments);
  }
};

Log.prototype.warn = function () {
  if (this.logLevel === this.WARN) {
    console.warn(this.getTimeStamp(), ...arguments);
  }
};

Log.prototype.error = function () {
  if (this.logLevel === this.ERROR) {
    console.error(this.getTimeStamp(), ...arguments);
  }
};

Log.prototype.setLogLevel = function (logLevel) {
  this.logLevel = logLevel;
};
