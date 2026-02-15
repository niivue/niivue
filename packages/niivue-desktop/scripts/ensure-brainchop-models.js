/**
 * Ensures brainchop models are downloaded before building
 * Similar to ensure-niimath.cjs and ensure-dcm2niix.cjs
 */

import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const REQUIRED_MODELS = [
  'tissue-seg-light',
  'tissue-seg-full',
  'brain-extract-light',
  'brain-extract-full',
  'parcellation-50',
  'parcellation-104'
]

const REQUIRED_FILES_PER_MODEL = ['model.json', 'labels.json', 'settings.json', 'preview.png']

async function checkModelExists(modelId) {
  const modelDir = join(__dirname, '..', 'resources', 'brainchop-models', modelId)

  try {
    // Check if all required files exist
    for (const file of REQUIRED_FILES_PER_MODEL) {
      const filePath = join(modelDir, file)
      await fs.access(filePath)
    }
    return true
  } catch {
    return false
  }
}

async function checkAllModels() {
  const results = await Promise.all(REQUIRED_MODELS.map(checkModelExists))
  return results.every((exists) => exists)
}

async function main() {
  console.log('Checking for brainchop models...')

  const allModelsExist = await checkAllModels()

  if (allModelsExist) {
    console.log('✓ All brainchop models are already downloaded')
    return
  }

  console.log('✗ Some brainchop models are missing')
  console.log('Downloading brainchop models...')

  // Run the download script
  const result = spawnSync('node', [join(__dirname, 'download-brainchop-models.js')], {
    stdio: 'inherit',
    shell: true
  })

  if (result.status !== 0) {
    console.error('✗ Failed to download brainchop models')
    process.exit(1)
  }

  console.log('✓ Brainchop models are ready')
}

main().catch((error) => {
  console.error('Error ensuring brainchop models:', error)
  process.exit(1)
})
