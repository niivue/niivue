describe('View Modes', () => {
  // Helper to load MNI152 and wait for render
  async function loadMNI152(): Promise<void> {
    await browser.electron.execute(
      (electron, filename) => {
        const win = electron.BrowserWindow.getAllWindows()[0]
        win.webContents.send('loadStandard', filename)
      },
      'mni152.nii.gz'
    )
    await browser.pause(3000)

    // Wait for canvas to be ready
    const canvas = await $('[data-testid="viewer-canvas"]')
    await canvas.waitForDisplayed({ timeout: 10000 })
  }

  // Helper to set slice type via IPC
  async function setSliceType(sliceTypeName: string): Promise<void> {
    await browser.electron.execute(
      (electron, name) => {
        const win = electron.BrowserWindow.getAllWindows()[0]
        win.webContents.send('setSliceType', name)
      },
      sliceTypeName
    )
    await browser.pause(1500) // Wait for render
  }

  describe('Slice Type Switching', () => {
    // Load once at the start of this suite
    before(async () => {
      await loadMNI152()
    })

    it('should display Sagittal view', async () => {
      await setSliceType('sagittal')

      // Visual regression test
      const result = await browser.checkScreen('slice-type-sagittal')
      expect(result).toBeLessThanOrEqual(10)
    })

    it('should display Coronal view', async () => {
      await setSliceType('coronal')

      const result = await browser.checkScreen('slice-type-coronal')
      expect(result).toBeLessThanOrEqual(10)
    })

    it('should display Axial view', async () => {
      await setSliceType('axial')

      const result = await browser.checkScreen('slice-type-axial')
      expect(result).toBeLessThanOrEqual(10)
    })

    it('should display Multiplanar view', async () => {
      await setSliceType('multiplanar')

      const result = await browser.checkScreen('slice-type-multiplanar')
      expect(result).toBeLessThanOrEqual(10)
    })

    it('should display Mosaic view', async () => {
      await setSliceType('mosaic')

      const result = await browser.checkScreen('slice-type-mosaic')
      expect(result).toBeLessThanOrEqual(10)
    })

    it('should display 3D Render view', async () => {
      await setSliceType('3D Render')

      const result = await browser.checkScreen('slice-type-3d-render')
      expect(result).toBeLessThanOrEqual(10)
    })
  })
})
