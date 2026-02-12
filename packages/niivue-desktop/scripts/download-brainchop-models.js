/**
 * Script to download brainchop MeshNet models from neuroneural/brainchop-models on GitHub
 * Run with: node scripts/download-brainchop-models.js
 */

import { promises as fs } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/neuroneural/brainchop-models/main'

// Models to download from the meshnet/ directory of the neuroneural repo.
// Native MeshNet format models have model.json (layer specs) + model.bin (weights).
// TF.js format models have model.json (Keras topology + weightsManifest) + weight bin file.
const MODEL_FILES = {
  'model5_gw_ae': ['model.json', 'model.bin', 'colormap.json'],
  'model11_gw_ae': ['model.json', 'model.bin'],
  'model18cls': ['model.json', 'model.bin', 'colormap.json'],
  'model20chan3cls': ['model.json', 'model.bin', 'colormap.json'],
  'model21_104class': ['model.json', 'model.bin', 'colormap.json'],
  'model30chan18cls': ['model.json', 'model.bin', 'colormap.json'],
  'model30chan50cls': ['model.json', 'model.bin', 'colormap.json']
}

// model11_gw_ae's model.json weightsManifest references 'group1-shard1of1.bin',
// but the neuroneural repo stores the file as 'model.bin'. Rename after download.
const RENAME_AFTER_DOWNLOAD = {
  'model11_gw_ae': { 'model.bin': 'group1-shard1of1.bin' }
}

async function downloadFile(url, destPath) {
  console.log(`  Downloading: ${url}`)

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // Create directory if it doesn't exist
    await fs.mkdir(dirname(destPath), { recursive: true })

    // Get file as buffer and write to disk
    const buffer = Buffer.from(await response.arrayBuffer())
    await fs.writeFile(destPath, buffer)

    const sizeMB = (buffer.length / 1024 / 1024).toFixed(2)
    console.log(`  \u2713 Saved: ${destPath} (${sizeMB} MB)`)

    return true
  } catch (error) {
    console.error(`  \u2717 Failed: ${error.message}`)
    return false
  }
}

async function downloadModel(modelId, files) {
  console.log(`\nDownloading model: ${modelId}`)

  // Files are under meshnet/ in the neuroneural repo but stored flat locally
  const baseDir = join(__dirname, '..', 'resources', 'brainchop-models', modelId)

  let successCount = 0
  let failCount = 0

  for (const file of files) {
    const url = `${GITHUB_RAW_BASE}/meshnet/${modelId}/${file}`
    const destPath = join(baseDir, file)

    const success = await downloadFile(url, destPath)
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }

  // Rename files if needed (e.g. model.bin -> group1-shard1of1.bin)
  const renames = RENAME_AFTER_DOWNLOAD[modelId]
  if (renames) {
    for (const [from, to] of Object.entries(renames)) {
      const fromPath = join(baseDir, from)
      const toPath = join(baseDir, to)
      await fs.rename(fromPath, toPath)
      console.log(`  Renamed: ${from} -> ${to}`)
    }
  }

  return { successCount, failCount, total: files.length }
}

async function main() {
  console.log('Brainchop Model Downloader')
  console.log('===========================')
  console.log(`Downloading from: ${GITHUB_RAW_BASE}/meshnet/`)
  console.log(`Target directory: resources/brainchop-models/`)

  let totalSuccess = 0
  let totalFail = 0
  let totalFiles = 0

  // Download all models
  for (const [modelId, files] of Object.entries(MODEL_FILES)) {
    const result = await downloadModel(modelId, files)
    totalSuccess += result.successCount
    totalFail += result.failCount
    totalFiles += result.total
  }

  // Summary
  console.log('\n===========================')
  console.log('Download Summary:')
  console.log(`  Total files: ${totalFiles}`)
  console.log(`  Successful: ${totalSuccess}`)
  console.log(`  Failed: ${totalFail}`)

  if (totalFail === 0) {
    console.log('\n\u2713 All models downloaded successfully!')
    console.log('\nNext steps:')
    console.log('1. Run "npm run build" to build the application')
    console.log('2. The models will be bundled into the Electron app')
  } else {
    console.error('\n\u2717 Some downloads failed. Please check the errors above.')
    process.exit(1)
  }
}

main().catch(console.error)
