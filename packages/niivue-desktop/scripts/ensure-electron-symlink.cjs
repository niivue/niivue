/**
 * Ensures the electron binary is accessible in the package's node_modules/.bin.
 *
 * In npm workspaces, electron is hoisted to the root node_modules but
 * wdio-electron-service looks for it in the package's local
 * node_modules/.bin/electron. This script creates a symlink (macOS/Linux)
 * or batch shim (Windows) so the desktop e2e tests can find the binary.
 */
const fs = require('fs')
const path = require('path')

const pkgDir = path.resolve(__dirname, '..')
const localBin = path.join(pkgDir, 'node_modules', '.bin')
const localElectron = path.join(localBin, 'electron')

// Already exists — nothing to do
if (fs.existsSync(localElectron)) {
  console.log('[ensure-electron-symlink] electron binary already accessible')
  process.exit(0)
}

// Walk up to find the hoisted electron
function findHoistedElectron() {
  let dir = pkgDir
  while (true) {
    const candidate = path.join(dir, 'node_modules', '.bin', 'electron')
    if (fs.existsSync(candidate)) {
      return candidate
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

const hoisted = findHoistedElectron()
if (!hoisted) {
  console.error('[ensure-electron-symlink] Could not find electron in any parent node_modules.')
  console.error('Run "npm install" from the repository root first.')
  process.exit(1)
}

fs.mkdirSync(localBin, { recursive: true })

if (process.platform === 'win32') {
  // On Windows, create a cmd shim
  const target = fs.realpathSync(hoisted)
  fs.writeFileSync(localElectron + '.cmd', `@"${target}" %*\r\n`)
  console.log(`[ensure-electron-symlink] Created Windows shim -> ${target}`)
} else {
  fs.symlinkSync(hoisted, localElectron)
  console.log(`[ensure-electron-symlink] Symlinked ${localElectron} -> ${hoisted}`)
}
