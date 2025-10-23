/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const https = require('https')
const AdmZip = require('adm-zip')

// Base directories
const root = path.resolve(__dirname, '..')
const bins = path.join(root, 'native-binaries')
const platform = process.platform

// Map each platform to its ZIP name and target executable
// These names match upstream dcm2niix release assets.
const assetMap = {
  darwin: { dir: 'darwin', zip: 'dcm2niix_mac.zip', exe: 'dcm2niix' },
  linux:  { dir: 'linux',  zip: 'dcm2niix_lnx.zip',   exe: 'dcm2niix' },
  win32:  { dir: 'win32',  zip: 'dcm2niix_win.zip',   exe: 'dcm2niix.exe' },
}

// Abort if unsupported
if (!assetMap[platform]) {
  console.log(`Unknown platform '${platform}', skipping dcm2niix fetch.`)
  process.exit(0)
}

const { dir, zip, exe } = assetMap[platform]
const platDir = path.join(bins, dir)
const zipPath = path.join(bins, zip)
const exePath = path.join(platDir, exe)

// Ensure directories exist
;[bins, platDir].forEach(dirPath => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
})

// Exit if already present
if (fs.existsSync(exePath)) {
  console.log(`✔️ dcm2niix already present at ${exePath}`)
  process.exit(0)
}

console.log(`🛠  Downloading dcm2niix (${platform})…`)

// Helper: follow redirects up to max
function fetchUrl(url, options, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error('Too many redirects'))
    https.get(url, options, res => {
      const { statusCode, headers } = res
      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume()
        return resolve(fetchUrl(headers.location, options, maxRedirects - 1))
      }
      if (statusCode !== 200) {
        res.resume()
        return reject(new Error(`Request Failed. Status Code: ${statusCode}`))
      }
      resolve(res)
    }).on('error', reject)
  })
}

// Step 1: Get latest release tag via GitHub API
async function getLatestTag() {
  const options = {
    hostname: 'api.github.com',
    path: '/repos/rordenlab/dcm2niix/releases/latest',
    headers: { 'User-Agent': 'node.js', 'Accept': 'application/vnd.github.v3+json' }
  }
  const res = await fetchUrl(`https://${options.hostname}${options.path}`, options)
  return new Promise((resolve, reject) => {
    let data = ''
    res.on('data', chunk => data += chunk)
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
    console.log('📦 Extracting dcm2niix…')
    const zipObj = new AdmZip(zipPath)
    zipObj.extractAllTo(platDir, true)
    fs.unlinkSync(zipPath)
    if (platform !== 'win32') fs.chmodSync(exePath, 0o755)
    console.log(`✅ ${exe} ready at ${platDir}`)
  } catch (err) {
    console.error('❌ Error fetching/extracting dcm2niix:', err)
    process.exit(1)
  }
}

// Orchestrator
;(async () => {
  try {
    const tag = await getLatestTag()
    const downloadUrl = `https://github.com/rordenlab/dcm2niix/releases/download/${tag}/${zip}`
    await downloadAndExtract(downloadUrl)
  } catch (err) {
    console.error('❌ Setup failed:', err)
    process.exit(1)
  }
})()
