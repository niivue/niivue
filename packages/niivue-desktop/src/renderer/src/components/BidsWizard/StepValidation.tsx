import { useState } from 'react'
import { Button, Text } from '@radix-ui/themes'
import type {
  BidsSeriesMapping,
  BidsDatasetConfig,
  BidsValidationResult,
  BidsValidationIssue
} from '../../../../common/bidsTypes.js'

const electron = window.electron

interface StepValidationProps {
  config: BidsDatasetConfig
  mappings: BidsSeriesMapping[]
}

export function StepValidation({ config, mappings }: StepValidationProps): JSX.Element {
  const [validationResult, setValidationResult] = useState<BidsValidationResult | null>(null)
  const [writing, setWriting] = useState(false)
  const [writeComplete, setWriteComplete] = useState(false)
  const [writeError, setWriteError] = useState('')
  const [outputPath, setOutputPath] = useState('')

  const handleWrite = async (): Promise<void> => {
    setWriting(true)
    setWriteError('')
    setValidationResult(null)
    try {
      // Write the dataset
      const result = await electron.bidsWrite({ config, mappings })
      if (!result.success) {
        setWriteError(result.error || 'Write failed')
        setWriting(false)
        return
      }

      setOutputPath(result.outputDir || config.outputDir)

      // Auto-validate after writing
      try {
        const validation = await electron.bidsValidate({ config, mappings })
        setValidationResult(validation)
      } catch {
        // Validation failure is non-fatal
      }

      setWriteComplete(true)
    } catch (err) {
      setWriteError(err instanceof Error ? err.message : String(err))
    } finally {
      setWriting(false)
    }
  }

  const renderIssue = (issue: BidsValidationIssue, i: number): JSX.Element => {
    const isError = issue.severity === 'error'
    return (
      <div
        key={i}
        className={`text-xs px-2 py-1 rounded ${
          isError ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
        }`}
      >
        <span className="font-medium">{isError ? 'ERROR' : 'WARN'}: </span>
        {issue.message}
        {issue.file && <span className="ml-1 opacity-70">({issue.file})</span>}
      </div>
    )
  }

  if (writeComplete) {
    return (
      <div className="flex flex-col gap-4 items-center py-8">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">
          {validationResult?.valid !== false ? '\u2713' : '!'}
        </div>
        <Text size="3" weight="bold">
          {validationResult?.valid !== false ? 'BIDS Dataset Created' : 'BIDS Dataset Written (with issues)'}
        </Text>
        <Text size="1" color="gray">
          Your dataset has been written to:
        </Text>
        <Text size="1" className="font-mono bg-gray-100 px-3 py-1 rounded">
          {outputPath}
        </Text>

        {/* Show validation results inline */}
        {validationResult && (
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  validationResult.valid ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <Text size="1" weight="bold">
                {validationResult.valid ? 'Validation Passed' : 'Validation Issues'}
              </Text>
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
            {validationResult.valid && validationResult.warnings.length === 0 && (
              <Text size="1" color="green">No issues found.</Text>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Text size="2" weight="bold">Write Dataset</Text>
      <Text size="1" color="gray">
        Write the BIDS dataset to disk. Validation will run automatically after writing.
      </Text>

      <Button
        onClick={handleWrite}
        disabled={writing}
      >
        {writing ? 'Writing & Validating...' : 'Write Dataset'}
      </Button>

      {writeError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {writeError}
        </div>
      )}
    </div>
  )
}
