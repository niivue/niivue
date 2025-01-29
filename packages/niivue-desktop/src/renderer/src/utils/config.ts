// Utility to filter valid enum key-value pairs
export const filterEnum = (enumObj: object): Record<string, number> =>
  Object.fromEntries(
    Object.entries(enumObj)
      .filter(([key]) => isNaN(Number(key)))
      .map(([key, value]) => [key.replace(/[-_]/g, ' ').toLowerCase(), value])
  )
