import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button, Text, Theme } from '@radix-ui/themes'
import { Cross2Icon } from '@radix-ui/react-icons'
import type { DicomSeries } from '../../../../common/dcm2niixTypes.js'
import type { BidsSeriesMapping, BidsDatasetConfig } from '../../../../common/bidsTypes.js'
import { StepSelectSource } from './StepSelectSource.js'
import { StepConversion } from './StepConversion.js'
import { StepClassification } from './StepClassification.js'
import { StepSubjectSession } from './StepSubjectSession.js'
import { StepMetadata } from './StepMetadata.js'
import { StepValidation } from './StepValidation.js'

const electron = window.electron

interface BidsWizardProps {
  onConversionComplete?: (mappings: BidsSeriesMapping[]) => void
}

const stepLabels = ['Source', 'Convert', 'Classify', 'Subject', 'Metadata', 'Validate']

const defaultConfig: BidsDatasetConfig = {
  name: '',
  bidsVersion: '1.9.0',
  license: 'CC0',
  authors: [],
  outputDir: ''
}

export function BidsWizard({ onConversionComplete }: BidsWizardProps): JSX.Element {
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
  }

  const handleClose = (): void => {
    reset()
    setOpen(false)
  }

  // Apply subject/session to all mappings when they change
  const applySubjectSession = (mappingList: BidsSeriesMapping[]): BidsSeriesMapping[] => {
    return mappingList.map((m) => ({
      ...m,
      subject: subject || '01',
      session
    }))
  }

  const handleConversionComplete = (newMappings: BidsSeriesMapping[]): void => {
    setMappings(newMappings)
    setConverted(true)
    onConversionComplete?.(newMappings)
  }

  const handleConversionError = (err: string): void => {
    setError(err)
  }

  const handleUpdateMapping = (index: number, changes: Partial<BidsSeriesMapping>): void => {
    setMappings((prev) =>
      prev.map((m) => (m.index === index ? { ...m, ...changes } : m))
    )
  }

  const updateConfig = <K extends keyof BidsDatasetConfig>(key: K, value: BidsDatasetConfig[K]): void => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  // Get mappings with current subject/session applied
  const currentMappings = applySubjectSession(mappings)

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return dicomDir !== '' && selectedSeries.size > 0
      case 1:
        return converted
      case 2:
        return mappings.some((m) => !m.excluded)
      case 3:
        return subject.trim() !== '' && /^[a-zA-Z0-9]+$/.test(subject)
      case 4:
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
                  <StepClassification
                    mappings={currentMappings}
                    onUpdateMapping={handleUpdateMapping}
                    datasetName={config.name}
                  />
                )}
                {step === 3 && (
                  <StepSubjectSession
                    subject={subject}
                    setSubject={setSubject}
                    session={session}
                    setSession={setSession}
                    mappings={currentMappings}
                  />
                )}
                {step === 4 && (
                  <StepMetadata
                    config={config}
                    onUpdateConfig={updateConfig}
                  />
                )}
                {step === 5 && (
                  <StepValidation
                    config={config}
                    mappings={currentMappings}
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
                {step < 5 && (
                  <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                    Next
                  </Button>
                )}
                {step === 5 && (
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
