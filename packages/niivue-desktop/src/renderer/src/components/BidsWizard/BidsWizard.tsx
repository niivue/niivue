import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button, Text, Theme } from '@radix-ui/themes'
import { Cross2Icon } from '@radix-ui/react-icons'
import type { Niivue } from '@niivue/niivue'
import type { DicomSeries } from '../../../../common/dcm2niixTypes.js'
import type { BidsSeriesMapping, BidsDatasetConfig, ParticipantDemographics, DetectedSubject, FieldmapIntendedFor, BidsWizardState } from '../../../../common/bidsTypes.js'
import { serializeBidsState, deserializeBidsState } from '../../../../common/bidsState.js'
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

const stepLabels = ['Source', 'Convert', 'Skull Strip', 'Classify', 'Events', 'Subject', 'Metadata', 'Validate']

const defaultConfig: BidsDatasetConfig = {
  name: '',
  bidsVersion: '1.9.0',
  license: 'CC0',
  authors: [],
  outputDir: ''
}

export function BidsWizard({ nv, onConversionComplete, onLoadVolume, onLoadWithOverlay }: BidsWizardProps): JSX.Element {
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

  // Step 4: Demographics
  const [demographics, setDemographics] = useState<ParticipantDemographics>({
    age: '', sex: '', handedness: '', group: ''
  })

  // Fieldmap IntendedFor mappings
  const [fieldmapIntendedFor, setFieldmapIntendedFor] = useState<FieldmapIntendedFor[]>([])

  // Multi-subject detection
  const [detectedSubjects, setDetectedSubjects] = useState<DetectedSubject[]>([])

  // Step 5: Metadata
  const [config, setConfig] = useState<BidsDatasetConfig>({ ...defaultConfig })

  // Listen for menu trigger
  useEffect((): (() => void) => {
    const handleOpen = (): void => {
      setOpen(true)
    }
    electron.ipcRenderer.on('bids:open-wizard', handleOpen)
    return (): void => {
      electron.ipcRenderer.removeAllListeners('bids:open-wizard')
    }
  }, [])

  // Clear BIDS wizard state when scene is cleared
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
    if (saved.mappings.length > 0) {
      setConverted(true)
    }
  }, [open, nv])

  // Auto-save BIDS state to NVDocument.customData on meaningful state changes
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
  }, [open, nv, mappings, fieldmapIntendedFor, demographics, detectedSubjects, config, subject, session, step, dicomDir])

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
  }

  const handleClose = (): void => {
    reset()
    setOpen(false)
  }

  // Apply subject/session to all mappings when they change (single-subject mode only)
  const applySubjectSession = (mappingList: BidsSeriesMapping[]): BidsSeriesMapping[] => {
    if (detectedSubjects.length > 1) {
      // Multi-subject: mappings already have per-series subject/session
      return mappingList
    }
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
    if (newDemographics) {
      setDemographics(newDemographics)
    }
    if (newDetectedSubjects) {
      setDetectedSubjects(newDetectedSubjects)
      // If single subject detected, use its label
      if (newDetectedSubjects.length === 1) {
        setSubject(newDetectedSubjects[0].label)
      }
    }
    onConversionComplete?.(newMappings)
    // Auto-suggest fieldmap IntendedFor mappings
    const suggested = await electron.bidsSuggestFieldmapMappings(newMappings)
    if (suggested.length > 0) {
      setFieldmapIntendedFor(suggested)
    }
  }

  const handleConversionError = (err: string): void => {
    setError(err)
  }

  const handleUpdateMapping = (index: number, changes: Partial<BidsSeriesMapping>): void => {
    setMappings((prev) =>
      prev.map((m) => (m.index === index ? { ...m, ...changes } : m))
    )
  }

  const handleUpdateSidecar = (index: number, field: string, value: unknown): void => {
    setMappings(prev => prev.map(m => {
      if (m.index !== index || !m.sidecarData) return m
      const newOverrides = { ...m.sidecarData.overrides }
      if (value === undefined) {
        delete (newOverrides as Record<string, unknown>)[field]
      } else {
        ;(newOverrides as Record<string, unknown>)[field] = value
      }
      return { ...m, sidecarData: { ...m.sidecarData, overrides: newOverrides } }
    }))
  }

  const handleUpdateDetectedSubject = (subjectIndex: number, changes: Partial<DetectedSubject>): void => {
    setDetectedSubjects(prev => {
      const updated = [...prev]
      const old = updated[subjectIndex]
      const newSubject = { ...old, ...changes }
      updated[subjectIndex] = newSubject

      // If label changed, update corresponding mappings
      if (changes.label && changes.label !== old.label) {
        setMappings(prevMappings => prevMappings.map(m => {
          if (m.subject === old.label) {
            return { ...m, subject: changes.label! }
          }
          return m
        }))
      }

      return updated
    })
  }

  const handleUpdateDetectedSubjectDemographics = (subjectIndex: number, field: keyof ParticipantDemographics, value: string): void => {
    setDetectedSubjects(prev => {
      const updated = [...prev]
      updated[subjectIndex] = {
        ...updated[subjectIndex],
        demographics: { ...updated[subjectIndex].demographics, [field]: value }
      }
      return updated
    })
  }

  const handleUpdateDetectedSessionLabel = (subjectIndex: number, sessionIndex: number, label: string): void => {
    setDetectedSubjects(prev => {
      const updated = [...prev]
      const sub = { ...updated[subjectIndex] }
      const sessions = [...sub.sessions]
      const oldLabel = sessions[sessionIndex].label
      sessions[sessionIndex] = { ...sessions[sessionIndex], label }
      sub.sessions = sessions
      updated[subjectIndex] = sub

      // Update corresponding mappings
      setMappings(prevMappings => prevMappings.map(m => {
        if (m.subject === sub.label && m.session === oldLabel) {
          return { ...m, session: label }
        }
        return m
      }))

      return updated
    })
  }

  const updateConfig = <K extends keyof BidsDatasetConfig>(key: K, value: BidsDatasetConfig[K]): void => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  // Get mappings with current subject/session applied
  const currentMappings = applySubjectSession(mappings)

  // Build allDemographics for multi-subject write
  const getAllDemographics = (): Record<string, ParticipantDemographics> | undefined => {
    if (detectedSubjects.length <= 1) return undefined
    const result: Record<string, ParticipantDemographics> = {}
    for (const ds of detectedSubjects) {
      result[ds.label] = ds.demographics
    }
    return result
  }

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return dicomDir !== '' && selectedSeries.size > 0
      case 1:
        return converted
      case 2:
        return true // Skull strip is optional
      case 3:
        return mappings.some((m) => !m.excluded)
      case 4:
        return true // Events are optional
      case 5:
        if (detectedSubjects.length > 1) {
          return detectedSubjects.every(ds => ds.label.trim() !== '' && /^[a-zA-Z0-9]+$/.test(ds.label))
        }
        return subject.trim() !== '' && /^[a-zA-Z0-9]+$/.test(subject)
      case 6:
        return config.name.trim() !== '' && config.outputDir.trim() !== ''
      default:
        return true
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/40 fixed inset-0 z-40" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg shadow-lg w-[900px] max-h-[90vh] overflow-visible z-50">
          <Theme>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title asChild>
                  <Text size="4" weight="bold">Convert DICOM to BIDS</Text>
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-1 rounded hover:bg-gray-100">
                    <Cross2Icon />
                  </button>
                </Dialog.Close>
              </div>

              {/* Step indicator */}
              <div className="flex gap-2 mb-5">
                {stepLabels.map((label, i) => (
                  <div key={label} className="flex items-center gap-1">
                    <div
                      className={
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ' +
                        (i === step
                          ? 'bg-blue-600 text-white'
                          : i < step
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-500')
                      }
                    >
                      {i < step ? '\u2713' : i + 1}
                    </div>
                    <Text size="1" color={i === step ? undefined : 'gray'}>
                      {label}
                    </Text>
                    {i < stepLabels.length - 1 && <div className="w-4 h-px bg-gray-300 mx-1" />}
                  </div>
                ))}
              </div>

              {error && (
                <div className="mb-3 p-2 text-xs text-red-700 bg-red-50 rounded border border-red-200">
                  {error}
                  <button
                    className="ml-2 underline text-red-600"
                    onClick={() => setError(null)}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Step content */}
              <div className="min-h-[300px]">
                {step === 0 && (
                  <StepSelectSource
                    dicomDir={dicomDir}
                    setDicomDir={setDicomDir}
                    series={series}
                    setSeries={setSeries}
                    selectedSeries={selectedSeries}
                    setSelectedSeries={setSelectedSeries}
                  />
                )}
                {step === 1 && (
                  <StepConversion
                    dicomDir={dicomDir}
                    selectedSeries={selectedSeries}
                    onComplete={handleConversionComplete}
                    onError={handleConversionError}
                    alreadyConverted={converted}
                  />
                )}
                {step === 2 && (
                  <StepSkullStrip
                    mappings={mappings}
                    onMappingsUpdate={setMappings}
                    nv={nv}
                    onLoadVolume={onLoadVolume}
                    onLoadWithOverlay={onLoadWithOverlay}
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
                {step === 6 && (
                  <StepMetadata
                    config={config}
                    onUpdateConfig={updateConfig}
                  />
                )}
                {step === 7 && (
                  <StepValidation
                    config={config}
                    mappings={currentMappings}
                    demographics={demographics}
                    allDemographics={getAllDemographics()}
                    fieldmapIntendedFor={fieldmapIntendedFor}
                  />
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
                <Button
                  variant="soft"
                  color="gray"
                  onClick={() => (step === 0 ? handleClose() : setStep(step - 1))}
                >
                  {step === 0 ? 'Cancel' : 'Back'}
                </Button>
                {step < 7 && (
                  <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                    Next
                  </Button>
                )}
                {step === 7 && (
                  <Button variant="soft" color="gray" onClick={handleClose}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          </Theme>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
