const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const electronPath = path.join('node_modules', 'electron', 'dist')
const helperNames = [
  'helper',
  'helper (GPU)',
  'helper (Renderer)',
  'helper (Plugin)',
]

for (const name of helperNames) {
  const binary = `Electron ${name}`
  const fullPath = path.join(electronPath, binary)
  if (fs.existsSync(fullPath)) {
    try {
      const tempPath = `${fullPath}-cleaned`
      execSync(`ditto --norsrc "${fullPath}" "${tempPath}"`)
      fs.renameSync(tempPath, fullPath)
      console.log(`🧼 Cleaned Electron binary: ${binary}`)
    } catch (e) {
      console.warn(`⚠️ Failed to clean ${binary}: ${e.message}`)
    }
  }
}
