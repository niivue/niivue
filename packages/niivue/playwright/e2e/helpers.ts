import { resolve } from 'path'
import { existsSync, mkdirSync } from 'fs'

export const httpServerAddress = 'http://localhost:8888/tests/index.html'
export const httpServerAddressSync = 'http://localhost:8888/tests/sync.html'
export const httpServerAddressFlexbox = 'http://localhost:8888/tests/flexbox.html'
export const httpServerAddressDemos = 'http://localhost:8888/demos/features/'
export const testOptions = {
  isAntiAlias: false,
  forceDevicePixelRatio: -1
}

export const seconds = (n) => 1000 * n
export const ensureDownloadFolder = () => {
  const downloadPath = resolve('./downloads')
  if (!existsSync(downloadPath)) {
    mkdirSync(downloadPath, { recursive: true })
  }
}
