import { readFile } from 'fs/promises'
import { store } from './appStore.js'
import { refreshMenu } from './menu.js' // Import refreshMenu

// read a file and return it as a base64 string
export const readFromFile = async (_: unknown, path: string): Promise<string> => {
  try {
    const data = Buffer.from(await readFile(path))
    const base64 = data.toString('base64')
    store.addRecentFile(path)
    refreshMenu()
    return base64
  } catch (error) {
    console.error(error)
    return ''
  }
}

// the ipc handler is separate so that loadFromFile can be called separately from the handler if needed
export const loadFromFileHandler = async (_: unknown, path: string): Promise<string> => {
  try {
    const base64 = await readFromFile(_, path)
    return base64
  } catch (error) {
    console.error(error)
    return ''
  }
}
