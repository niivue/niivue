// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path')

const srcDir = path.join(__dirname, 'playwright', 'e2e')
const destDir = path.join(__dirname, 'playwright', 'tests-out')

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir)
}

fs.readdirSync(srcDir).forEach((file) => {
  if (file.endsWith('.js')) {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file))
  }
})
