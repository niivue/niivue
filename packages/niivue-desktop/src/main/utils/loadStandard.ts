import { readFile } from 'fs/promises'
import { app } from 'electron'
import volumeMni152 from '../../../resources/images/standard/mni152.nii.gz?asset'
import meshaal from '../../../resources/images/standard/aal.mz3?asset'

// Function to handle reading a file from disk given a path
export const loadStandard = async (_: unknown, path: string): Promise<string> => {
  let standardFilePath = ''
  switch (path) {
    case 'mni152.nii.gz':
      standardFilePath = volumeMni152
      break
    case 'aal.mz3':
      standardFilePath = meshaal
      break
    default:
      break
  }
  try {
    const data = Buffer.from(await readFile(standardFilePath))
    const base64 = data.toString('base64')
    app.addRecentDocument(standardFilePath)
    return base64
  } catch (error) {
    console.error(error)
    return ''
  }
}
