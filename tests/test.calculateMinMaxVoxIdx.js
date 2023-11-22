const { snapshot, httpServerAddress, seconds } = require('./helpers')
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 })
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
})
test('calculateMinMaxVoxIdx', async () => {
  const minmax = await page.evaluate(() => {
    const nv = new niivue.Niivue()
    const minmax = nv.calculateMinMaxVoxIdx([10, 1])
    return minmax
  })
  expect(minmax).toEqual([1, 10])
})
