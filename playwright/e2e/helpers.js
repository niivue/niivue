const path = require("path");
const fs = require("fs");

function seconds(n) {
  return 1000 * n;
}

function ensureDownloadFolder() {
  const downloadPath = path.resolve('./downloads');
  if (!fs.existsSync(downloadPath)){
    fs.mkdirSync(downloadPath, { recursive: true });
}
}

module.exports.httpServerAddress = "http://localhost:8888/tests/index.html";
module.exports.httpServerAddressSync = "http://localhost:8888/tests/sync.html";
module.exports.httpServerAddressDemos = "http://localhost:8888/demos/features/";
module.exports.seconds = seconds;
module.exports.ensureDownloadFolder = ensureDownloadFolder;
