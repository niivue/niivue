const { snapshot, httpServerAddress } = require("./helpers");

beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("loadPreviews", async () => {
  let loadedDocuments = await page.evaluate(async () => {
    let documents = [];
    var documentUrls = [
      "./images/document/niivue.basic.nvd",
      "./images/document/niivue.drawing.nvd",
      "./images/document/niivue.mesh.nvd",
    ];
    for (const documentUrl of documentUrls) {
      let doc = await niivue.NVDocument.loadFromUrl(documentUrl);
      documents.push(doc);
    }
    return documents;
  });
  expect(loadedDocuments.length).toBe(3);
});
