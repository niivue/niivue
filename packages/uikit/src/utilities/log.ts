export class Log {
    static debugEnabled = false
  
    static info(message: string, ...args: unknown[]): void {
      console.info(`[INFO] ${message}`, ...args)
    }
  
    static warn(message: string, ...args: unknown[]): void {
      console.warn(`[WARN] ${message}`, ...args)
    }
  
    static error(message: string, ...args: unknown[]): void {
      console.error(`[ERROR] ${message}`, ...args)
    }
  
    static debug(message: string, ...args: unknown[]): void {
      if (Log.debugEnabled) {
        console.debug(`[DEBUG] ${message}`, ...args)
      }
    }
  }
  