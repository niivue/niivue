import { readFile } from 'fs/promises'
import { app } from 'electron'

// Function to handle reading a file from disk given a path
export const loadFromFile = async (_: unknown, path: string): Promise<string> => {
  try {
    const data = Buffer.from(await readFile(path))
    const base64 = data.toString('base64')
    app.addRecentDocument(path)
    return base64
  } catch (error) {
    console.error(error)
    return ''
  }
}
