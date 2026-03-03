import type { BidsSeriesMapping, BidsDatatype, BidsSuffix } from '../../../../common/bidsTypes.js'

function generateBidsFilename(mapping: BidsSeriesMapping): string {
  const parts: string[] = [`sub-${mapping.subject}`]
  if (mapping.session) parts.push(`ses-${mapping.session}`)
  if (mapping.task) parts.push(`task-${mapping.task}`)
  if (mapping.acq) parts.push(`acq-${mapping.acq}`)
  if (mapping.run > 0) parts.push(`run-${String(mapping.run).padStart(2, '0')}`)
  parts.push(mapping.suffix)
  return parts.join('_')
}

function generateBidsPath(mapping: BidsSeriesMapping): string {
  const parts: string[] = [`sub-${mapping.subject}`]
  if (mapping.session) parts.push(`ses-${mapping.session}`)
  const subDir = [...parts, mapping.datatype].join('/')
  const filename = generateBidsFilename(mapping)
  return `${subDir}/${filename}`
}

export function buildBidsTree(mappings: BidsSeriesMapping[]): string[] {
  const included = mappings.filter((m) => !m.excluded)
  const paths: string[] = []
  for (const m of included) {
    const bidsBase = generateBidsPath(m)
    const ext = m.niftiPath.endsWith('.nii.gz') ? '.nii.gz' : '.nii'
    paths.push(bidsBase + ext)
    paths.push(bidsBase + '.json')
  }
  paths.sort()
  return paths
}

export { generateBidsFilename, generateBidsPath }

export const SUFFIXES_BY_DATATYPE: Record<BidsDatatype, BidsSuffix[]> = {
  anat: ['T1w', 'T2w', 'FLAIR', 'T2star', 'inplaneT1', 'inplaneT2', 'PDw', 'angio'],
  func: ['bold', 'sbref'],
  dwi: ['dwi'],
  fmap: ['phasediff', 'phase1', 'phase2', 'magnitude1', 'magnitude2', 'fieldmap', 'epi'],
  perf: ['asl', 'm0scan']
}
