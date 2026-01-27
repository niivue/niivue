/**
 * Script to download brainchop TensorFlow.js models from GitHub
 * Run with: node scripts/download-brainchop-models.js
 */

import { promises as fs } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/neuroneural/brainchop/master/public/models'

// Model mappings: our model ID -> brainchop GitHub model directory
const MODEL_MAPPINGS = {
  'tissue-seg-light': {
    githubDir: 'model5_gw_ae',
    files: ['model.json', 'group1-shard1of1.bin'],
    optionalFiles: ['colormap3.json']
  },
  'tissue-seg-full': {
    githubDir: 'model20chan3cls',
    files: ['model.json', 'model.bin'],
    optionalFiles: ['colormap.json']
  },
  'brain-extract-light': {
    githubDir: 'model5_gw_ae', // Using same as tissue-seg-light (fast model)
    files: ['model.json', 'group1-shard1of1.bin'],
    optionalFiles: ['colormap.json']
  },
  'brain-extract-full': {
    githubDir: 'model11_gw_ae',
    files: ['model.json', 'group1-shard1of1.bin'],
    optionalFiles: ['colormap.json']
  },
  'parcellation-50': {
    githubDir: 'model30chan50cls',
    files: ['model.json', 'model.bin'],
    optionalFiles: ['colormap.json']
  },
  'parcellation-104': {
    githubDir: 'model21_104class',
    files: ['model.json', 'group1-shard1of1.bin'],
    optionalFiles: ['colormap.json']
  }
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
    console.log(`  ✓ Saved: ${destPath} (${sizeMB} MB)`)

    return true
  } catch (error) {
    console.error(`  ✗ Failed: ${error.message}`)
    return false
  }
}

async function downloadModel(modelId, config) {
  console.log(`\nDownloading model: ${modelId}`)
  console.log(`  GitHub directory: ${config.githubDir}`)

  const baseDir = join(__dirname, '..', 'resources', 'brainchop-models', modelId)

  let successCount = 0
  let failCount = 0

  // Download required files
  for (const file of config.files) {
    const url = `${GITHUB_RAW_BASE}/${config.githubDir}/${file}`
    const destPath = join(baseDir, file)

    const success = await downloadFile(url, destPath)
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }

  // Download optional files (don't count failures)
  if (config.optionalFiles) {
    for (const file of config.optionalFiles) {
      const url = `${GITHUB_RAW_BASE}/${config.githubDir}/${file}`
      const destPath = join(baseDir, file)

      const success = await downloadFile(url, destPath)
      if (success) {
        successCount++
      }
      // Don't increment failCount for optional files
    }
  }

  const total = config.files.length + (config.optionalFiles?.length || 0)
  return { successCount, failCount, total }
}

async function createLabelsFiles() {
  console.log('\nCreating label definition files...')

  const labelsDir = join(__dirname, '..', 'resources', 'brainchop-models')

  // Tissue segmentation labels (3 classes)
  const tissueLabels = {
    labels: [
      { value: 0, name: 'Background', color: [0, 0, 0] },
      { value: 1, name: 'Gray Matter', color: [128, 128, 128] },
      { value: 2, name: 'White Matter', color: [255, 255, 255] }
    ]
  }

  // Brain extraction labels (2 classes)
  const brainExtractLabels = {
    labels: [
      { value: 0, name: 'Background', color: [0, 0, 0] },
      { value: 1, name: 'Brain', color: [255, 128, 0] }
    ]
  }

  // Parcellation labels (placeholder - actual labels from colormap.json)
  const parcellation50Labels = {
    labels: Array.from({ length: 51 }, (_, i) => ({
      value: i,
      name: i === 0 ? 'Background' : `Region ${i}`,
      color: [Math.random() * 255, Math.random() * 255, Math.random() * 255]
    }))
  }

  const parcellation104Labels = {
    labels: Array.from({ length: 105 }, (_, i) => ({
      value: i,
      name: i === 0 ? 'Background' : `Region ${i}`,
      color: [Math.random() * 255, Math.random() * 255, Math.random() * 255]
    }))
  }

  // Save labels files
  await fs.writeFile(
    join(labelsDir, 'tissue-seg-light', 'labels.json'),
    JSON.stringify(tissueLabels, null, 2)
  )
  await fs.writeFile(
    join(labelsDir, 'tissue-seg-full', 'labels.json'),
    JSON.stringify(tissueLabels, null, 2)
  )
  await fs.writeFile(
    join(labelsDir, 'brain-extract-light', 'labels.json'),
    JSON.stringify(brainExtractLabels, null, 2)
  )
  await fs.writeFile(
    join(labelsDir, 'brain-extract-full', 'labels.json'),
    JSON.stringify(brainExtractLabels, null, 2)
  )
  await fs.writeFile(
    join(labelsDir, 'parcellation-50', 'labels.json'),
    JSON.stringify(parcellation50Labels, null, 2)
  )
  await fs.writeFile(
    join(labelsDir, 'parcellation-104', 'labels.json'),
    JSON.stringify(parcellation104Labels, null, 2)
  )

  console.log('✓ Created label definition files')
}

async function main() {
  console.log('Brainchop Model Downloader')
  console.log('===========================')
  console.log(`Downloading from: ${GITHUB_RAW_BASE}`)
  console.log(`Target directory: resources/brainchop-models/`)

  let totalSuccess = 0
  let totalFail = 0
  let totalFiles = 0

  // Download all models
  for (const [modelId, config] of Object.entries(MODEL_MAPPINGS)) {
    const result = await downloadModel(modelId, config)
    totalSuccess += result.successCount
    totalFail += result.failCount
    totalFiles += result.total
  }

  // Create label definition files
  await createLabelsFiles()

  // Summary
  console.log('\n===========================')
  console.log('Download Summary:')
  console.log(`  Total files: ${totalFiles}`)
  console.log(`  Successful: ${totalSuccess}`)
  console.log(`  Failed: ${totalFail}`)

  if (totalFail === 0) {
    console.log('\n✓ All models downloaded successfully!')
    console.log('\nNext steps:')
    console.log('1. Run "npm run build" to build the application')
    console.log('2. The models will be bundled into the Electron app')
  } else {
    console.error('\n✗ Some downloads failed. Please check the errors above.')
    process.exit(1)
  }
}

main().catch(console.error)
