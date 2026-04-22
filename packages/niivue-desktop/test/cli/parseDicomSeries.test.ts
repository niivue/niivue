import { describe, it, expect } from 'vitest'
import { parseDicomSeriesOutput } from '../../src/main/utils/dcm2niixParser.js'

// Must match SEP in dcm2niixParser.ts — dcm2niix preserves `@@` in filenames
// while it rewrites control characters like 0x1F to `_`.
const SEP = '@@'

function line(
  crc: number,
  sn: string,
  pid: string,
  studyUID: string,
  seriesUID: string,
  desc: string,
  protocol: string,
  time: string,
  mfr: string,
  images?: number
): string {
  const label = [sn, pid, studyUID, seriesUID, desc, protocol, time, mfr].join(SEP)
  return images !== undefined ? `${crc} ${label} Images: ${images}` : `${crc} ${label}`
}

describe('parseDicomSeriesOutput', () => {
  it('parses multi-subject multi-modality output with populated fields', () => {
    const text = [
      line(
        11111111,
        '1',
        'sub-01',
        '1.2.3.studyA',
        '1.2.3.series1',
        'T1w',
        'MPRAGE',
        '120000',
        'Siemens',
        176
      ),
      line(
        22222222,
        '2',
        'sub-01',
        '1.2.3.studyA',
        '1.2.3.series2',
        'bold',
        'EPI_rest',
        '120500',
        'Siemens',
        300
      ),
      line(
        33333333,
        '1',
        'sub-02',
        '1.2.3.studyB',
        '1.2.3.series3',
        'T1w',
        'MPRAGE',
        '130000',
        'GE',
        176
      )
    ].join('\n')

    const series = parseDicomSeriesOutput(text, 'fallback-folder')

    expect(series).toHaveLength(3)
    const [s1, s2, s3] = series
    expect(s1).toMatchObject({
      seriesNumber: 11111111,
      patientId: 'sub-01',
      subjectId: 'sub-01',
      sessionId: '1.2.3.studyA',
      studyInstanceUID: '1.2.3.studyA',
      seriesInstanceUID: '1.2.3.series1',
      seriesDescription: 'T1w',
      protocolName: 'MPRAGE',
      acquisitionTime: '120000',
      manufacturer: 'Siemens',
      images: 176
    })
    expect(s1.text).toBe('T1w #1')
    expect(s2.patientId).toBe('sub-01')
    expect(s2.sessionId).toBe('1.2.3.studyA')
    expect(s3.patientId).toBe('sub-02')
    expect(s3.sessionId).toBe('1.2.3.studyB')
  })

  it('falls back to folder name when patientId is empty', () => {
    const text = line(44444444, '5', '', '', '', 'Anon', 'ProtocolX', '', '')
    const series = parseDicomSeriesOutput(text, 'study-folder')
    expect(series).toHaveLength(1)
    expect(series[0].patientId).toBeUndefined()
    expect(series[0].subjectId).toBe('study-folder')
    expect(series[0].sessionId).toBeUndefined()
  })

  it('dedupes 15a/15b CRC variants into one series row with max image count', () => {
    // Same CRC printed twice by dcm2niix when it disambiguates series numbers
    const text = [
      `55555555 15a${SEP}sub-01${SEP}1.2.3.studyA${SEP}1.2.3.s15${SEP}T1w${SEP}MPRAGE${SEP}120000${SEP}Siemens Images: 150`,
      `55555555 15b${SEP}sub-01${SEP}1.2.3.studyA${SEP}1.2.3.s15${SEP}T1w${SEP}MPRAGE${SEP}120000${SEP}Siemens Images: 176`
    ].join('\n')

    const series = parseDicomSeriesOutput(text, 'folder')
    expect(series).toHaveLength(1)
    expect(series[0].seriesNumber).toBe(55555555)
    expect(series[0].images).toBe(176)
    expect(series[0].text).toContain('×2')
  })

  it('tolerates missing optional fields (empty separators)', () => {
    // studyUID, seriesUID, time, and manufacturer empty
    const text = `66666666 3${SEP}sub-03${SEP}${SEP}${SEP}bold${SEP}EPI${SEP}${SEP}`
    const series = parseDicomSeriesOutput(text, 'folder')
    expect(series).toHaveLength(1)
    expect(series[0]).toMatchObject({
      patientId: 'sub-03',
      subjectId: 'sub-03',
      seriesDescription: 'bold',
      protocolName: 'EPI'
    })
    expect(series[0].studyInstanceUID).toBeUndefined()
    expect(series[0].seriesInstanceUID).toBeUndefined()
    expect(series[0].sessionId).toBeUndefined()
    expect(series[0].acquisitionTime).toBeUndefined()
    expect(series[0].manufacturer).toBeUndefined()
  })

  it('parses legacy output without separators', () => {
    // Output from old %f_%p_%t_%s pattern: "folder_protocol_time_seriesNumber"
    const text = '77777777 myfolder_MPRAGE_120000_5 Images: 176'
    const series = parseDicomSeriesOutput(text, 'myfolder')
    expect(series).toHaveLength(1)
    expect(series[0].seriesNumber).toBe(77777777)
    expect(series[0].images).toBe(176)
    // Legacy path populates subjectId from folderName, and has no UID fields
    expect(series[0].patientId).toBeUndefined()
    expect(series[0].subjectId).toBe('myfolder')
    expect(series[0].studyInstanceUID).toBeUndefined()
    expect(series[0].text).toContain('myfolder_MPRAGE_120000_5')
  })

  it('ignores non-CRC lines (warnings, blanks)', () => {
    const text = [
      'Warning: something weird',
      '',
      line(
        88888888,
        '1',
        'sub-09',
        '1.2.3.studyC',
        '1.2.3.s9',
        'T2w',
        'T2_TSE',
        '140000',
        'Philips',
        176
      ),
      'Info: blah blah'
    ].join('\n')
    const series = parseDicomSeriesOutput(text, 'folder')
    expect(series).toHaveLength(1)
    expect(series[0].seriesNumber).toBe(88888888)
  })

  it('sorts by CRC numerically ascending', () => {
    const text = [
      line(99999999, '3', 'sub-01', 'studyA', 's3', 'T1w', 'p', 't', 'm'),
      line(11111111, '1', 'sub-01', 'studyA', 's1', 'T1w', 'p', 't', 'm'),
      line(55555555, '2', 'sub-01', 'studyA', 's2', 'T1w', 'p', 't', 'm')
    ].join('\n')
    const series = parseDicomSeriesOutput(text, 'folder')
    expect(series.map((s) => s.seriesNumber)).toEqual([11111111, 55555555, 99999999])
  })
})
