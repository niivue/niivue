'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const helpers_1 = require('./helpers')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('nvdocument loadFromUrl load preview', async ({ page }) => {
  await page.evaluate(`async () => {
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

    const demo = document.getElementById('demo')
    if (!demo) {
      throw new Error('could not find demo element')
    }
    demo.style.margin = 'auto'
    demo.style.display = 'flex'
    demo.style.flexDirection = 'column'
    demo.style.alignItems = 'center'

    // get rid of our canvas element for the test
    const gl = document.getElementById('gl')
    if (!gl) {
      throw new Error('could not obtain graphic context')
    }
    gl.remove()
    for (const doc of documents) {
      const img = document.createElement('img')
      img.src = doc.previewImageDataURL
      img.style.height = '150px'
      demo.appendChild(img)
    }    
  }`)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
// # sourceMappingURL=test.nvdocument.loadDocumentFromUrl.spec.js.map
