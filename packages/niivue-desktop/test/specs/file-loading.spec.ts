const screenshotsDir = './test/screenshots'

describe('File Loading', () => {
  it('should load standard MNI152 volume via IPC', async () => {
    // Send loadStandard event to renderer
    await browser.electron.execute(
      (electron, filename) => {
        const win = electron.BrowserWindow.getAllWindows()[0]
        win.webContents.send('loadStandard', filename)
      },
      'mni152.nii.gz'
    )

    // Wait for volume to load
    await browser.pause(3000)

    // Verify canvas is still displayed (basic check that app didn't crash)
    const canvas = await $('[data-testid="viewer-canvas"]')
    await canvas.waitForDisplayed({ timeout: 5000 })
    expect(await canvas.isDisplayed()).toBe(true)

    // Capture screenshot after loading volume
    await browser.saveScreenshot(`${screenshotsDir}/mni152-volume.png`)
  })

  it('should load standard mesh (AAL atlas) via IPC', async () => {
    await browser.electron.execute(
      (electron, filename) => {
        const win = electron.BrowserWindow.getAllWindows()[0]
        win.webContents.send('loadStandard', filename)
      },
      'aal.mz3'
    )

    // Wait for mesh to load
    await browser.pause(3000)

    // Check canvas exists and verify app didn't crash
    const canvas = await $('[data-testid="viewer-canvas"]')
    await canvas.waitForExist({ timeout: 5000 })
    expect(await canvas.isExisting()).toBe(true)

    // Capture screenshot after loading mesh
    await browser.saveScreenshot(`${screenshotsDir}/aal-mesh.png`)
  })
})
