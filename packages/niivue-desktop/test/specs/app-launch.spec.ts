describe('Application Launch', () => {
  it('should open the main window', async () => {
    const title = await browser.getTitle()
    expect(title).toContain('NiiVue')
  })

  it('should have the root element', async () => {
    const root = await $('#root')
    expect(await root.isDisplayed()).toBe(true)
  })

  it('should have a canvas element for WebGL rendering', async () => {
    const canvas = await $('canvas')
    expect(await canvas.isDisplayed()).toBe(true)
  })

  it('should have the sidebar', async () => {
    const sidebar = await $('[data-testid="sidebar"]')
    expect(await sidebar.isDisplayed()).toBe(true)
  })

  it('should have the tab bar', async () => {
    const tabBar = await $('[data-testid="tab-bar"]')
    expect(await tabBar.isDisplayed()).toBe(true)
  })

  it('should have a new tab button', async () => {
    const newTabButton = await $('[data-testid="new-tab-button"]')
    expect(await newTabButton.isDisplayed()).toBe(true)
  })
})
