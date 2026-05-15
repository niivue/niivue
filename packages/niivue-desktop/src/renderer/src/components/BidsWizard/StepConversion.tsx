import { useEffect, useState } from 'react'
import { Text, Callout } from '@radix-ui/themes'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import type { BidsSeriesMapping, ParticipantDemographics, DetectedSubject } from '../../../../common/bidsTypes.js'

const electron = window.electron

interface StepConversionProps {
  dicomDir: string
  selectedSeries: Set<number>
  onComplete: (mappings: BidsSeriesMapping[], demographics?: ParticipantDemographics, detectedSubjects?: DetectedSubject[]) => void
  onError: (error: string) => void
  alreadyConverted: boolean
}

export function StepConversion({
  dicomDir,
  selectedSeries,
  onComplete,
  onError,
  alreadyConverted
}: StepConversionProps): JSX.Element {
  const [status, setStatus] = useState(alreadyConverted ? 'complete' : 'converting')
  const [progress, setProgress] = useState(alreadyConverted ? 100 : 0)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    if (alreadyConverted) return

    let cancelled = false

    const convert = async (): Promise<void> => {
      try {
        setStatus('converting')
        setProgress(10)

        const result = await electron.bidsConvertAndClassify({
          dicomDir,
          seriesNumbers: Array.from(selectedSeries.values())
        })

        if (cancelled) return

        setProgress(100)

        if (!result.success || !result.mappings) {
          setStatus('error')
          onError(result.error || 'Conversion failed')
          return
        }

        if (result.warning) setWarning(result.warning)
        setStatus('complete')
        onComplete(result.mappings, result.demographics, result.detectedSubjects)
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        onError(err instanceof Error ? err.message : String(err))
      }
    }

    void convert()

    return (): void => {
      cancelled = true
    }
  }, []) // Run once on mount

  return (
    <div className="flex flex-col gap-4 items-center py-8">
      <Text size="2" weight="bold">
        {status === 'converting' && 'Converting DICOM to NIfTI…'}
        {status === 'complete' && 'Conversion Complete'}
        {status === 'error' && 'Conversion Failed'}
      </Text>

      <div className="w-full bg-[var(--gray-4)] rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            status === 'error' ? 'bg-[var(--red-9)]' : 'bg-[var(--accent-9)]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <Text size="1" color="gray">
        {status === 'converting' && `Converting ${selectedSeries.size} series with dcm2niix…`}
        {status === 'complete' && 'Series converted and classified. Click Next to review.'}
        {status === 'error' && 'An error occurred during conversion.'}
      </Text>

      {warning && status === 'complete' && (
        <Callout.Root color="amber" variant="soft" className="max-w-md">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{warning}</Callout.Text>
        </Callout.Root>
      )}
    </div>
  )
}
