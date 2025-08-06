import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

export default async function (context) {
  if (process.platform !== 'darwin') {
    console.log('skip clean-xattrs (not mac):', process.platform)
    return
  }
  
  const gpuHelperBinary = path.join(
    context.appOutDir,
    'niivue-desktop.app',
    'Contents/Frameworks/niivue-desktop Helper (GPU).app',
    'Contents/MacOS',
    'niivue-desktop Helper (GPU)'
  )

  console.log(`🧹 Cleaning xattrs from GPU Helper binary`)

  try {
    // Remove all
    execSync(`xattr -c "${gpuHelperBinary}"`)

    // Explicitly delete problematic ones
    execSync(`xattr -d com.apple.provenance "${gpuHelperBinary}"`, { stdio: 'ignore' })
  } catch (err) {
    console.warn(`⚠️  xattr cleanup warning:`, err.message)
  }

  // Confirm clean
  const remaining = execSync(`xattr "${gpuHelperBinary}"`).toString().trim()
  if (remaining.length > 0) {
    console.warn(`⚠️  Still present:\n${remaining}`)
  } else {
    console.log(`✅ Binary xattrs clean`)
  }
}
