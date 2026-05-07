import { describe, it, expect } from 'vitest'
import type { BidsSeriesMapping, BidsDatasetConfig, FieldmapIntendedFor } from '../../src/common/bidsTypes.js'
import { validateProposedDataset } from '../../src/main/utils/bidsValidator.js'
import {
  generateBidsFilename,
  generateBidsPath,
  buildBidsTree,
  resolveIntendedForPaths
} from '../../src/main/utils/bidsWriter.js'
import {
  classifyByDescription,
  classifyBySidecar,
  parseBidsGuessSuffix,
  classifyByBidsGuess,
  extractEntities,
  stripPiiFields,
  suggestFieldmapMappings
} from '../../src/main/utils/bidsEngine.js'
import { serializeBidsState, deserializeBidsState } from '../../src/common/bidsState.js'
import type { BidsWizardState } from '../../src/common/bidsTypes.js'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeMapping(overrides: Partial<BidsSeriesMapping> = {}): BidsSeriesMapping {
  return {
    index: 0,
    seriesDescription: 'T1w_MPRAGE',
    sidecarPath: '/data/sub01/anat.json',
    niftiPath: '/data/sub01/anat.nii.gz',
    datatype: 'anat',
    suffix: 'T1w',
    task: '',
    acq: '',
    ce: '',
    rec: '',
    dir: '',
    run: 0,
    echo: 0,
    subject: '01',
    session: '',
    confidence: 'high',
    heuristicReason: 'test',
    excluded: false,
    ...overrides
  }
}

function makeConfig(overrides: Partial<BidsDatasetConfig> = {}): BidsDatasetConfig {
  return {
    name: 'TestDataset',
    bidsVersion: '1.9.0',
    license: 'CC0',
    authors: ['Test Author'],
    readme: '',
    outputDir: '/tmp/bids-out',
    ...overrides
  }
}

// ---------------------------------------------------------------------------
// bidsValidator.ts - validateProposedDataset
// ---------------------------------------------------------------------------

describe('bidsValidator - validateProposedDataset', () => {
  it('should error when dataset name is missing', () => {
    const result = validateProposedDataset(makeConfig({ name: '' }), [makeMapping()])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('Dataset name'))).toBe(true)
  })

  it('should error when output directory is missing', () => {
    const result = validateProposedDataset(makeConfig({ outputDir: '' }), [makeMapping()])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('Output directory'))).toBe(true)
  })

  it('should error when all series are excluded', () => {
    const result = validateProposedDataset(makeConfig(), [makeMapping({ excluded: true })])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('No series selected'))).toBe(true)
  })

  it('should pass for a valid simple dataset', () => {
    const result = validateProposedDataset(makeConfig(), [makeMapping()])
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should error on invalid subject label with special chars', () => {
    const result = validateProposedDataset(makeConfig(), [makeMapping({ subject: 'sub@01' })])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('alphanumeric'))).toBe(true)
  })

  it('should error when func/bold is missing task label', () => {
    const mapping = makeMapping({ datatype: 'func', suffix: 'bold', task: '' })
    const result = validateProposedDataset(makeConfig(), [mapping])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('Task label is required'))).toBe(true)
  })

  it('should error on duplicate filenames', () => {
    const m1 = makeMapping({ index: 0 })
    const m2 = makeMapping({ index: 1 })
    const result = validateProposedDataset(makeConfig(), [m1, m2])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('Duplicate'))).toBe(true)
  })

  it('should warn on low confidence classification', () => {
    const result = validateProposedDataset(makeConfig(), [makeMapping({ confidence: 'low' })])
    expect(result.warnings.some((w) => w.message.includes('Low confidence'))).toBe(true)
  })

  it('should pass for valid fmap filename without task entity', () => {
    const fmap = makeMapping({
      datatype: 'fmap',
      suffix: 'epi',
      task: ''
    })
    const result = validateProposedDataset(makeConfig(), [fmap])
    expect(result.errors.some((e) => e.message.includes('Task entity is not allowed'))).toBe(false)
  })

  it('should reject fmap suffix when filename contains task entity', () => {
    const fmap = makeMapping({
      datatype: 'func',
      suffix: 'epi',
      task: 'rest'
    })
    const result = validateProposedDataset(makeConfig(), [fmap])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('Task entity is not allowed'))).toBe(true)
  })

  it('should pass for valid func filename with task entity', () => {
    const func = makeMapping({
      datatype: 'func',
      suffix: 'bold',
      task: 'rest'
    })
    const result = validateProposedDataset(makeConfig(), [func])
    expect(result.errors.some((e) => e.message.includes('Task entity is not allowed'))).toBe(false)
  })

  it('should warn on fieldmap without IntendedFor', () => {
    const fmap = makeMapping({
      index: 0,
      datatype: 'fmap',
      suffix: 'phasediff',
      intendedFor: []
    })
    const target = makeMapping({
      index: 1,
      datatype: 'func',
      suffix: 'bold',
      task: 'rest',
      seriesDescription: 'BOLD rest'
    })
    const result = validateProposedDataset(makeConfig(), [fmap, target])
    expect(result.warnings.some((w) => w.message.includes('no IntendedFor'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// bidsWriter.ts - pure functions
// ---------------------------------------------------------------------------

describe('bidsWriter - generateBidsFilename', () => {
  it('should build minimal filename with sub and suffix', () => {
    const fn = generateBidsFilename(makeMapping())
    expect(fn).toBe('sub-01_T1w')
  })

  it('should include session when provided', () => {
    const fn = generateBidsFilename(makeMapping({ session: 'pre' }))
    expect(fn).toBe('sub-01_ses-pre_T1w')
  })

  it('should include task for func (not fmap)', () => {
    const fn = generateBidsFilename(
      makeMapping({ datatype: 'func', suffix: 'bold', task: 'rest' })
    )
    expect(fn).toBe('sub-01_task-rest_bold')
  })

  it('should omit task for fmap even when task is set', () => {
    const fn = generateBidsFilename(
      makeMapping({ datatype: 'fmap', suffix: 'epi', task: 'rest' })
    )
    expect(fn).not.toContain('task-')
  })

  it('should order entities correctly: sub, ses, task, acq, ce, rec, dir, run, echo, suffix', () => {
    const fn = generateBidsFilename(
      makeMapping({
        subject: '01',
        session: 'pre',
        datatype: 'func',
        suffix: 'bold',
        task: 'nback',
        acq: 'mb4',
        ce: 'gadolinium',
        rec: 'magnitude',
        dir: 'AP',
        run: 2,
        echo: 1
      })
    )
    expect(fn).toBe('sub-01_ses-pre_task-nback_acq-mb4_ce-gadolinium_rec-magnitude_dir-AP_run-02_echo-1_bold')
  })

  it('should zero-pad run numbers to 2 digits', () => {
    const fn = generateBidsFilename(makeMapping({ run: 3 }))
    expect(fn).toContain('run-03')
  })

  it('should not include run when run is 0', () => {
    const fn = generateBidsFilename(makeMapping({ run: 0 }))
    expect(fn).not.toContain('run-')
  })
})

describe('bidsWriter - generateBidsPath', () => {
  it('should produce datatype directory + filename', () => {
    const p = generateBidsPath(makeMapping())
    // path.join on posix: sub-01/anat/sub-01_T1w
    expect(p).toContain('sub-01')
    expect(p).toContain('anat')
    expect(p).toContain('sub-01_T1w')
  })

  it('should include session directory when session is present', () => {
    const p = generateBidsPath(makeMapping({ session: 'pre' }))
    expect(p).toContain('ses-pre')
  })
})

describe('bidsWriter - buildBidsTree', () => {
  it('should generate sorted list of expected paths', () => {
    const mappings = [
      makeMapping({ index: 0, niftiPath: '/data/anat.nii.gz' }),
      makeMapping({
        index: 1,
        datatype: 'func',
        suffix: 'bold',
        task: 'rest',
        niftiPath: '/data/func.nii.gz',
        seriesDescription: 'BOLD rest'
      })
    ]
    const tree = buildBidsTree(mappings)
    // anat: .nii.gz + .json = 2 files, func: .nii.gz + .json = 2 files
    expect(tree.length).toBe(4)
    // Should be sorted alphabetically
    for (let i = 1; i < tree.length; i++) {
      expect(tree[i] >= tree[i - 1]).toBe(true)
    }
  })

  it('should exclude excluded mappings', () => {
    const mappings = [
      makeMapping({ excluded: true, niftiPath: '/data/anat.nii.gz' })
    ]
    const tree = buildBidsTree(mappings)
    expect(tree).toHaveLength(0)
  })

  it('should include events.tsv for func/bold with eventFile', () => {
    const mappings = [
      makeMapping({
        datatype: 'func',
        suffix: 'bold',
        task: 'nback',
        niftiPath: '/data/func.nii.gz',
        eventFile: {
          sourcePath: '/data/events.tsv',
          filename: 'events.tsv',
          delimiter: '\t',
          convertMsToSeconds: false,
          columnMappings: [
            { sourceColumn: 'onset', bidsColumn: 'onset' },
            { sourceColumn: 'duration', bidsColumn: 'duration' }
          ],
          detectedColumns: ['onset', 'duration']
        }
      })
    ]
    const tree = buildBidsTree(mappings)
    expect(tree.some((p) => p.endsWith('_events.tsv'))).toBe(true)
  })
})

describe('bidsWriter - resolveIntendedForPaths', () => {
  it('should resolve relative paths for fieldmap IntendedFor', () => {
    const fmap = makeMapping({
      index: 0,
      datatype: 'fmap',
      suffix: 'phasediff',
      subject: '01',
      niftiPath: '/data/fmap.nii.gz'
    })
    const target = makeMapping({
      index: 1,
      datatype: 'func',
      suffix: 'bold',
      task: 'rest',
      subject: '01',
      niftiPath: '/data/func.nii.gz'
    })
    const fieldmapMappings: FieldmapIntendedFor[] = [
      { fmapIndex: 0, targetIndices: [1] }
    ]

    const updated = resolveIntendedForPaths([fmap, target], fieldmapMappings)
    // The returned mappings are copies with intendedFor set on fmap entries
    expect(updated.length).toBe(2)
    const updatedFmap = updated.find((m) => m.index === 0)!
    expect(updatedFmap.intendedFor).toBeDefined()
    expect(updatedFmap.intendedFor!.length).toBe(1)
    // Should NOT start with sub-01/ (relative to subject root)
    expect(updatedFmap.intendedFor![0]).not.toMatch(/^sub-/)
    // Should contain func directory
    expect(updatedFmap.intendedFor![0]).toContain('func')
  })

  it('should skip excluded fieldmaps', () => {
    const fmap = makeMapping({ index: 0, datatype: 'fmap', suffix: 'phasediff', excluded: true, niftiPath: '/data/fmap.nii.gz' })
    const target = makeMapping({ index: 1, datatype: 'func', suffix: 'bold', task: 'rest', niftiPath: '/data/func.nii.gz' })
    const fieldmapMappings: FieldmapIntendedFor[] = [{ fmapIndex: 0, targetIndices: [1] }]

    resolveIntendedForPaths([fmap, target], fieldmapMappings)
    expect(fieldmapMappings[0].intendedFor).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// bidsEngine.ts - internal pure functions
// ---------------------------------------------------------------------------

describe('bidsEngine - classifyByDescription', () => {
  const cases: [string, string, string][] = [
    ['T1w_MPRAGE', 'anat', 'T1w'],
    ['MPRAGE_SAG', 'anat', 'T1w'],
    ['3D_T1_SAG', 'anat', 'T1w'],
    ['BRAVO', 'anat', 'T1w'],
    ['FLAIR_AX', 'anat', 'FLAIR'],
    ['T2w_TSE', 'anat', 'T2w'],
    ['T2star_GRE', 'anat', 'T2star'],
    ['BOLD_rest', 'func', 'bold'],
    ['task_nback_fmri', 'func', 'bold'],
    ['resting_state', 'func', 'bold'],
    ['DWI_64dir', 'dwi', 'dwi'],
    ['DTI_b1000', 'dwi', 'dwi'],
    ['diffusion_30dir', 'dwi', 'dwi'],
    ['magnitude1', 'fmap', 'magnitude1'],
    ['fieldmap_GRE', 'fmap', 'fieldmap'],
    ['spin_echo_field', 'fmap', 'epi'],
    ['se_fmap_AP', 'fmap', 'epi'],
    ['ASL_PCASL', 'perf', 'asl'],
    ['m0scan_calibration', 'perf', 'm0scan'],
    ['sbref_bold', 'func', 'sbref']
  ]

  for (const [desc, expectedDatatype, expectedSuffix] of cases) {
    it(`should classify "${desc}" as ${expectedDatatype}/${expectedSuffix}`, () => {
      const result = classifyByDescription(desc)
      expect(result).not.toBeNull()
      expect(result!.datatype).toBe(expectedDatatype)
      expect(result!.suffix).toBe(expectedSuffix)
    })
  }

  it('should return null for unrecognized descriptions', () => {
    expect(classifyByDescription('localizer_scout')).toBeNull()
    expect(classifyByDescription('SURVEY')).toBeNull()
  })

  it('should extract task label from func series', () => {
    const result = classifyByDescription('task_nback_bold')
    expect(result).not.toBeNull()
    expect(result!.task).toBe('nback')
  })

  it('should set task=rest for resting state', () => {
    const result = classifyByDescription('resting_bold')
    expect(result).not.toBeNull()
    expect(result!.task).toBe('rest')
  })

  it('should refine fmap_dir to epi suffix', () => {
    const result = classifyByDescription('fmap_dirAP')
    expect(result).not.toBeNull()
    expect(result!.datatype).toBe('fmap')
    expect(result!.suffix).toBe('epi')
  })
})

describe('bidsEngine - classifyBySidecar', () => {
  it('should classify DWI by DiffusionDirectionality', () => {
    const result = classifyBySidecar({ DiffusionDirectionality: 'DIRECTIONAL' } as any)
    expect(result).not.toBeNull()
    expect(result!.datatype).toBe('dwi')
    expect(result!.suffix).toBe('dwi')
  })

  it('should classify fieldmap by dual echo times', () => {
    const result = classifyBySidecar({ EchoTime1: 0.00492, EchoTime2: 0.00738 } as any)
    expect(result).not.toBeNull()
    expect(result!.datatype).toBe('fmap')
    expect(result!.suffix).toBe('phasediff')
  })

  it('should classify ASL by ArterialSpinLabelingType', () => {
    const result = classifyBySidecar({ ArterialSpinLabelingType: 'PCASL' } as any)
    expect(result).not.toBeNull()
    expect(result!.datatype).toBe('perf')
    expect(result!.suffix).toBe('asl')
  })

  it('should classify functional by TR + volume count', () => {
    const result = classifyBySidecar({
      RepetitionTime: 2.0,
      NumberOfTemporalPositions: 200
    } as any)
    expect(result).not.toBeNull()
    expect(result!.datatype).toBe('func')
    expect(result!.suffix).toBe('bold')
  })

  it('should not classify functional with TR > 5', () => {
    const result = classifyBySidecar({
      RepetitionTime: 8.0,
      NumberOfTemporalPositions: 200
    } as any)
    expect(result).toBeNull()
  })

  it('should not classify functional with fewer than 11 volumes', () => {
    const result = classifyBySidecar({
      RepetitionTime: 2.0,
      NumberOfTemporalPositions: 5
    } as any)
    expect(result).toBeNull()
  })

  it('should return null for empty sidecar', () => {
    expect(classifyBySidecar({} as any)).toBeNull()
  })
})

describe('bidsEngine - parseBidsGuessSuffix', () => {
  it('should parse _task-rest_bold into entities and suffix', () => {
    const result = parseBidsGuessSuffix('_task-rest_bold')
    expect(result.suffix).toBe('bold')
    expect(result.entities.task).toBe('rest')
  })

  it('should parse _acq-tse2_T2w into entities and suffix', () => {
    const result = parseBidsGuessSuffix('_acq-tse2_T2w')
    expect(result.suffix).toBe('T2w')
    expect(result.entities.acq).toBe('tse2')
  })

  it('should handle plain suffix without entities', () => {
    const result = parseBidsGuessSuffix('_T1w')
    expect(result.suffix).toBe('T1w')
    expect(result.entities.task).toBe('')
  })

  it('should handle suffix without leading underscore', () => {
    const result = parseBidsGuessSuffix('bold')
    expect(result.suffix).toBe('bold')
  })

  it('should parse multiple entities', () => {
    const result = parseBidsGuessSuffix('_task-nback_acq-mb4_bold')
    expect(result.suffix).toBe('bold')
    expect(result.entities.task).toBe('nback')
    expect(result.entities.acq).toBe('mb4')
  })
})

describe('bidsEngine - classifyByBidsGuess', () => {
  it('should classify array format BidsGuess', () => {
    const result = classifyByBidsGuess({
      BidsGuess: ['func', '_task-rest_bold']
    } as any)
    expect(result).not.toBeNull()
    expect(result!.datatype).toBe('func')
    expect(result!.suffix).toBe('bold')
    expect(result!.entities.task).toBe('rest')
  })

  it('should classify object format BidsGuess', () => {
    const result = classifyByBidsGuess({
      BidsGuess: { datatype: 'anat', suffix: 'T1w' }
    } as any)
    expect(result).not.toBeNull()
    expect(result!.datatype).toBe('anat')
    expect(result!.suffix).toBe('T1w')
  })

  it('should use filename_suffix fallback in object format', () => {
    const result = classifyByBidsGuess({
      BidsGuess: { datatype: 'func', filename_suffix: '_task-nback_bold' }
    } as any)
    expect(result).not.toBeNull()
    expect(result!.suffix).toBe('bold')
    expect(result!.entities.task).toBe('nback')
  })

  it('should return null for invalid datatype', () => {
    const result = classifyByBidsGuess({
      BidsGuess: ['invalid_type', '_T1w']
    } as any)
    expect(result).toBeNull()
  })

  it('should return null for invalid suffix', () => {
    const result = classifyByBidsGuess({
      BidsGuess: ['anat', '_nonexistent']
    } as any)
    expect(result).toBeNull()
  })

  it('should return null when BidsGuess is missing', () => {
    expect(classifyByBidsGuess({} as any)).toBeNull()
  })

  it('should return null for array with fewer than 2 elements', () => {
    expect(classifyByBidsGuess({ BidsGuess: ['func'] } as any)).toBeNull()
  })

  it('should handle object with entities', () => {
    const result = classifyByBidsGuess({
      BidsGuess: { datatype: 'func', suffix: 'bold', entities: { task: 'nback' } }
    } as any)
    expect(result).not.toBeNull()
    expect(result!.entities.task).toBe('nback')
  })
})

describe('bidsEngine - extractEntities', () => {
  it('should map phase encoding direction j to AP', () => {
    const result = extractEntities({ PhaseEncodingDirection: 'j' } as any, '')
    expect(result.dir).toBe('AP')
  })

  it('should map j- to PA', () => {
    const result = extractEntities({ PhaseEncodingDirection: 'j-' } as any, '')
    expect(result.dir).toBe('PA')
  })

  it('should map i to LR', () => {
    const result = extractEntities({ PhaseEncodingDirection: 'i' } as any, '')
    expect(result.dir).toBe('LR')
  })

  it('should map i- to RL', () => {
    const result = extractEntities({ PhaseEncodingDirection: 'i-' } as any, '')
    expect(result.dir).toBe('RL')
  })

  it('should map k to IS', () => {
    const result = extractEntities({ PhaseEncodingDirection: 'k' } as any, '')
    expect(result.dir).toBe('IS')
  })

  it('should map k- to SI', () => {
    const result = extractEntities({ PhaseEncodingDirection: 'k-' } as any, '')
    expect(result.dir).toBe('SI')
  })

  it('should extract echo number', () => {
    const result = extractEntities({ EchoNumber: 2 } as any, '')
    expect(result.echo).toBe(2)
  })

  it('should detect contrast agent from sidecar', () => {
    const result = extractEntities({ ContrastBolusAgent: 'Gadolinium' } as any, '')
    expect(result.ce).toBe('enhanced')
  })

  it('should detect contrast from description patterns', () => {
    const result = extractEntities({} as any, 'T1w_post_contrast')
    expect(result.ce).toBe('enhanced')
  })

  it('should extract acq label from description', () => {
    const result = extractEntities({} as any, 'T1w_acq_mb4')
    expect(result.acq).toBe('mb4')
  })

  it('should extract dir label from description when no PhaseEncodingDirection', () => {
    const result = extractEntities({} as any, 'fmap_dirAP')
    expect(result.dir).toBe('AP')
  })

  it('should prefer PhaseEncodingDirection over description dir', () => {
    const result = extractEntities({ PhaseEncodingDirection: 'j-' } as any, 'fmap_dirAP')
    expect(result.dir).toBe('PA')
  })

  it('should return empty entities for empty inputs', () => {
    const result = extractEntities({} as any, '')
    expect(result).toEqual({ ce: '', rec: '', dir: '', acq: '', echo: 0 })
  })
})

describe('bidsEngine - stripPiiFields', () => {
  it('should remove PII fields', () => {
    const input = {
      RepetitionTime: 2.0,
      PatientName: 'John Doe',
      PatientID: '12345',
      PatientBirthDate: '19900101',
      PatientAge: '030Y',
      PatientSex: 'M',
      SeriesInstanceUID: '1.2.3.4',
      StudyInstanceUID: '5.6.7.8',
      ConversionSoftware: 'dcm2niix',
      EchoTime: 0.03
    }
    const result = stripPiiFields(input)
    expect(result.RepetitionTime).toBe(2.0)
    expect(result.EchoTime).toBe(0.03)
    expect(result).not.toHaveProperty('PatientName')
    expect(result).not.toHaveProperty('PatientID')
    expect(result).not.toHaveProperty('PatientBirthDate')
    expect(result).not.toHaveProperty('PatientAge')
    expect(result).not.toHaveProperty('PatientSex')
    expect(result).not.toHaveProperty('SeriesInstanceUID')
    expect(result).not.toHaveProperty('StudyInstanceUID')
    expect(result).not.toHaveProperty('ConversionSoftware')
  })

  it('should pass through non-PII fields unchanged', () => {
    const input = { RepetitionTime: 2.0, FlipAngle: 9, SliceTiming: [0, 0.5, 1.0] }
    const result = stripPiiFields(input)
    expect(result).toEqual(input)
  })
})

describe('bidsEngine - suggestFieldmapMappings', () => {
  it('should match fieldmaps to targets by same subject and session', () => {
    const fmap = makeMapping({
      index: 0,
      datatype: 'fmap',
      suffix: 'phasediff',
      subject: '01',
      session: 'pre'
    })
    const target = makeMapping({
      index: 1,
      datatype: 'func',
      suffix: 'bold',
      task: 'rest',
      subject: '01',
      session: 'pre'
    })
    const other = makeMapping({
      index: 2,
      datatype: 'func',
      suffix: 'bold',
      task: 'rest',
      subject: '02',
      session: 'pre'
    })
    const result = suggestFieldmapMappings([fmap, target, other])
    expect(result).toHaveLength(1)
    expect(result[0].fmapIndex).toBe(0)
    expect(result[0].targetIndices).toEqual([1])
  })

  it('should fall back to same subject when session does not match', () => {
    const fmap = makeMapping({
      index: 0,
      datatype: 'fmap',
      suffix: 'phasediff',
      subject: '01',
      session: ''
    })
    const target = makeMapping({
      index: 1,
      datatype: 'func',
      suffix: 'bold',
      task: 'rest',
      subject: '01',
      session: 'pre'
    })
    const result = suggestFieldmapMappings([fmap, target])
    expect(result).toHaveLength(1)
    expect(result[0].targetIndices).toContain(1)
  })

  it('should return empty array when no fieldmaps exist', () => {
    const result = suggestFieldmapMappings([
      makeMapping({ datatype: 'func', suffix: 'bold', task: 'rest' })
    ])
    expect(result).toHaveLength(0)
  })

  it('should return empty array when no targets exist', () => {
    const result = suggestFieldmapMappings([
      makeMapping({ datatype: 'fmap', suffix: 'phasediff' })
    ])
    expect(result).toHaveLength(0)
  })

  it('should skip excluded fieldmaps', () => {
    const fmap = makeMapping({ index: 0, datatype: 'fmap', suffix: 'phasediff', excluded: true })
    const target = makeMapping({ index: 1, datatype: 'func', suffix: 'bold', task: 'rest' })
    const result = suggestFieldmapMappings([fmap, target])
    expect(result).toHaveLength(0)
  })

  it('should match DWI targets as well as func', () => {
    const fmap = makeMapping({ index: 0, datatype: 'fmap', suffix: 'epi', subject: '01' })
    const dwi = makeMapping({ index: 1, datatype: 'dwi', suffix: 'dwi', subject: '01' })
    const result = suggestFieldmapMappings([fmap, dwi])
    expect(result).toHaveLength(1)
    expect(result[0].targetIndices).toContain(1)
  })
})

// ---------------------------------------------------------------------------
// bidsState.ts - serialize/deserialize round trip
// ---------------------------------------------------------------------------

describe('bidsState - serializeBidsState / deserializeBidsState', () => {
  const sampleState: BidsWizardState = {
    mappings: [makeMapping()],
    fieldmapIntendedFor: [],
    demographics: { age: '30', sex: 'M', handedness: 'right', group: '' },
    detectedSubjects: [],
    config: makeConfig(),
    subject: '01',
    session: '',
    step: 2,
    dicomDir: '/data/dicoms'
  }

  it('should round-trip serialize and deserialize', () => {
    const serialized = serializeBidsState('', sampleState)
    const deserialized = deserializeBidsState(serialized)
    expect(deserialized).not.toBeNull()
    expect(deserialized!.step).toBe(2)
    expect(deserialized!.subject).toBe('01')
    expect(deserialized!.mappings).toHaveLength(1)
    expect(deserialized!.mappings[0].datatype).toBe('anat')
    expect(deserialized!.demographics.age).toBe('30')
    expect(deserialized!.config.name).toBe('TestDataset')
  })

  it('should preserve existing customData fields', () => {
    const existing = JSON.stringify({ otherPlugin: { setting: true } })
    const serialized = serializeBidsState(existing, sampleState)
    const parsed = JSON.parse(serialized)
    expect(parsed.otherPlugin).toEqual({ setting: true })
    expect(parsed.bids).toBeDefined()
  })

  it('should handle empty customData', () => {
    const serialized = serializeBidsState('', sampleState)
    const deserialized = deserializeBidsState(serialized)
    expect(deserialized).not.toBeNull()
  })

  it('should handle invalid existing customData gracefully', () => {
    const serialized = serializeBidsState('not-valid-json{{{', sampleState)
    const deserialized = deserializeBidsState(serialized)
    expect(deserialized).not.toBeNull()
    expect(deserialized!.step).toBe(2)
  })

  it('should return null for empty string', () => {
    expect(deserializeBidsState('')).toBeNull()
  })

  it('should return null for invalid JSON', () => {
    expect(deserializeBidsState('not json')).toBeNull()
  })

  it('should return null when bids key is missing', () => {
    expect(deserializeBidsState(JSON.stringify({ other: 'data' }))).toBeNull()
  })

  it('should return null when bids key is not an object', () => {
    expect(deserializeBidsState(JSON.stringify({ bids: 'string' }))).toBeNull()
  })

  it('should return null when structure is invalid (missing mappings array)', () => {
    expect(deserializeBidsState(JSON.stringify({ bids: { step: 1 } }))).toBeNull()
  })

  it('should return null when structure is invalid (missing step number)', () => {
    expect(deserializeBidsState(JSON.stringify({ bids: { mappings: [] } }))).toBeNull()
  })
})
