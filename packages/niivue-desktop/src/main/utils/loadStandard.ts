import { readFile } from 'fs/promises'
import volumeMni152 from '../../../resources/images/standard/mni152.nii.gz?asset'
import volumeChrisT1 from '../../../resources/images/standard/chris_t1.nii.gz?asset'
import meshaal from '../../../resources/images/standard/aal.mz3?asset'
import volaal from '../../../resources/images/standard/aal.nii.gz?asset'
import ICBM152LH from '../../../resources/images/standard/ICBM152.lh.mz3?asset'
import ICBM152LHMotor from '../../../resources/images/standard/ICBM152.lh.motor.mz3?asset'
import motorOverlay from '../../../resources/images/standard/Motor_Overlay.nvd?asset'

// https://electron-vite.org/guide/assets#importing-json-file-as-file-path
import jsonaal from '../../../resources/images/standard/aal.json?commonjs-external&asset'
import { store } from './appStore.js'

// read a known standard file and return it as a base64 string
export const readStandardFile = async (path: string): Promise<string> => {
  let standardFilePath = ''
  switch (path) {
    case 'mni152.nii.gz':
      standardFilePath = volumeMni152
      break
    case 'chris_t1.nii.gz':
      standardFilePath = volumeChrisT1
      break
    case 'aal.mz3':
      standardFilePath = meshaal
      break
    case 'ICBM152.lh.mz3':
      standardFilePath = ICBM152LH
      break
    case 'ICBM152.lh.motor.mz3':
      standardFilePath = ICBM152LHMotor
      break
    case 'aal.nii.gz':
      standardFilePath = volaal
      break
    case 'aal.json':
      standardFilePath = jsonaal
      break
    case 'Motor_Overlay.nvd':
      standardFilePath = motorOverlay
      break
    default:
      break
  }
  try {
    console.log('loading standard file', standardFilePath)
    const data = Buffer.from(await readFile(standardFilePath))
    const base64 = data.toString('base64')
    store.addRecentFile(standardFilePath)
    return base64
  } catch (error) {
    console.error(error)
    return ''
  }
}

// the ipc handler is separate so that loadStandard can be called separately from the handler if needed
export const loadStandardHandler = async (_: unknown, path: string): Promise<string> => {
  try {
    const base64 = await readStandardFile(path)
    return base64
  } catch (error) {
    console.error(error)
    return ''
  }
}
