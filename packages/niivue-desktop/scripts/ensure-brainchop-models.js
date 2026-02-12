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
  'model5_gw_ae',
  'model11_gw_ae',
  'model18cls',
  'model20chan3cls',
  'model21_104class',
  'model30chan18cls',
  'model30chan50cls'
]

async function checkModelExists(modelId) {
  const modelDir = join(__dirname, '..', 'resources', 'brainchop-models', modelId)

  try {
    // Check if model.json exists (the minimum required file)
    const modelJsonPath = join(modelDir, 'model.json')
    await fs.access(modelJsonPath)
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
    console.log('\u2713 All brainchop models are already downloaded')
    return
  }

  console.log('\u2717 Some brainchop models are missing')
  console.log('Downloading brainchop models...')

  // Run the download script
  const result = spawnSync('node', [join(__dirname, 'download-brainchop-models.js')], {
    stdio: 'inherit',
    shell: true
  })

  if (result.status !== 0) {
    console.error('\u2717 Failed to download brainchop models')
    process.exit(1)
  }

  console.log('\u2713 Brainchop models are ready')
}

main().catch((error) => {
  console.error('Error ensuring brainchop models:', error)
  process.exit(1)
})
