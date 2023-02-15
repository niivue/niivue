const { httpServerAddressDemos } = require("./helpers");
const fs = require("fs");

let files = fs.readdirSync("./demos/features");
// list files in directory that end with .html
files = files.filter((file) => file.endsWith(".html"));
// now list only file that start with mesh.
files = files.filter((file) => file.startsWith("mesh."));

test.each(files)("mesh_demos_%s", async (file) => {
  await page.goto(`${httpServerAddressDemos}${file}`, { timeout: 5000 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.waitForTimeout(2000);
  const image = await page.screenshot();
  expect(image).toMatchImageSnapshot({
    failureThreshold: 0.1,
    failureThresholdType: "percent",
  });
});
