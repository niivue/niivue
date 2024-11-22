export interface NiivueTestOptions {
  isAntiAlias: boolean
  isHighResolutionCapable: boolean
  thumbnail?: string
}

export interface FilePath {
  filePath: string
}

export type NiivueTestOptionsFilePath = NiivueTestOptions & FilePath

export const TEST_OPTIONS: NiivueTestOptions = {
  isAntiAlias: false,
  isHighResolutionCapable: false
}
