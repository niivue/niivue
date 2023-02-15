const { toMatchImageSnapshot } = require("jest-image-snapshot");
expect.extend({ toMatchImageSnapshot });

async function snapshot(id = "#gl", failureThreshold = 0.1) {
  // await page.waitForSelector('#gl');          // Method to ensure that the element is loaded
  await page.waitForTimeout(1000); // wait a little longer to ensure image loaded (some images were not loading in time)
  const canvas = await page.$(id);
  const image = await canvas.screenshot();

  expect(image).toMatchImageSnapshot({
    failureThreshold: failureThreshold,
    failureThresholdType: "percent",
  });
}

function seconds(n) {
  return 1000 * n;
}

module.exports.httpServerAddress = "http://localhost:8888/tests/index.html";
module.exports.httpServerAddressSync = "http://localhost:8888/tests/sync.html";
module.exports.httpServerAddressDemos = "http://localhost:8888/demos/features/";
module.exports.snapshot = snapshot;
module.exports.seconds = seconds;
