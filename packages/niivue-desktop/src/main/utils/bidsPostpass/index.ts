// Barrel exports for the BIDS import post-pass.

export type { PostPassDirEntry, PostPassFs } from './fs.js'
export { nodePostPassFs } from './nodeFs.js'
export {
  type PostPassResult,
  type PostPassWriteMeta,
  type PostPassWriteText,
  runPostPass
} from './runPostPass.js'
export {
  aggregateScansTsv,
  acqIso,
  buildScansTsvContent,
  computeScansTsvPath,
  hmsSeconds
} from './scansTsv.js'
export { b0Identifier, findFmapGroups, planB0FieldEdits, stripFmapSuffix } from './fmapPairing.js'
export type { SidecarEdit } from './fmapPairing.js'
export { parseSidecar, serializeSidecar, detectIndent } from './sidecarJson.js'
export type { ParsedSidecar, SidecarFormat } from './sidecarJson.js'
export { walkSessions } from './walkSessions.js'
