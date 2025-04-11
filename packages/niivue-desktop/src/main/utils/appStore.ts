import { app } from 'electron'
import { NVConfigOptions } from '@niivue/niivue'

import Store from 'electron-store'

// Define AppStore class using ElectronStore correctly
export class AppStore {
  private store: Store

  constructor() {
    this.store = new Store()
    console.log('store', this.store)
  }

  // Recent Files Methods
  getRecentFiles(): string[] {
    const recentFiles = this.store.get('recentFiles') as []
    console.log(recentFiles)
    return recentFiles ?? []
  }

  addRecentFile(filePath: string): void {
    let recentFiles = this.getRecentFiles()
    recentFiles = [filePath, ...recentFiles.filter((f) => f !== filePath)].slice(0, 10)
    this.store.set('recentFiles', recentFiles)
    console.log(recentFiles)
    app.addRecentDocument(filePath)
  }

  clearRecentFiles(): void {
    this.store.set('recentFiles', [])
  }

  // User Preferences Methods
  getPreferences(): Partial<NVConfigOptions> {
    const pref = this.store.get('preferences')
    console.log('getting preferences', pref)
    return this.store.get('preferences') ?? {}
  }

  setPreference<K extends keyof NVConfigOptions>(key: K, value: NVConfigOptions[K]): void {
    const updatedPreferences = { ...this.getPreferences(), [key]: value }
    this.store.set('preferences', updatedPreferences)
    console.log('updated preferences', updatedPreferences)
  }

  resetPreferences(): void {
    this.store.set('preferences', {})
  }
}

// Export singleton instance
export const store = new AppStore()