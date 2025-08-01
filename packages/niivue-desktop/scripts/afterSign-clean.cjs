const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

function cleanWithDitto(filePath) {
  const tempPath = `${filePath}-cleaned`
  try {
    execSync(`ditto --norsrc "${filePath}" "${tempPath}"`)
    fs.renameSync(tempPath, filePath)
    console.log(`🧹 [afterSign] Replaced with cleaned copy: ${filePath}`)
  } catch (err) {
    console.warn(`⚠️ [afterSign] Failed on ${filePath}: ${err.message}`)
    if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { recursive: true, force: true })
  }
}

module.exports = async function (context) {
  if (process.platform !== 'darwin') {
    console.log('skip clean-xattrs (not mac):', process.platform)
    process.exit(0)
  }
  
  const appPath = context.appOutDir
  const appBundle = path.join(appPath, 'niivue-desktop.app')

  const helpers = [
    'niivue-desktop Helper (GPU).app',
    'niivue-desktop Helper (Plugin).app',
    'niivue-desktop Helper (Renderer).app',
    'niivue-desktop Helper.app',
  ]

  for (const helper of helpers) {
    const bin = helper.replace('.app', '')
    const binPath = path.join(appBundle, 'Contents/Frameworks', helper, 'Contents/MacOS', bin)
    if (fs.existsSync(binPath)) cleanWithDitto(binPath)
  }
}
