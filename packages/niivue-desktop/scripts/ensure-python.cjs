// packages/niivue-desktop/scripts/ensure-python.cjs
const fs = require('fs')
const path = require('path')
const https = require('https')
const { execSync } = require('child_process')

// Base directories
const root = path.resolve(__dirname, '..')
const bins = path.join(root, 'native-binaries')
const platform = process.platform
const arch = process.arch

// Pinned python-build-standalone release
const PYTHON_VERSION = '3.12.8'
const PBS_TAG = '20250106'

// Map platform+arch to python-build-standalone triple
const assetMap = {
  'darwin-arm64': { dir: 'darwin', triple: 'aarch64-apple-darwin' },
  'darwin-x64':  { dir: 'darwin', triple: 'x86_64-apple-darwin' },
  'linux-x64':   { dir: 'linux',  triple: 'x86_64-unknown-linux-gnu' },
  'win32-x64':   { dir: 'win32',  triple: 'x86_64-pc-windows-msvc' },
}

const key = `${platform}-${arch}`
if (!assetMap[key]) {
  console.log(`Unknown platform/arch '${key}', skipping Python fetch.`)
  process.exit(0)
}

const { dir, triple } = assetMap[key]
const tarballName = `cpython-${PYTHON_VERSION}+${PBS_TAG}-${triple}-install_only.tar.gz`
const platDir = path.join(bins, dir)
const pythonDir = path.join(platDir, 'python')
const installDir = path.join(pythonDir, 'install')
const tarballPath = path.join(bins, tarballName)

// Check if already present
const pythonBin = platform === 'win32'
  ? path.join(installDir, 'bin', 'python.exe')
  : path.join(installDir, 'bin', 'python3')

if (fs.existsSync(pythonBin)) {
  console.log(`\u2714\uFE0F Python already present at ${pythonBin}`)
  // Check if pyniivue is installed
  try {
    execSync(`"${pythonBin}" -c "import pyniivue"`, { stdio: 'pipe' })
    console.log('\u2714\uFE0F pyniivue already installed')
    process.exit(0)
  } catch {
    console.log('pyniivue not yet installed, will install...')
    installPyniivue()
    process.exit(0)
  }
}

console.log(`\uD83D\uDEE0  Downloading Python ${PYTHON_VERSION} (${key})...`)

// Helper: follow redirects
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

async function downloadAndExtract(url) {
  // Ensure directories exist
  ;[bins, platDir, pythonDir].forEach(dirPath => {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
  })

  const res = await fetchUrl(url, {})
  const file = fs.createWriteStream(tarballPath)
  await new Promise((resolve, reject) => {
    res.pipe(file).on('finish', resolve).on('error', reject)
  })

  console.log('\uD83D\uDCE6 Extracting Python...')
  // Extract tarball — python-build-standalone tarballs contain an 'install/' directory at the root
  execSync(`tar xzf "${tarballPath}" -C "${pythonDir}"`, { stdio: 'inherit' })
  fs.unlinkSync(tarballPath)

  if (platform !== 'win32') {
    fs.chmodSync(pythonBin, 0o755)
  }
  console.log(`\u2705 Python ready at ${installDir}`)
}

function installPyniivue() {
  const pip = platform === 'win32'
    ? path.join(installDir, 'bin', 'pip.exe')
    : path.join(installDir, 'bin', 'pip3')

  console.log('\uD83D\uDCE6 Installing websocket-client...')
  execSync(`"${pythonBin}" -m pip install "websocket-client>=1.0.0"`, {
    stdio: 'inherit',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }
  })

  console.log('\uD83D\uDCE6 Installing pyniivue...')
  const pyniivueDir = path.join(root, 'python')
  execSync(`"${pythonBin}" -m pip install -e "${pyniivueDir}"`, {
    stdio: 'inherit',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }
  })

  console.log('\u2705 pyniivue installed')
}

// Orchestrator
;(async () => {
  try {
    // The '+' in the filename must be URL-encoded as %2B
    const encodedTarball = tarballName.replace('+', '%2B')
    const downloadUrl = `https://github.com/astral-sh/python-build-standalone/releases/download/${PBS_TAG}/${encodedTarball}`
    await downloadAndExtract(downloadUrl)
    installPyniivue()
  } catch (err) {
    console.error('\u274C Setup failed:', err)
    process.exit(1)
  }
})()
