// packages/niivue-desktop/scripts/ensure-niimath.cjs
const fs = require('fs')
const path = require('path')
const https = require('https')
const AdmZip = require('adm-zip')

// Base directories
const root = path.resolve(__dirname, '..')
const bins = path.join(root, 'native-binaries')
const platform = process.platform

// Map each platform to its ZIP name and target executable
const assetMap = {
  darwin: { dir: 'darwin', zip: 'niimath_macos.zip', exe: 'niimath' },
  linux: { dir: 'linux', zip: 'niimath_lnx.zip', exe: 'niimath' },
  win32: { dir: 'win32', zip: 'niimath_win.zip', exe: 'niimath.exe' }
}

// Abort if unsupported
if (!assetMap[platform]) {
  console.log(`Unknown platform '${platform}', skipping niimath fetch.`)
  process.exit(0)
}

const { dir, zip, exe } = assetMap[platform]
const platDir = path.join(bins, dir)
const zipPath = path.join(bins, zip)
const exePath = path.join(platDir, exe)

// Ensure directories exist
;[bins, platDir].forEach((dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
})

// Exit if already present
if (fs.existsSync(exePath)) {
  console.log(`✔️ niimath already present at ${exePath}`)
  process.exit(0)
}

console.log(`🛠  Downloading niimath (${platform})…`)

// Helper: follow redirects up to max
function fetchUrl(url, options, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error('Too many redirects'))
    https
      .get(url, options, (res) => {
        const { statusCode, headers } = res
        if (statusCode >= 300 && statusCode < 400 && headers.location) {
          // follow redirect
          res.resume()
          return resolve(fetchUrl(headers.location, options, maxRedirects - 1))
        }
        if (statusCode !== 200) {
          res.resume()
          return reject(new Error(`Request Failed. Status Code: ${statusCode}`))
        }
        resolve(res)
      })
      .on('error', reject)
  })
}

// Step 1: Get latest release tag via GitHub API
async function getLatestTag() {
  const options = {
    hostname: 'api.github.com',
    path: '/repos/rordenlab/niimath/releases/latest',
    headers: { 'User-Agent': 'node.js', Accept: 'application/vnd.github.v3+json' }
  }
  const res = await fetchUrl(`https://${options.hostname}${options.path}`, options)
  return new Promise((resolve, reject) => {
    let data = ''
    res.on('data', (chunk) => (data += chunk))
    res.on('end', () => {
      try {
        resolve(JSON.parse(data).tag_name)
      } catch (e) {
        reject(e)
      }
    })
    res.on('error', reject)
  })
}

// Step 2: Download and extract ZIP
async function downloadAndExtract(url) {
  try {
    const res = await fetchUrl(url, {})
    const file = fs.createWriteStream(zipPath)
    await new Promise((resolve, reject) => {
      res.pipe(file).on('finish', resolve).on('error', reject)
    })
    console.log('📦 Extracting niimath…')
    const zipObj = new AdmZip(zipPath)
    zipObj.extractAllTo(platDir, true)
    fs.unlinkSync(zipPath)
    if (platform !== 'win32') fs.chmodSync(exePath, 0o755)
    console.log(`✅ ${exe} ready at ${platDir}`)
  } catch (err) {
    console.error('❌ Error fetching/extracting niimath:', err)
    process.exit(1)
  }
}

// Orchestrator
;(async () => {
  try {
    const tag = await getLatestTag()
    const downloadUrl = `https://github.com/rordenlab/niimath/releases/download/${tag}/${zip}`
    await downloadAndExtract(downloadUrl)
  } catch (err) {
    console.error('❌ Setup failed:', err)
    process.exit(1)
  }
})()
