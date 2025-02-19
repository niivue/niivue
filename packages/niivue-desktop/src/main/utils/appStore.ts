import { app } from 'electron'
import ElectronStore from 'electron-store'

// Define schema
interface StoreSchema {
  recentFiles: string[]
}

// Extend ElectronStore and explicitly declare `get` and `set`
export class AppStore extends ElectronStore<StoreSchema> {
  constructor() {
    super({ defaults: { recentFiles: [] } }) // Ensure defaults are set
  }

  getRecentFiles(): string[] {
    const files = super.get('recentFiles') ?? []
    return files
  }

  addRecentFile(filePath: string): void {
    let recentFiles = this.getRecentFiles()
    recentFiles = [filePath, ...recentFiles.filter((f) => f !== filePath)].slice(0, 10)
    super.set('recentFiles', recentFiles) // Explicitly call `super.set`
    app.addRecentDocument(filePath)
  }

  clearRecentFiles(): void {
    super.set('recentFiles', []) // Explicitly call `super.set`
  }
}

// Export singleton instance
export const store = new AppStore()
