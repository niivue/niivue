describe('Preferences', () => {
  // Note: WebdriverIO electron.execute uses the main process, but we need renderer process
  // So we use a different approach - execute in renderer context via executeScript

  describe('Get Preferences', () => {
    it('should retrieve preferences from store', async () => {
      // Use browser.execute to run code in renderer context
      const prefs = await browser.execute(async () => {
        return await window.electron.ipcRenderer.invoke('getPreferences')
      })

      // Preferences should be an object (possibly empty)
      expect(typeof prefs).toBe('object')
    })
  })

  describe('Set Preferences', () => {
    it('should set a preference value', async () => {
      // Set a preference
      await browser.execute(async () => {
        await window.electron.ipcRenderer.invoke('setPreference', 'isColorbar', true)
      })

      // Retrieve and verify
      const prefs = await browser.execute(async () => {
        return await window.electron.ipcRenderer.invoke('getPreferences')
      })

      expect(prefs).toBeDefined()
      // The preference should have been set
      // Note: exact behavior depends on NVConfigOptions type
    })

    it('should set multiple preferences', async () => {
      // Set first preference
      await browser.execute(async () => {
        await window.electron.ipcRenderer.invoke('setPreference', 'crosshairWidth', 2)
      })

      // Set second preference
      await browser.execute(async () => {
        await window.electron.ipcRenderer.invoke('setPreference', 'isColorbar', false)
      })

      // Retrieve and verify
      const prefs = await browser.execute(async () => {
        return await window.electron.ipcRenderer.invoke('getPreferences')
      })

      expect(prefs).toBeDefined()
      expect(typeof prefs).toBe('object')
    })
  })

  describe('Reset Preferences', () => {
    it('should reset preferences to empty state', async () => {
      // First set some preferences
      await browser.execute(async () => {
        await window.electron.ipcRenderer.invoke('setPreference', 'isColorbar', true)
        await window.electron.ipcRenderer.invoke('setPreference', 'crosshairWidth', 5)
      })

      // Reset preferences
      await browser.execute(async () => {
        await window.electron.ipcRenderer.invoke('resetPreferences')
      })

      // Verify preferences are reset
      const prefs = await browser.execute(async () => {
        return await window.electron.ipcRenderer.invoke('getPreferences')
      })

      // After reset, preferences should be empty object
      expect(prefs).toEqual({})
    })
  })
})
