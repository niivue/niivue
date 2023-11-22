const { snapshot, httpServerAddress, seconds } = require('./helpers')
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 })
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
})
test('arrayEquals', async () => {
  const val = await page.evaluate(() => {
    const nv = new niivue.Niivue()
    const arreq = nv.arrayEquals([1, 2, 3], [1, 2, 3])
    return arreq
  })
  await expect(val).toBeTruthy()
})
