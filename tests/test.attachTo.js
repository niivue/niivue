const { snapshot, httpServerAddress } = require("./helpers")
beforeEach(async () => {
  await page.goto(httpServerAddress, {timeout:0})
  await page.setViewport({width: 1440, height: 900, deviceScaleFactor: 1});
})
test('attachTo', async () => {
  let nv = await page.evaluate(async () => {
    nv = new niivue.Niivue()
    nv = await nv.attachTo('gl')
    return nv;
  })
  expect(nv.gl).toBeDefined()
  await snapshot()
})