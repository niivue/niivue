const { snapshot, httpServerAddress } = require('./helpers')

beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 })
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
})
test('loadPreviews', async () => {
  const loadedDocuments = await page.evaluate(async () => {
    const documents = []
    const documentUrls = [
      './images/document/niivue.basic.nvd',
      './images/document/niivue.drawing.nvd',
      './images/document/niivue.mesh.nvd'
    ]
    for (const documentUrl of documentUrls) {
      const doc = await niivue.NVDocument.loadFromUrl(documentUrl)
      documents.push(doc)
    }
    return documents
  })
  expect(loadedDocuments.length).toBe(3)
})
