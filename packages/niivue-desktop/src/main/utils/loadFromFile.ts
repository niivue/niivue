import { readFile } from 'fs/promises'
import { store } from './appStore.js'
import { refreshMenu } from './menu.js' // Import refreshMenu

// Safe console wrappers to prevent EPIPE crashes in dev
function safeLog(...args: unknown[]): void {
  try { console.log(...args) } catch { /* EPIPE */ }
}
function safeError(...args: unknown[]): void {
  try { console.error(...args) } catch { /* EPIPE */ }
}

// read a file and return it as a base64 string
export const readFromFile = async (_: unknown, path: string): Promise<string> => {
  safeLog('[Main] readFromFile requested', path)
  try {
    const data = Buffer.from(await readFile(path))
    const base64 = data.toString('base64')
    store.addRecentFile(path)
    refreshMenu()
    return base64
  } catch (error) {
    safeError(error)
    return ''
  }
}

// the ipc handler is separate so that loadFromFile can be called separately from the handler if needed
export const loadFromFileHandler = async (_: unknown, path: string): Promise<string> => {
  try {
    const base64 = await readFromFile(_, path)
    return base64
  } catch (error) {
    safeError(error)
    return ''
  }
}


