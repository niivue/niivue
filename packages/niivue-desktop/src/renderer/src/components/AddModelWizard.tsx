import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button, Text, Select, Theme, Checkbox, Flex } from '@radix-ui/themes'
import { Cross2Icon } from '@radix-ui/react-icons'
import type { ModelInfo, ModelType, ModelCategory } from '../services/brainchop/types.js'
import { modelManager } from '../services/brainchop/ModelManager.js'

interface AddModelWizardProps {
  open: boolean
  onClose: () => void
  onModelAdded: () => void
}

interface WizardState {
  // Source
  sourceType: 'folder' | 'url' | null
  folderPath: string
  remoteUrl: string
  hasLabelsFile: boolean
  // Basic info
  name: string
  description: string
  type: ModelType
  category: ModelCategory
  outputClasses: number
  labelsPath: string
  // Inference settings
  inputShape: [number, number, number, number]
  enableSeqConv: boolean
  cropPadding: number
  autoThreshold: number
  enableQuantileNorm: boolean
  enableTranspose: boolean
  // Performance
  estimatedTimeSeconds: number
  memoryRequirementMB: number
}

const defaultState: WizardState = {
  sourceType: null,
  folderPath: '',
  remoteUrl: '',
  hasLabelsFile: false,
  name: '',
  description: '',
  type: 'tissue-segmentation',
  category: 'Tissue Segmentation',
  outputClasses: 3,
  labelsPath: '',
  inputShape: [1, 256, 256, 256],
  enableSeqConv: false,
  cropPadding: 18,
  autoThreshold: 0.02,
  enableQuantileNorm: false,
  enableTranspose: true,
  estimatedTimeSeconds: 10,
  memoryRequirementMB: 800
}

const typeToCategory: Record<ModelType, ModelCategory> = {
  'tissue-segmentation': 'Tissue Segmentation',
  'brain-extraction': 'Brain Extraction',
  parcellation: 'Regional Parcellation'
}

const stepLabels = ['Source', 'Basic Info', 'Inference', 'Review']

export function AddModelWizard({ open, onClose, onModelAdded }: AddModelWizardProps): JSX.Element {
  const [step, setStep] = useState(0)
  const [state, setState] = useState<WizardState>({ ...defaultState })
  const [error, setError] = useState<string | null>(null)

  const update = <K extends keyof WizardState>(key: K, value: WizardState[K]): void => {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  const reset = (): void => {
    setStep(0)
    setState({ ...defaultState })
    setError(null)
  }

  const handleClose = (): void => {
    reset()
    onClose()
  }

  const handleLoadFolder = async (): Promise<void> => {
    setError(null)
    try {
      const result = await window.electron.selectModelFolder()
      if (!result) return
      setState((prev) => ({
        ...prev,
        sourceType: 'folder',
        folderPath: result.folderPath,
        hasLabelsFile: result.hasLabels,
        name: result.folderName,
        labelsPath: result.hasLabels ? `${result.folderPath}/labels.json` : ''
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleSubmit = (): void => {
    const modelInfo: ModelInfo = {
      id: `user-${state.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
      name: state.name,
      type: state.type,
      category: state.category,
      description: state.description,
      expectedInputShape: state.inputShape,
      outputClasses: state.outputClasses,
      modelPath: state.sourceType === 'folder' ? state.folderPath : '',
      labelsPath: state.labelsPath || undefined,
      estimatedTimeSeconds: state.estimatedTimeSeconds,
      memoryRequirementMB: state.memoryRequirementMB,
      enableSeqConv: state.enableSeqConv,
      cropPadding: state.cropPadding,
      autoThreshold: state.autoThreshold,
      enableQuantileNorm: state.enableQuantileNorm,
      enableTranspose: state.enableTranspose,
      isBundled: false,
      remoteUrl: state.sourceType === 'url' ? state.remoteUrl : undefined
    }

    modelManager.registerUserModel(modelInfo)
    onModelAdded()
    handleClose()
  }

  const canProceed = (): boolean => {
    if (step === 0) return state.sourceType !== null && (state.folderPath !== '' || state.remoteUrl !== '')
    if (step === 1) return state.name.trim() !== ''
    return true
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/40 fixed inset-0 z-40" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg shadow-lg w-[600px] max-h-[90vh] overflow-visible z-50">
          <Theme>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title asChild>
                  <Text size="4" weight="bold">Add Model</Text>
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
                      {i < step ? '✓' : i + 1}
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
                </div>
              )}

              {/* Step content */}
              {step === 0 && <StepSource state={state} onLoadFolder={handleLoadFolder} onUpdate={update} />}
              {step === 1 && <StepBasicInfo state={state} onUpdate={update} />}
              {step === 2 && <StepInference state={state} onUpdate={update} />}
              {step === 3 && <StepReview state={state} />}

              {/* Navigation */}
              <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
                <Button
                  variant="soft"
                  color="gray"
                  onClick={() => (step === 0 ? handleClose() : setStep(step - 1))}
                >
                  {step === 0 ? 'Cancel' : 'Back'}
                </Button>
                {step < 3 ? (
                  <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                    Next
                  </Button>
                ) : (
                  <Button onClick={handleSubmit}>Add Model</Button>
                )}
              </div>
            </div>
          </Theme>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ─── Step Components ─── */

function StepSource({
  state,
  onLoadFolder,
  onUpdate
}: {
  state: WizardState
  onLoadFolder: () => void
  onUpdate: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
}): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <Text size="2" weight="bold">Where is your model?</Text>

      {/* Folder option */}
      <button
        onClick={onLoadFolder}
        className={
          'p-4 border-2 rounded-lg text-left transition-colors ' +
          (state.sourceType === 'folder'
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-400')
        }
      >
        <Text size="2" weight="bold" className="block">Local Folder</Text>
        <Text size="1" color="gray">
          Select a folder containing model.json and weight files
        </Text>
        {state.folderPath && (
          <Text size="1" className="block mt-1 text-blue-700 truncate">{state.folderPath}</Text>
        )}
      </button>

      {/* URL option */}
      <div
        className={
          'p-4 border-2 rounded-lg transition-colors ' +
          (state.sourceType === 'url'
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200')
        }
      >
        <Text size="2" weight="bold" className="block mb-2">Remote URL</Text>
        <Text size="1" color="gray" className="block mb-2">
          Enter a URL pointing to model.json
        </Text>
        <input
          type="text"
          value={state.remoteUrl}
          placeholder="https://example.com/models/my-model/model.json"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
          onFocus={() => onUpdate('sourceType', 'url')}
          onChange={(e) => {
            onUpdate('sourceType', 'url')
            onUpdate('remoteUrl', e.target.value)
            if (!state.name && e.target.value) {
              const parts = e.target.value.split('/').filter(Boolean)
              const name = parts[parts.length - 2] || parts[parts.length - 1] || ''
              onUpdate('name', name.replace(/model\.json$/i, '').replace(/[-_]/g, ' ').trim())
            }
          }}
        />
      </div>
    </div>
  )
}

function StepBasicInfo({
  state,
  onUpdate
}: {
  state: WizardState
  onUpdate: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
}): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <Text size="2" weight="bold">Model Information</Text>

      <label className="flex flex-col gap-1">
        <Text size="1" weight="medium">Name *</Text>
        <input
          type="text"
          value={state.name}
          onChange={(e) => onUpdate('name', e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded"
        />
      </label>

      <label className="flex flex-col gap-1">
        <Text size="1" weight="medium">Description</Text>
        <textarea
          value={state.description}
          onChange={(e) => onUpdate('description', e.target.value)}
          rows={2}
          className="px-3 py-2 text-sm border border-gray-300 rounded resize-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <Text size="1" weight="medium">Type</Text>
        <Select.Root
          value={state.type}
          onValueChange={(v: string) => {
            const t = v as ModelType
            onUpdate('type', t)
            onUpdate('category', typeToCategory[t])
            if (t === 'parcellation') {
              onUpdate('enableSeqConv', true)
              onUpdate('cropPadding', 0)
              onUpdate('autoThreshold', 0)
              onUpdate('enableQuantileNorm', true)
            } else if (t === 'tissue-segmentation') {
              onUpdate('enableSeqConv', false)
              onUpdate('cropPadding', 18)
              onUpdate('autoThreshold', 0.02)
              onUpdate('enableQuantileNorm', false)
            } else if (t === 'brain-extraction') {
              onUpdate('enableSeqConv', false)
              onUpdate('cropPadding', 18)
              onUpdate('autoThreshold', 0.02)
              onUpdate('enableQuantileNorm', false)
            }
          }}
        >
          <Select.Trigger className="w-full" />
          <Select.Content position="popper" style={{ zIndex: 9999 }}>
            <Select.Item value="tissue-segmentation">Tissue Segmentation</Select.Item>
            <Select.Item value="brain-extraction">Brain Extraction</Select.Item>
            <Select.Item value="parcellation">Parcellation</Select.Item>
          </Select.Content>
        </Select.Root>
      </label>

      <label className="flex flex-col gap-1">
        <Text size="1" weight="medium">Output Classes</Text>
        <input
          type="number"
          min={1}
          value={state.outputClasses}
          onChange={(e) => onUpdate('outputClasses', parseInt(e.target.value) || 1)}
          className="px-3 py-2 text-sm border border-gray-300 rounded w-24"
        />
      </label>

      <div className="flex flex-col gap-1">
        <Text size="1" weight="medium">Labels File (optional)</Text>
        <div className="flex gap-2">
          <Button
            variant="soft"
            size="1"
            onClick={async () => {
              const filePath = await window.electron.selectColormapFile()
              if (filePath) onUpdate('labelsPath', filePath)
            }}
          >
            Browse...
          </Button>
          <input
            type="text"
            value={state.labelsPath}
            onChange={(e) => onUpdate('labelsPath', e.target.value)}
            placeholder="Local path or https://..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded"
          />
        </div>
        {state.hasLabelsFile && !state.labelsPath && (
          <Text size="1" color="green">labels.json detected in model folder</Text>
        )}
      </div>
    </div>
  )
}

function StepInference({
  state,
  onUpdate
}: {
  state: WizardState
  onUpdate: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
}): JSX.Element {
  const updateShape = (idx: number, val: number): void => {
    const shape = [...state.inputShape] as [number, number, number, number]
    shape[idx] = val
    onUpdate('inputShape', shape)
  }

  return (
    <div className="flex flex-col gap-3">
      <Text size="2" weight="bold">Inference Settings</Text>

      <div className="flex flex-col gap-1">
        <Text size="1" weight="medium">Expected Input Shape</Text>
        <div className="flex gap-2">
          {state.inputShape.map((v, i) => (
            <input
              key={i}
              type="number"
              min={1}
              value={v}
              onChange={(e) => updateShape(i, parseInt(e.target.value) || 1)}
              className="px-2 py-1 text-sm border border-gray-300 rounded w-20"
            />
          ))}
        </div>
      </div>

      <Flex direction="column" gap="2">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={state.enableSeqConv}
            onCheckedChange={(c) => onUpdate('enableSeqConv', c === true)}
          />
          <Text size="1">Enable Sequential Convolution</Text>
        </label>

        <label className="flex items-center gap-2">
          <Checkbox
            checked={state.enableQuantileNorm}
            onCheckedChange={(c) => onUpdate('enableQuantileNorm', c === true)}
          />
          <Text size="1">Enable Quantile Normalization</Text>
        </label>

        <label className="flex items-center gap-2">
          <Checkbox
            checked={state.enableTranspose}
            onCheckedChange={(c) => onUpdate('enableTranspose', c === true)}
          />
          <Text size="1">Enable Transpose</Text>
        </label>
      </Flex>

      <div className="flex gap-4">
        <label className="flex flex-col gap-1">
          <Text size="1" weight="medium">Crop Padding</Text>
          <input
            type="number"
            min={0}
            value={state.cropPadding}
            onChange={(e) => onUpdate('cropPadding', parseInt(e.target.value) || 0)}
            className="px-2 py-1 text-sm border border-gray-300 rounded w-20"
          />
        </label>

        <label className="flex flex-col gap-1">
          <Text size="1" weight="medium">Auto Threshold</Text>
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={state.autoThreshold}
            onChange={(e) => onUpdate('autoThreshold', parseFloat(e.target.value) || 0)}
            className="px-2 py-1 text-sm border border-gray-300 rounded w-20"
          />
        </label>
      </div>
    </div>
  )
}

function StepReview({ state }: { state: WizardState }): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <Text size="2" weight="bold">Review & Confirm</Text>

      <div className="flex gap-4 mb-2">
        <label className="flex flex-col gap-1 flex-1">
          <Text size="1" weight="medium">Est. Time (seconds)</Text>
          <Text size="1" color="gray">{state.estimatedTimeSeconds}</Text>
        </label>
        <label className="flex flex-col gap-1 flex-1">
          <Text size="1" weight="medium">Memory (MB)</Text>
          <Text size="1" color="gray">{state.memoryRequirementMB}</Text>
        </label>
      </div>

      <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-xs">
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
          <Row label="Name" value={state.name} />
          <Row label="Type" value={state.type} />
          <Row label="Category" value={state.category} />
          <Row label="Source" value={state.sourceType === 'folder' ? state.folderPath : state.remoteUrl} />
          <Row label="Output Classes" value={String(state.outputClasses)} />
          <Row label="Input Shape" value={state.inputShape.join(' x ')} />
          <Row label="Seq. Conv" value={state.enableSeqConv ? 'Yes' : 'No'} />
          <Row label="Quantile Norm" value={state.enableQuantileNorm ? 'Yes' : 'No'} />
          <Row label="Transpose" value={state.enableTranspose ? 'Yes' : 'No'} />
          <Row label="Crop Padding" value={String(state.cropPadding)} />
          <Row label="Auto Threshold" value={String(state.autoThreshold)} />
          {state.labelsPath && <Row label="Labels" value={state.labelsPath} />}
          {state.description && <Row label="Description" value={state.description} />}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <>
      <Text size="1" weight="medium" color="gray">{label}</Text>
      <Text size="1" className="truncate">{value}</Text>
    </>
  )
}
