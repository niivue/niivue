export interface NiivueTestOptions {
  isAntiAlias: boolean
  forceDevicePixelRatio: number
  thumbnail?: string
}

export interface FilePath {
  filePath: string
}

export type NiivueTestOptionsFilePath = NiivueTestOptions & FilePath

export const TEST_OPTIONS: NiivueTestOptions = {
  isAntiAlias: false,
  forceDevicePixelRatio: 0
}
