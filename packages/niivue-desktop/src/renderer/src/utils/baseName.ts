export const baseName = (path: string): string => {
  if (!path) {
    return ''
  }
  const pathSep = path.includes('/') ? '/' : '\\'
  const parts = path.split(pathSep)
  return parts[parts.length - 1]
}
