#!/usr/bin/env node
import { tiff2niiStack } from './lib/loader.js'
import * as fs from 'fs/promises'
import path from 'path'
import { performance } from 'perf_hooks'

export async function convertTiffToNifti(filePath: string, isVerbose = false) {
  try {
    // Ensure the file exists
    await fs.access(filePath)
    const fileBuffer = await fs.readFile(filePath)
    const startTime = performance.now()

    let { niftiImage, stackConfigs } = await tiff2niiStack(fileBuffer, isVerbose, 0)
    let elapsedTimeStr = ` in ${(performance.now() - startTime).toFixed(2)} ms`

    // Get base filename without extension
    const baseName = path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)))

    if (stackConfigs.length < 2) {
      const outputFilePath = `${baseName}.nii`
      await fs.writeFile(outputFilePath, Buffer.from(niftiImage))
      console.log(`Converted to ${outputFilePath}${elapsedTimeStr}`)
    } else {
      // Handle multiple stacks by saving each stack with an appended name
      for (let i = 0; i < stackConfigs.length; i++) {
        if (i > 0) {
          ;({ niftiImage } = await tiff2niiStack(fileBuffer, isVerbose, i))
        }
        const outputFilePath = `${baseName}_${stackConfigs[i]}.nii`
        await fs.writeFile(outputFilePath, Buffer.from(niftiImage))
        console.log(`Converted to ${outputFilePath}${elapsedTimeStr}`)
        elapsedTimeStr = ''
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error processing ${filePath}: ${error.message}`)
    } else {
      console.error(`Error processing ${filePath}: ${String(error)}`)
    }
  }
}

// Ensure `convertTiffToNifti()` only runs when this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length < 3) {
    console.error('Usage: node tiff2nii.js <path-to-tiff>')
    process.exit(1)
  }
  const filePath = process.argv[2]
  convertTiffToNifti(filePath, true)
}
