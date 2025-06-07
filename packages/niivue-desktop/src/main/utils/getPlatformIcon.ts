import { nativeImage } from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'

// This will be replaced with a string path at build time by Vite
import devIconPath from '../../../resources/icons/app_icon.png?asset'

export function getPlatformIcon(): string | Electron.NativeImage {
  if (is.dev) {
    // In dev, use the asset-resolved PNG for all platforms
    return nativeImage.createFromPath(devIconPath)
  }

  // In production
  const base = path.join(__dirname, '../../resources')

  if (process.platform === 'darwin') {
    return path.join(base, 'icon.icns')
  }

  if (process.platform === 'win32') {
    return path.join(base, 'icon.ico')
  }

  // Linux or fallback
  return path.join(base, 'icon.png')
}
