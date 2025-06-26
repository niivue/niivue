// scripts/custom-sign.cjs
const { sign } = require('electron-osx-sign')

module.exports = async function (context) {
  console.log('✅ Custom signing script running...')
  const { appOutDir } = context

  await sign({
    app: `${appOutDir}/niivue-desktop.app`,
    identity: 'Your Team ID or Identity',
    hardenedRuntime: true,
    entitlements: 'build/entitlements.mac.plist',
    'gatekeeper-assess': false,
    binaries: [`${appOutDir}/niivue-desktop.app/Contents/MacOS/niivue-desktop`],
    preAutoEntitlements: false,
    preEmbedProvisioningProfile: false
  })
}
