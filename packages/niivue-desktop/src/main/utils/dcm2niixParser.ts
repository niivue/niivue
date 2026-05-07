import type { DicomSeries } from '../../common/dcm2niixTypes.js'

// dcm2niix filename-token pattern for the dry-run listing. Fields are joined by
// the literal `@@` sequence — dcm2niix sanitizes many characters (including the
// ASCII Unit Separator 0x1F) to `_` in output filenames, but `@` passes through,
// and `@@` is effectively absent from DICOM string VRs. Tokens:
//   %s = series number (may have a-z dedup suffix)
//   %i = patient ID
//   %k = study instance UID
//   %j = series instance UID
//   %d = series description
//   %p = protocol name
//   %t = acquisition time
//   %m = manufacturer
const SEP = '@@'
export const DRY_RUN_FORMAT = ['%s', '%i', '%k', '%j', '%d', '%p', '%t', '%m'].join(SEP)

type ParsedGroup = {
  baseLabel: string
  crc: number
  count: number
  images?: number
  sn?: number
  patientId?: string
  studyInstanceUID?: string
  seriesInstanceUID?: string
  seriesDescription?: string
  protocolName?: string
  acquisitionTime?: string
  manufacturer?: string
  modality?: string
}

// Infer a BIDS-ish modality label from the series description + protocol name.
// dcm2niix's filename template has no modality token, so we heuristically
// classify based on common naming conventions used by scanner consoles.
//
// Note on normalization: JS regex treats `_` as a word character, so `\brest\b`
// does NOT match inside `Rest_fMRI_AP`. We rewrite `_`, `-`, `.` to spaces first
// so `\b` fires at the logical token boundaries scanner consoles produce.
function inferModality(description?: string, protocol?: string): string | undefined {
  const raw = `${description ?? ''} ${protocol ?? ''}`.trim()
  if (!raw) return undefined
  // Normalize `_`, `-`, `.` → space so `\b` fires (underscore counts as \w in JS).
  // Also split camelCase (e.g. `RestSE_AP` → `Rest SE AP`) so tokens are visible
  // to \b-anchored patterns.
  const hay = raw.replace(/[_\-.]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')

  // Fieldmap first: "rest" fieldmaps (e.g. RestSE_AP) share tokens with BOLD.
  if (/\b(fmap|fieldmap|b0\s?map|topup)\b/i.test(hay)) return 'fmap'
  if (/\bSE(rev)?\s?(AP|PA)\b/i.test(hay)) return 'fmap'
  if (/\bgre\s?field/i.test(hay)) return 'fmap'

  if (/\b(bold|fmri|epi|rest|resting|task)\b/i.test(hay)) return 'func'
  if (/\b(dwi|dti|dki|hardi|diffusion)\b/i.test(hay)) return 'dwi'
  if (/\b(t1w?|mprage|spgr|fspgr|tfl|bravo)\b/i.test(hay)) return 'T1w'
  if (/\bflair\b/i.test(hay)) return 'FLAIR'
  if (/\b(t2w?|tse|space|cube)\b/i.test(hay)) return 'T2w'
  if (/\b(pdw?|proton)\b/i.test(hay)) return 'PDw'
  if (/\b(swi|susceptibility)\b/i.test(hay)) return 'SWI'
  if (/\b(asl|perfusion|pcasl|pasl)\b/i.test(hay)) return 'asl'
  if (/\b(localizer|scout|survey)\b/i.test(hay)) return 'localizer'
  if (/\b(angio|tof|mra)\b/i.test(hay)) return 'angio'
  if (/\banat\b/i.test(hay)) return 'anat'
  return undefined
}

export function parseDicomSeriesOutput(text: string, folderName = ''): DicomSeries[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => /^\d/.test(l))

  const groups = new Map<string, ParsedGroup>()

  for (const line of lines) {
    const m = /^(\d+)\s+(.+)$/.exec(line)
    if (!m) continue
    const crc = Number(m[1])
    const raw = m[2]

    const imgMatch = /Images:\s*(\d+)/i.exec(line)
    const images = imgMatch ? Number(imgMatch[1]) : undefined

    let labelFull = raw.replace(/^.*[\\/]/, '')
    const trailingImages = /\s+Images:\s*\d+\s*$/i.exec(labelFull)
    if (trailingImages) labelFull = labelFull.slice(0, trailingImages.index).trim()

    let baseLabel = labelFull
    let displaySeriesNumber: number | undefined
    const meta: Omit<ParsedGroup, 'baseLabel' | 'crc' | 'count' | 'images' | 'sn'> = {}

    if (labelFull.includes(SEP)) {
      const parts = labelFull.split(SEP)
      const [
        sn = '',
        pid = '',
        studyUID = '',
        seriesUID = '',
        desc = '',
        protocol = '',
        time = '',
        mfr = ''
      ] = parts
      const snm = /^(\d+)([a-z])?$/i.exec(sn)
      displaySeriesNumber = snm ? Number(snm[1]) : undefined

      meta.patientId = pid || undefined
      meta.studyInstanceUID = studyUID || undefined
      meta.seriesInstanceUID = seriesUID || undefined
      meta.seriesDescription = desc || undefined
      meta.protocolName = protocol || undefined
      meta.acquisitionTime = time || undefined
      meta.manufacturer = mfr || undefined
      meta.modality = inferModality(desc, protocol)

      const labelCore = desc || protocol || (snm ? `series ${snm[1]}` : 'series')
      baseLabel = snm ? `${labelCore} #${snm[1]}` : labelCore
    } else {
      const snm = /_(\d+)([a-z])?$/i.exec(labelFull)
      displaySeriesNumber = snm ? Number(snm[1]) : undefined
      baseLabel = snm ? labelFull.replace(/_(\d+)[a-z]?$/i, '_$1') : labelFull
    }

    const key = String(crc)
    const g = groups.get(key)

    if (!g) {
      groups.set(key, {
        baseLabel,
        crc,
        count: 1,
        images,
        sn: displaySeriesNumber,
        ...meta
      })
    } else {
      if (typeof images === 'number') {
        const prev = g.images ?? 0
        if (images > prev) g.images = images
      }
      g.count++
    }
  }

  const series: DicomSeries[] = Array.from(groups.values()).map((g) => {
    const text = g.count > 1 ? `${g.baseLabel} ×${g.count}` : g.baseLabel
    const subjectId = g.patientId || folderName || undefined
    const sessionId = g.studyInstanceUID
    return {
      text,
      seriesNumber: g.crc,
      seriesInstanceUID: g.seriesInstanceUID,
      studyInstanceUID: g.studyInstanceUID,
      patientId: g.patientId,
      manufacturer: g.manufacturer,
      acquisitionTime: g.acquisitionTime,
      protocolName: g.protocolName,
      seriesDescription: g.seriesDescription ?? g.baseLabel,
      images: g.images,
      modality: g.modality,
      subjectId,
      sessionId
    }
  })

  series.sort((a, b) => {
    const an = a.seriesNumber ?? Number.MAX_SAFE_INTEGER
    const bn = b.seriesNumber ?? Number.MAX_SAFE_INTEGER
    return an - bn
  })

  return series
}
