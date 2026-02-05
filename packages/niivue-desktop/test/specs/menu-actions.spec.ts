describe('Menu Actions', () => {
  // Helper to load a volume and wait for render
  async function loadStandard(filename: string): Promise<void> {
    await browser.electron.execute(
      (electron, file) => {
        const win = electron.BrowserWindow.getAllWindows()[0]
        win.webContents.send('loadStandard', file)
      },
      filename
    )
    await browser.pause(3000)

    // Wait for canvas to be ready
    const canvas = await $('[data-testid="viewer-canvas"]')
    await canvas.waitForDisplayed({ timeout: 10000 })
  }

  describe('Load and Clear Scene', () => {
    it('should load chris_t1 and clear scene', async () => {
      // Load a volume
      await loadStandard('chris_t1.nii.gz')

      // Verify canvas is displayed
      const canvas = await $('[data-testid="viewer-canvas"]')
      expect(await canvas.isDisplayed()).toBe(true)

      // Visual regression for chris_t1
      const loadResult = await browser.checkScreen('standard-chris-t1')
      expect(loadResult).toBeLessThanOrEqual(10)

      // Clear the scene
      await browser.electron.execute((electron) => {
        const win = electron.BrowserWindow.getAllWindows()[0]
        win.webContents.send('clear-scene')
      })
      await browser.pause(1000)

      // Canvas should still exist
      expect(await canvas.isDisplayed()).toBe(true)

      // Visual regression - empty scene
      const clearResult = await browser.checkScreen('scene-cleared')
      expect(clearResult).toBeLessThanOrEqual(10)
    })
  })

  describe('Panel Tabs', () => {
    before(async () => {
      await loadStandard('mni152.nii.gz')
    })

    it('should open Volume panel tab', async () => {
      await browser.electron.execute((electron) => {
        const win = electron.BrowserWindow.getAllWindows()[0]
        win.webContents.send('open-right-panel-tab', 'volume')
      })
      await browser.pause(500)

      // Just verify app didn't crash
      const sidebar = await $('[data-testid="sidebar"]')
      expect(await sidebar.isDisplayed()).toBe(true)
    })

    it('should hide right panel', async () => {
      await browser.electron.execute((electron) => {
        const win = electron.BrowserWindow.getAllWindows()[0]
        win.webContents.send('hide-right-panel')
      })
      await browser.pause(500)

      const sidebar = await $('[data-testid="sidebar"]')
      expect(await sidebar.isDisplayed()).toBe(true)
    })
  })
})
