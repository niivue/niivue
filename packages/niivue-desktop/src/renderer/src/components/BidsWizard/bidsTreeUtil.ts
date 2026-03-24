import type { BidsSeriesMapping, BidsDatatype, BidsSuffix } from '../../../../common/bidsTypes.js'

function generateBidsFilename(mapping: BidsSeriesMapping): string {
  const parts: string[] = [`sub-${mapping.subject}`]
  if (mapping.session) parts.push(`ses-${mapping.session}`)
  if (mapping.task) parts.push(`task-${mapping.task}`)
  if (mapping.acq) parts.push(`acq-${mapping.acq}`)
  if (mapping.ce) parts.push(`ce-${mapping.ce}`)
  if (mapping.rec) parts.push(`rec-${mapping.rec}`)
  if (mapping.dir) parts.push(`dir-${mapping.dir}`)
  if (mapping.run > 0) parts.push(`run-${String(mapping.run).padStart(2, '0')}`)
  if (mapping.echo > 0) parts.push(`echo-${mapping.echo}`)
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

  // Add excluded series paths (stored in sourcedata/)
  const excluded = mappings.filter((m) => m.excluded)
  for (let i = 0; i < excluded.length; i++) {
    const m = excluded[i]
    const sanitizedDesc = (m.seriesDescription || 'unknown').replace(/[^a-zA-Z0-9]/g, '')
    const baseName = `sub-${m.subject}${m.task ? `_task-${m.task}` : ''}_desc-${sanitizedDesc}_${i}_excluded`
    const ext = m.niftiPath.endsWith('.nii.gz') ? '.nii.gz' : '.nii'
    paths.push(`sourcedata/sub-${m.subject}/${baseName}${ext}`)
    paths.push(`sourcedata/sub-${m.subject}/${baseName}.json`)
  }

  paths.sort()
  return paths
}

export { generateBidsFilename, generateBidsPath }

/** Check dcm2niix BidsGuess to determine if a series is T1-weighted */
export function isBidsGuessT1(mapping: BidsSeriesMapping): boolean {
  const guess = mapping.sidecarData?.original?.BidsGuess
  if (guess) {
    let suffix: string | undefined
    if (Array.isArray(guess) && guess.length >= 2) {
      // Array format: ["anat", "_T1w"]
      suffix = String(guess[1])
    } else if (typeof guess === 'object' && !Array.isArray(guess)) {
      // Object format: { datatype: "anat", suffix: "T1w" }
      const obj = guess as Record<string, unknown>
      suffix = (obj.suffix as string) || (obj.filename_suffix as string)
    }
    if (suffix) {
      return /T1w/i.test(suffix)
    }
  }
  // No BidsGuess available — default to non-T1 (use hellinger)
  return false
}

export const SUFFIXES_BY_DATATYPE: Record<BidsDatatype, BidsSuffix[]> = {
  anat: ['T1w', 'T2w', 'FLAIR', 'T2star', 'inplaneT1', 'inplaneT2', 'PDw', 'angio'],
  func: ['bold', 'sbref'],
  dwi: ['dwi'],
  fmap: ['phasediff', 'phase1', 'phase2', 'magnitude1', 'magnitude2', 'fieldmap', 'epi'],
  perf: ['asl', 'm0scan']
}
