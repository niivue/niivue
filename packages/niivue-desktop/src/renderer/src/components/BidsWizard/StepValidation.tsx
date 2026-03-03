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
  const [validating, setValidating] = useState(false)
  const [writing, setWriting] = useState(false)
  const [writeComplete, setWriteComplete] = useState(false)
  const [writeError, setWriteError] = useState('')
  const [outputPath, setOutputPath] = useState('')

  const handleValidate = async (): Promise<void> => {
    setValidating(true)
    try {
      const result = await electron.bidsValidate({ config, mappings })
      setValidationResult(result)
    } catch (err) {
      setValidationResult({
        valid: false,
        errors: [{ severity: 'error', message: err instanceof Error ? err.message : String(err) }],
        warnings: []
      })
    } finally {
      setValidating(false)
    }
  }

  const handleWrite = async (): Promise<void> => {
    setWriting(true)
    setWriteError('')
    try {
      const result = await electron.bidsWrite({ config, mappings })
      if (result.success) {
        setWriteComplete(true)
        setOutputPath(result.outputDir || config.outputDir)
      } else {
        setWriteError(result.error || 'Write failed')
      }
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
          {'✓'}
        </div>
        <Text size="3" weight="bold">BIDS Dataset Created</Text>
        <Text size="1" color="gray">
          Your dataset has been written to:
        </Text>
        <Text size="1" className="font-mono bg-gray-100 px-3 py-1 rounded">
          {outputPath}
        </Text>
        <Text size="1" color="gray" className="text-center max-w-md">
          You can validate your dataset with the BIDS Validator CLI:
          <br />
          <code className="bg-gray-100 px-1 rounded">npx bids-validator {outputPath}</code>
        </Text>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Text size="2" weight="bold">Validate & Write</Text>
      <Text size="1" color="gray">
        Validate the proposed BIDS structure before writing to disk.
      </Text>

      <div className="flex gap-2">
        <Button variant="soft" onClick={handleValidate} disabled={validating}>
          {validating ? 'Validating...' : 'Validate'}
        </Button>
        <Button
          onClick={handleWrite}
          disabled={writing || (validationResult !== null && !validationResult.valid)}
        >
          {writing ? 'Writing...' : 'Write Dataset'}
        </Button>
      </div>

      {writeError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {writeError}
        </div>
      )}

      {validationResult && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                validationResult.valid ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <Text size="2" weight="bold">
              {validationResult.valid ? 'Valid' : 'Issues Found'}
            </Text>
          </div>

          {validationResult.errors.length > 0 && (
            <div className="flex flex-col gap-1">
              <Text size="1" weight="medium" color="red">
                Errors ({validationResult.errors.length})
              </Text>
              {validationResult.errors.map((e, i) => renderIssue(e, i))}
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="flex flex-col gap-1">
              <Text size="1" weight="medium" color="yellow">
                Warnings ({validationResult.warnings.length})
              </Text>
              {validationResult.warnings.map((w, i) => renderIssue(w, i))}
            </div>
          )}

          {validationResult.valid && validationResult.warnings.length === 0 && (
            <Text size="1" color="green">
              No issues found. Ready to write.
            </Text>
          )}
        </div>
      )}
    </div>
  )
}
