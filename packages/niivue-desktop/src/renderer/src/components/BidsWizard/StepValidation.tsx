import { useState } from 'react'
import { Button, Text } from '@radix-ui/themes'
import type {
  BidsSeriesMapping,
  BidsDatasetConfig,
  BidsValidationResult,
  BidsValidationIssue,
  ParticipantDemographics,
  FieldmapIntendedFor
} from '../../../../common/bidsTypes.js'

const electron = window.electron

interface StepValidationProps {
  config: BidsDatasetConfig
  mappings: BidsSeriesMapping[]
  demographics?: ParticipantDemographics
  allDemographics?: Record<string, ParticipantDemographics>
  fieldmapIntendedFor?: FieldmapIntendedFor[]
  validationResult?: BidsValidationResult | null
  onNavigateToIssue?: (issue: BidsValidationIssue) => void
  onRevalidate?: () => Promise<void>
  onWriteComplete?: () => void
}

export function StepValidation({
  config,
  mappings,
  demographics,
  allDemographics,
  fieldmapIntendedFor,
  validationResult,
  onNavigateToIssue,
  onRevalidate,
  onWriteComplete
}: StepValidationProps): JSX.Element {
  const [writing, setWriting] = useState(false)
  const [writeComplete, setWriteComplete] = useState(false)
  const [writeError, setWriteError] = useState('')
  const [outputPath, setOutputPath] = useState('')
  const [postWriteResult, setPostWriteResult] = useState<BidsValidationResult | null>(null)

  const handleWrite = async (): Promise<void> => {
    setWriting(true)
    setWriteError('')
    setPostWriteResult(null)
    try {
      const result = await electron.bidsWrite({
        config,
        mappings,
        demographics,
        allDemographics,
        fieldmapIntendedFor
      })
      if (!result.success) {
        setWriteError(result.error || 'Write failed')
        setWriting(false)
        return
      }

      setOutputPath(result.outputDir || config.outputDir)

      // Run post-write validation against the actual output
      try {
        const validation = await electron.bidsValidateWritten(
          result.outputDir || config.outputDir,
          mappings
        )
        setPostWriteResult(validation)
      } catch {
        // Validation failure is non-fatal
      }

      setWriteComplete(true)
      onWriteComplete?.()
    } catch (err) {
      setWriteError(err instanceof Error ? err.message : String(err))
    } finally {
      setWriting(false)
    }
  }

  const displayResult = postWriteResult || validationResult

  const renderIssue = (issue: BidsValidationIssue, i: number): JSX.Element => {
    const isError = issue.severity === 'error'
    const clickable = onNavigateToIssue && !writeComplete
    return (
      <button
        key={i}
        className={`text-left w-full text-xs px-2 py-1 rounded ${
          isError ? 'bg-[var(--red-3)] text-[var(--red-11)]' : 'bg-[var(--yellow-3)] text-[var(--yellow-11)]'
        } ${clickable ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
        onClick={() => clickable && onNavigateToIssue(issue)}
        disabled={!clickable}
      >
        <span className="font-medium">{isError ? 'ERROR' : 'WARN'}: </span>
        {issue.message}
        {issue.file && <span className="ml-1 opacity-70">({issue.file})</span>}
      </button>
    )
  }

  if (writeComplete) {
    return (
      <div className="flex flex-col gap-4 items-center py-8">
        <div className="w-16 h-16 rounded-full bg-[var(--green-3)] flex items-center justify-center text-3xl">
          {displayResult?.valid !== false ? '\u2713' : '!'}
        </div>
        <Text size="3" weight="bold">
          {displayResult?.valid !== false
            ? 'BIDS Dataset Created'
            : 'BIDS Dataset Written (with issues)'}
        </Text>
        <Text size="1" color="gray">
          Your dataset has been written to:
        </Text>
        <Text size="1" className="font-mono bg-[var(--gray-3)] px-3 py-1 rounded">
          {outputPath}
        </Text>

        {displayResult && (
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  displayResult.valid ? 'bg-[var(--green-9)]' : 'bg-[var(--red-9)]'
                }`}
              />
              <Text size="1" weight="bold">
                {displayResult.valid ? 'Validation Passed' : 'Validation Issues'}
              </Text>
            </div>
            {displayResult.errors.length > 0 && (
              <div className="flex flex-col gap-1 mb-2">
                {displayResult.errors.map((e, i) => renderIssue(e, i))}
              </div>
            )}
            {displayResult.warnings.length > 0 && (
              <div className="flex flex-col gap-1">
                {displayResult.warnings.map((w, i) => renderIssue(w, i))}
              </div>
            )}
            {displayResult.valid && displayResult.warnings.length === 0 && (
              <Text size="1" color="green">
                No issues found.
              </Text>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Text size="2" weight="bold">
        Write Dataset
      </Text>
      <Text size="1" color="gray">
        Write the BIDS dataset to disk. The official bids-validator will run automatically after
        writing.
      </Text>

      {/* Pre-write validation summary */}
      {validationResult && (
        <div className="border rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-3 h-3 rounded-full ${validationResult.valid ? 'bg-[var(--green-9)]' : 'bg-[var(--red-9)]'}`}
            />
            <Text size="1" weight="bold">
              {validationResult.valid
                ? 'Pre-write Validation Passed'
                : 'Pre-write Validation Issues'}
            </Text>
            {onRevalidate && (
              <Button size="1" variant="ghost" onClick={onRevalidate} className="ml-auto">
                Re-validate
              </Button>
            )}
          </div>
          {validationResult.errors.length > 0 && (
            <div className="flex flex-col gap-1 mb-2">
              {validationResult.errors.map((e, i) => renderIssue(e, i))}
            </div>
          )}
          {validationResult.warnings.length > 0 && (
            <div className="flex flex-col gap-1">
              {validationResult.warnings.map((w, i) => renderIssue(w, i))}
            </div>
          )}
        </div>
      )}

      <Button onClick={handleWrite} disabled={writing}>
        {writing ? 'Writing & Validating...' : 'Write Dataset'}
      </Button>

      {writeError && (
        <div className="text-xs text-[var(--red-11)] bg-[var(--red-3)] border border-[var(--red-6)] rounded p-2">
          {writeError}
        </div>
      )}
    </div>
  )
}
