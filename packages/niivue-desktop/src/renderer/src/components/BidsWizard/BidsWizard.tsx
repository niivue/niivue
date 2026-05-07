import { useCallback, useEffect, useState } from 'react'
import { Callout } from '@radix-ui/themes'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import type { Niivue } from '@niivue/niivue'
import type { DicomSeries } from '../../../../common/dcm2niixTypes.js'
import type {
  BidsSeriesMapping,
  BidsDatasetConfig,
  ParticipantDemographics,
  DetectedSubject,
  FieldmapIntendedFor,
  BidsWizardState,
  BidsValidationResult,
  BidsValidationIssue
} from '../../../../common/bidsTypes.js'
import { serializeBidsState, deserializeBidsState } from '../../../../common/bidsState.js'
import { WizardShell, type WizardStep } from '../Wizard/index.js'
import { StepSelectSource } from './StepSelectSource.js'
import { StepConversion } from './StepConversion.js'
import { StepSkullStrip } from './StepSkullStrip.js'
import { StepClassification } from './StepClassification.js'
import { StepSubjectSession } from './StepSubjectSession.js'
import { StepMetadata } from './StepMetadata.js'
import { StepTaskEvents } from './StepTaskEvents.js'
import { StepValidation } from './StepValidation.js'

const electron = window.electron

interface BidsWizardProps {
  nv: Niivue | null
  onConversionComplete?: (mappings: BidsSeriesMapping[]) => void
  onLoadVolume?: (niftiPath: string) => Promise<void>
  onLoadWithOverlay?: (basePath: string, overlayPath: string) => Promise<void>
}

const WIZARD_STEPS: WizardStep[] = [
  { label: 'Source', description: 'Select DICOM source folder' },
  { label: 'Convert', description: 'Convert DICOM to NIfTI' },
  { label: 'Skull Strip', description: 'Optional brain extraction' },
  { label: 'Classify', description: 'Assign BIDS labels' },
  { label: 'Events', description: 'Task event annotations' },
  { label: 'Subject', description: 'Subject & session info' },
  { label: 'Metadata', description: 'Dataset metadata' },
  { label: 'Validate', description: 'Review & write' }
]

const defaultConfig: BidsDatasetConfig = {
  name: '',
  bidsVersion: '1.9.0',
  license: 'CC0',
  authors: [],
  readme: '',
  outputDir: ''
}

export function BidsWizard({
  nv,
  onConversionComplete,
  onLoadVolume,
  onLoadWithOverlay
}: BidsWizardProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Source
  const [dicomDir, setDicomDir] = useState('')
  const [series, setSeries] = useState<DicomSeries[]>([])
  const [selectedSeries, setSelectedSeries] = useState<Set<number>>(new Set())

  // Step 2-3: Conversion + Classification
  const [mappings, setMappings] = useState<BidsSeriesMapping[]>([])
  const [converted, setConverted] = useState(false)

  // Step 4: Subject/Session
  const [subject, setSubject] = useState('01')
  const [session, setSession] = useState('')
  const [demographics, setDemographics] = useState<ParticipantDemographics>({
    age: '',
    sex: '',
    handedness: '',
    group: ''
  })
  const [fieldmapIntendedFor, setFieldmapIntendedFor] = useState<FieldmapIntendedFor[]>([])
  const [detectedSubjects, setDetectedSubjects] = useState<DetectedSubject[]>([])

  // Step 5: Metadata
  const [config, setConfig] = useState<BidsDatasetConfig>({ ...defaultConfig })

  // Skull strip cache (persists across step navigation)
  const [skullStripCompleted, setSkullStripCompleted] = useState<Set<number>>(new Set())
  const [skullStripOriginalPaths, setSkullStripOriginalPaths] = useState<Map<number, string>>(new Map())
  const [skullStripUseStripped, setSkullStripUseStripped] = useState<Map<number, boolean>>(new Map())

  // Validation
  const [validationResult, setValidationResult] = useState<BidsValidationResult | null>(null)
  const [_validating, setValidating] = useState(false)
  const [highlightedSeriesIndex, setHighlightedSeriesIndex] = useState<number | null>(null)
  const [bidsWritten, setBidsWritten] = useState(false)

  // Listen for menu trigger
  useEffect((): (() => void) => {
    const handleOpen = (): void => setOpen(true)
    electron.ipcRenderer.on('bids:open-wizard', handleOpen)
    return (): void => {
      electron.ipcRenderer.removeAllListeners('bids:open-wizard')
    }
  }, [])

  useEffect((): (() => void) => {
    const handleClearScene = (): void => {
      reset()
      setOpen(false)
    }
    electron.ipcRenderer.on('clear-scene', handleClearScene)
    return (): void => {
      electron.ipcRenderer.removeListener('clear-scene', handleClearScene)
    }
  }, [])

  // Restore saved BIDS state when wizard opens
  useEffect(() => {
    if (!open || !nv) return
    const saved = deserializeBidsState(nv.document.customData || '')
    if (!saved) return
    setMappings(saved.mappings)
    setFieldmapIntendedFor(saved.fieldmapIntendedFor)
    setDemographics(saved.demographics)
    setDetectedSubjects(saved.detectedSubjects)
    setConfig(saved.config)
    setSubject(saved.subject)
    setSession(saved.session)
    setStep(saved.step)
    setDicomDir(saved.dicomDir)
    if (saved.mappings.length > 0) setConverted(true)
  }, [open, nv])

  // Auto-save BIDS state
  useEffect(() => {
    if (!open || !nv || mappings.length === 0) return
    const state: BidsWizardState = {
      mappings,
      fieldmapIntendedFor,
      demographics,
      detectedSubjects,
      config,
      subject,
      session,
      step,
      dicomDir
    }
    nv.document.customData = serializeBidsState(nv.document.customData || '', state)
  }, [
    open, nv, mappings, fieldmapIntendedFor, demographics,
    detectedSubjects, config, subject, session, step, dicomDir
  ])

  const reset = (): void => {
    setStep(0)
    setError(null)
    setDicomDir('')
    setSeries([])
    setSelectedSeries(new Set())
    setMappings([])
    setConverted(false)
    setSubject('01')
    setSession('')
    setConfig({ ...defaultConfig })
    setDemographics({ age: '', sex: '', handedness: '', group: '' })
    setDetectedSubjects([])
    setFieldmapIntendedFor([])
    setValidationResult(null)
    setHighlightedSeriesIndex(null)
    setBidsWritten(false)
    setSkullStripCompleted(new Set())
    setSkullStripOriginalPaths(new Map())
    setSkullStripUseStripped(new Map())
  }

  const handleClose = (): void => {
    reset()
    setOpen(false)
  }

  const applySubjectSession = (mappingList: BidsSeriesMapping[]): BidsSeriesMapping[] => {
    if (detectedSubjects.length > 1) return mappingList
    return mappingList.map((m) => ({
      ...m,
      subject: subject || '01',
      session
    }))
  }

  const handleConversionComplete = async (
    newMappings: BidsSeriesMapping[],
    newDemographics?: ParticipantDemographics,
    newDetectedSubjects?: DetectedSubject[]
  ): Promise<void> => {
    setMappings(newMappings)
    setConverted(true)
    if (newDemographics) setDemographics(newDemographics)
    if (newDetectedSubjects) {
      setDetectedSubjects(newDetectedSubjects)
      if (newDetectedSubjects.length === 1) setSubject(newDetectedSubjects[0].label)
    }
    onConversionComplete?.(newMappings)
    const suggested = await electron.bidsSuggestFieldmapMappings(newMappings)
    if (suggested.length > 0) setFieldmapIntendedFor(suggested)
  }

  const handleUpdateMapping = (index: number, changes: Partial<BidsSeriesMapping>): void => {
    setMappings((prev) => prev.map((m) => (m.index === index ? { ...m, ...changes } : m)))
  }

  const handleUpdateSidecar = (index: number, field: string, value: unknown): void => {
    setMappings((prev) =>
      prev.map((m) => {
        if (m.index !== index || !m.sidecarData) return m
        const newOverrides = { ...m.sidecarData.overrides }
        if (value === undefined) {
          delete (newOverrides as Record<string, unknown>)[field]
        } else {
          ;(newOverrides as Record<string, unknown>)[field] = value
        }
        return { ...m, sidecarData: { ...m.sidecarData, overrides: newOverrides } }
      })
    )
  }

  const handleUpdateDetectedSubject = (
    subjectIndex: number,
    changes: Partial<DetectedSubject>
  ): void => {
    setDetectedSubjects((prev) => {
      const updated = [...prev]
      const old = updated[subjectIndex]
      const newSubject = { ...old, ...changes }
      updated[subjectIndex] = newSubject

      if (changes.label && changes.label !== old.label) {
        setMappings((prevMappings) =>
          prevMappings.map((m) => {
            if (m.subject === old.label) return { ...m, subject: changes.label! }
            return m
          })
        )
      }

      return updated
    })
  }

  const handleUpdateDetectedSubjectDemographics = (
    subjectIndex: number,
    field: keyof ParticipantDemographics,
    value: string
  ): void => {
    setDetectedSubjects((prev) => {
      const updated = [...prev]
      updated[subjectIndex] = {
        ...updated[subjectIndex],
        demographics: { ...updated[subjectIndex].demographics, [field]: value }
      }
      return updated
    })
  }

  const handleUpdateDetectedSessionLabel = (
    subjectIndex: number,
    sessionIndex: number,
    label: string
  ): void => {
    setDetectedSubjects((prev) => {
      const updated = [...prev]
      const sub = { ...updated[subjectIndex] }
      const sessions = [...sub.sessions]
      const oldLabel = sessions[sessionIndex].label
      sessions[sessionIndex] = { ...sessions[sessionIndex], label }
      sub.sessions = sessions
      updated[subjectIndex] = sub

      setMappings((prevMappings) =>
        prevMappings.map((m) => {
          if (m.subject === sub.label && m.session === oldLabel) {
            return { ...m, session: label }
          }
          return m
        })
      )

      return updated
    })
  }

  const updateConfig = <K extends keyof BidsDatasetConfig>(
    key: K,
    value: BidsDatasetConfig[K]
  ): void => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const runValidation = useCallback(async (): Promise<void> => {
    if (mappings.length === 0 || !converted) return
    setValidating(true)
    try {
      const result = await electron.bidsValidate({
        config,
        mappings: applySubjectSession(mappings),
        fieldmapIntendedFor,
        demographics,
        allDemographics:
          detectedSubjects.length > 1
            ? Object.fromEntries(detectedSubjects.map((ds) => [ds.label, ds.demographics]))
            : undefined
      })
      setValidationResult(result)
    } catch {
      // validation failure is non-fatal
    } finally {
      setValidating(false)
    }
  }, [mappings, config, fieldmapIntendedFor, subject, session, demographics, detectedSubjects, converted])

  function getStepForIssue(issue: BidsValidationIssue): number {
    if (issue.targetStep != null) return issue.targetStep
    const msg = (issue.message || '').toLowerCase()
    if (msg.includes('dataset') || msg.includes('output dir') || msg.includes('readme')) return 6
    if (msg.includes('participant') || msg.includes('subject') || msg.includes('session')) return 5
    if (msg.includes('event') || msg.includes('onset') || msg.includes('duration')) return 4
    return 3
  }

  const handleIssueClick = (issue: BidsValidationIssue): void => {
    const targetStep = getStepForIssue(issue)
    setStep(targetStep)
    if (issue.seriesIndex != null) setHighlightedSeriesIndex(issue.seriesIndex)
  }

  const currentMappings = applySubjectSession(mappings)

  const getAllDemographics = (): Record<string, ParticipantDemographics> | undefined => {
    if (detectedSubjects.length <= 1) return undefined
    const result: Record<string, ParticipantDemographics> = {}
    for (const ds of detectedSubjects) result[ds.label] = ds.demographics
    return result
  }

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return (dicomDir !== '' && selectedSeries.size > 0) || converted
      case 1:
        return converted
      case 2:
        return true
      case 3:
        return mappings.some((m) => !m.excluded)
      case 4:
        return true
      case 5:
        if (detectedSubjects.length > 1) {
          return detectedSubjects.every(
            (ds) => ds.label.trim() !== '' && /^[a-zA-Z0-9]+$/.test(ds.label)
          )
        }
        return subject.trim() !== '' && /^[a-zA-Z0-9]+$/.test(subject)
      case 6:
        return config.name.trim() !== '' && config.outputDir.trim() !== ''
      default:
        return true
    }
  }

  const handleStepChange = (newStep: number): void => {
    setStep(newStep)
  }

  return (
    <WizardShell
      open={open}
      onClose={handleClose}
      title="Convert DICOM to BIDS"
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={handleStepChange}
      canProceed={canProceed()}
      lastStepLabel="Validate & Write"
    >
      {error && (
        <Callout.Root color="red" size="2" className="mb-4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            {error}
            <button className="ml-2 underline" onClick={() => setError(null)}>
              Dismiss
            </button>
          </Callout.Text>
        </Callout.Root>
      )}

      {step === 0 && (
        <StepSelectSource
          dicomDir={dicomDir}
          setDicomDir={setDicomDir}
          series={series}
          setSeries={setSeries}
          selectedSeries={selectedSeries}
          setSelectedSeries={setSelectedSeries}
          onImportNifti={async (dir: string) => {
            const result = await electron.bidsImportNiftiDir(dir)
            if (!result.success) {
              setError(result.error || 'Failed to import NIfTI directory')
              return
            }
            await handleConversionComplete(
              result.mappings!,
              result.demographics,
              result.detectedSubjects
            )
            setStep(2)
          }}
        />
      )}
      {step === 1 && (
        <StepConversion
          dicomDir={dicomDir}
          selectedSeries={selectedSeries}
          onComplete={handleConversionComplete}
          onError={(err: string) => setError(err)}
          alreadyConverted={converted}
        />
      )}
      {step === 2 && (
        <StepSkullStrip
          mappings={mappings}
          onMappingsUpdate={setMappings}
          nv={nv}
          onLoadVolume={bidsWritten ? undefined : onLoadVolume}
          onLoadWithOverlay={bidsWritten ? undefined : onLoadWithOverlay}
          completed={skullStripCompleted}
          onCompletedChange={setSkullStripCompleted}
          originalPaths={skullStripOriginalPaths}
          onOriginalPathsChange={setSkullStripOriginalPaths}
          useStripped={skullStripUseStripped}
          onUseStrippedChange={setSkullStripUseStripped}
        />
      )}
      {step === 3 && (
        <StepClassification
          mappings={currentMappings}
          onUpdateMapping={handleUpdateMapping}
          onUpdateSidecar={handleUpdateSidecar}
          datasetName={config.name}
          fieldmapIntendedFor={fieldmapIntendedFor}
          onUpdateFieldmapMappings={setFieldmapIntendedFor}
          highlightedSeriesIndex={highlightedSeriesIndex}
          onClearHighlight={() => setHighlightedSeriesIndex(null)}
        />
      )}
      {step === 4 && (
        <StepTaskEvents
          mappings={currentMappings}
          onUpdateMapping={handleUpdateMapping}
        />
      )}
      {step === 5 && (
        <StepSubjectSession
          subject={subject}
          setSubject={setSubject}
          session={session}
          setSession={setSession}
          mappings={currentMappings}
          demographics={demographics}
          setDemographics={setDemographics}
          detectedSubjects={detectedSubjects}
          onUpdateDetectedSubject={handleUpdateDetectedSubject}
          onUpdateDetectedSubjectDemographics={handleUpdateDetectedSubjectDemographics}
          onUpdateDetectedSessionLabel={handleUpdateDetectedSessionLabel}
        />
      )}
      {step === 6 && <StepMetadata config={config} onUpdateConfig={updateConfig} />}
      {step === 7 && (
        <StepValidation
          config={config}
          mappings={currentMappings}
          demographics={demographics}
          allDemographics={getAllDemographics()}
          fieldmapIntendedFor={fieldmapIntendedFor}
          validationResult={validationResult}
          onNavigateToIssue={handleIssueClick}
          onRevalidate={runValidation}
          onWriteComplete={() => setBidsWritten(true)}
        />
      )}
    </WizardShell>
  )
}
