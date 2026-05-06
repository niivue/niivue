describe('File Loading', () => {
  it('should load standard MNI152 volume via IPC', async () => {
    // Send loadStandard event to renderer
    await browser.electron.execute((electron, filename) => {
      const win = electron.BrowserWindow.getAllWindows()[0]
      win.webContents.send('loadStandard', filename)
    }, 'mni152.nii.gz')

    // Wait for volume to load
    await browser.pause(3000)

    // Verify canvas is still displayed (basic check that app didn't crash)
    const canvas = await $('[data-testid="viewer-canvas"]')
    await canvas.waitForDisplayed({ timeout: 5000 })
    expect(await canvas.isDisplayed()).toBe(true)

    // Visual regression test - compare against baseline
    // Allow up to 10% difference to account for GPU-specific WebGL rendering variations
    const result = await browser.checkScreen('mni152-volume')
    expect(result).toBeLessThanOrEqual(10)
  })

  it('should load standard mesh (AAL atlas) via IPC', async () => {
    await browser.electron.execute((electron, filename) => {
      const win = electron.BrowserWindow.getAllWindows()[0]
      win.webContents.send('loadStandard', filename)
    }, 'aal.mz3')

    // The previous test left MNI152 loaded, so loadStandard now prompts via
    // OpenTargetDialog. Choose "New Document" to load the mesh into a fresh
    // tab — this matches what the visual baseline was captured against.
    const newDocButton = await $('button=New Document')
    await newDocButton.waitForClickable({ timeout: 5000 })
    await newDocButton.click()

    // Wait for mesh to load
    await browser.pause(3000)

    // Check canvas exists and verify app didn't crash
    const canvas = await $('[data-testid="viewer-canvas"]')
    await canvas.waitForExist({ timeout: 5000 })
    expect(await canvas.isExisting()).toBe(true)

    // Visual regression test - compare against baseline
    // Mesh rendering varies more across GPUs than volume rendering (lighting,
    // anti-aliasing on curved surfaces), so use a looser tolerance here.
    const result = await browser.checkScreen('aal-mesh')
    expect(result).toBeLessThanOrEqual(20)
  })
})
