import { useState, useEffect, useMemo } from 'react'
import {
  Button,
  Flex,
  Text,
  Select,
  Separator,
  Card,
  Badge,
  Progress,
  Checkbox,
  TextField,
  ScrollArea
} from '@radix-ui/themes'
import { useSelectedInstance } from '../AppContext.js'
import { parseLabelJson } from '../../../common/labelResolver.js'
import type { LabelEntry } from '../../../common/labelResolver.js'
import type { ModelInfo, ModelCategory } from '../services/brainchop/types.js'

interface LabelDisplayEntry extends LabelEntry {
  color: [number, number, number]
}

interface SegmentationPanelProps {
  onRunSegmentation: (modelId: string) => void
  onCancelSegmentation?: () => void
  availableModels: ModelInfo[]
  isRunning: boolean
  progress: number
  status: string
  extractSubvolume: boolean
  onExtractSubvolumeChange: (enabled: boolean) => void
  selectedExtractLabels: Set<number>
  onSelectedExtractLabelsChange: (labels: Set<number>) => void
}

/**
 * Parse label JSON into display entries with colors.
 * Handles both object format (tissue/brain) and array format (parcellation).
 */
function parseLabelDisplayEntries(json: unknown): LabelDisplayEntry[] {
  const index = parseLabelJson(json)
  const entries: LabelDisplayEntry[] = []

  // Object format: { labels: [{value, name, color}, ...] }
  if (
    typeof json === 'object' &&
    json !== null &&
    Array.isArray((json as Record<string, unknown>).labels) &&
    (json as Record<string, unknown>).labels.length > 0 &&
    typeof ((json as Record<string, unknown>).labels as unknown[])[0] === 'object'
  ) {
    const objLabels = (json as { labels: Array<{ value: number; name: string; color?: number[] }> })
      .labels
    for (const entry of objLabels) {
      entries.push({
        value: entry.value,
        name: entry.name,
        color: (entry.color as [number, number, number]) || [128, 128, 128]
      })
    }
    return entries
  }

  // Array format: { labels: [...], R: [...], G: [...], B: [...] }
  const arrJson = json as { labels: string[]; R?: number[]; G?: number[]; B?: number[] }
  if (arrJson.R && arrJson.G && arrJson.B) {
    for (const entry of index.entries) {
      entries.push({
        value: entry.value,
        name: entry.name,
        color: [
          arrJson.R[entry.value] ?? 128,
          arrJson.G[entry.value] ?? 128,
          arrJson.B[entry.value] ?? 128
        ]
      })
    }
    return entries
  }

  // Fallback: no color info
  for (const entry of index.entries) {
    entries.push({ value: entry.value, name: entry.name, color: [128, 128, 128] })
  }
  return entries
}

export function SegmentationPanel({
  onRunSegmentation,
  onCancelSegmentation,
  availableModels,
  isRunning,
  progress,
  status,
  extractSubvolume,
  onExtractSubvolumeChange,
  selectedExtractLabels,
  onSelectedExtractLabelsChange
}: SegmentationPanelProps): JSX.Element {
  const instance = useSelectedInstance()
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory | 'All'>('All')
  const [labelEntries, setLabelEntries] = useState<LabelDisplayEntry[]>([])
  const [labelFilter, setLabelFilter] = useState('')

  // Get unique categories
  const categories = ['All', ...new Set(availableModels.map((m) => m.category))] as Array<
    ModelCategory | 'All'
  >

  // Filter models by category
  const filteredModels =
    selectedCategory === 'All'
      ? availableModels
      : availableModels.filter((m) => m.category === selectedCategory)

  // Set default model when models are loaded
  useEffect(() => {
    if (availableModels.length > 0 && !selectedModelId) {
      const defaultModel =
        availableModels.find((m) => m.id === 'tissue-seg-light') || availableModels[0]
      setSelectedModelId(defaultModel.id)
    }
  }, [availableModels, selectedModelId])

  const selectedModel = availableModels.find((m) => m.id === selectedModelId)

  // Load labels when extract mode is enabled and model changes
  useEffect(() => {
    if (!extractSubvolume || !selectedModel?.labelsPath) {
      setLabelEntries([])
      return
    }

    let cancelled = false
    const loadLabels = async (): Promise<void> => {
      try {
        const labelsJson = await window.electron.loadBrainchopLabels(selectedModel.labelsPath!)
        if (cancelled) return
        const entries = parseLabelDisplayEntries(labelsJson)
        setLabelEntries(entries)
        // Auto-select all non-background labels
        const nonBgValues = new Set(entries.filter((e) => e.value !== 0).map((e) => e.value))
        onSelectedExtractLabelsChange(nonBgValues)
      } catch (err) {
        console.error('Failed to load labels for extract mode:', err)
        if (!cancelled) setLabelEntries([])
      }
    }
    loadLabels()
    return () => {
      cancelled = true
    }
  }, [extractSubvolume, selectedModel?.id])

  // Non-background labels for display
  const nonBgLabels = useMemo(() => labelEntries.filter((e) => e.value !== 0), [labelEntries])

  // Filtered labels (for parcellation search)
  const filteredLabels = useMemo(() => {
    if (!labelFilter) return nonBgLabels
    const lower = labelFilter.toLowerCase()
    return nonBgLabels.filter((e) => e.name.toLowerCase().includes(lower))
  }, [nonBgLabels, labelFilter])

  const showSearch = nonBgLabels.length > 10

  const handleToggleLabel = (value: number, checked: boolean): void => {
    const next = new Set(selectedExtractLabels)
    if (checked) {
      next.add(value)
    } else {
      next.delete(value)
    }
    onSelectedExtractLabelsChange(next)
  }

  const handleSelectAll = (): void => {
    onSelectedExtractLabelsChange(new Set(nonBgLabels.map((e) => e.value)))
  }

  const handleDeselectAll = (): void => {
    onSelectedExtractLabelsChange(new Set())
  }

  // Check if there's a volume to segment
  const hasVolume = instance && instance.volumes.length > 0
  const canRun = hasVolume && selectedModelId && !isRunning

  const handleRun = (): void => {
    if (canRun) {
      onRunSegmentation(selectedModelId)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <Flex direction="column" gap="2">
        <Text size="3" weight="bold">
          Brain Segmentation
        </Text>
        <Text size="1" color="gray">
          Deep learning-based brain segmentation using TensorFlow.js
        </Text>
      </Flex>

      <Separator size="4" />

      {/* Category Filter */}
      <Flex direction="column" gap="2">
        <Text size="2" weight="medium">
          Category
        </Text>
        <Select.Root value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
          <Select.Trigger className="w-full" />
          <Select.Content>
            {categories.map((cat) => (
              <Select.Item key={cat} value={cat}>
                {cat}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>

      {/* Model Selection */}
      <Flex direction="column" gap="2">
        <Text size="2" weight="medium">
          Model
        </Text>
        <Select.Root value={selectedModelId} onValueChange={setSelectedModelId}>
          <Select.Trigger className="w-full" disabled={isRunning} />
          <Select.Content>
            {filteredModels.map((model) => (
              <Select.Item key={model.id} value={model.id}>
                {model.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>

      {/* Model Info Card */}
      {selectedModel && !isRunning && (
        <Card size="1">
          <Flex direction="column" gap="2">
            <Text size="2" weight="bold">
              {selectedModel.name}
            </Text>
            <Text size="1" color="gray">
              {selectedModel.description}
            </Text>
            <Flex gap="2" wrap="wrap">
              <Badge color="blue">{selectedModel.outputClasses} classes</Badge>
              <Badge color="green">~{selectedModel.estimatedTimeSeconds}s</Badge>
              <Badge color="orange">{selectedModel.memoryRequirementMB} MB</Badge>
            </Flex>
          </Flex>
        </Card>
      )}

      {/* Extract Subvolume Option */}
      {!isRunning && selectedModel && (
        <>
          <Separator size="4" />
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2" asChild>
              <label>
                <Checkbox
                  checked={extractSubvolume}
                  onCheckedChange={(checked) => {
                    onExtractSubvolumeChange(checked === true)
                  }}
                />
                <Text size="2" weight="medium">
                  Extract Subvolume
                </Text>
              </label>
            </Flex>
            {extractSubvolume && (
              <Text size="1" color="gray">
                Extract original MRI intensities for selected labels instead of a label overlay.
              </Text>
            )}

            {/* Label Checklist */}
            {extractSubvolume && nonBgLabels.length > 0 && (
              <Flex direction="column" gap="2">
                <Flex justify="between" align="center">
                  <Text size="1" weight="medium">
                    Labels ({selectedExtractLabels.size}/{nonBgLabels.length})
                  </Text>
                  <Flex gap="2">
                    <Text
                      size="1"
                      color="blue"
                      style={{ cursor: 'pointer' }}
                      onClick={handleSelectAll}
                    >
                      All
                    </Text>
                    <Text
                      size="1"
                      color="gray"
                      style={{ cursor: 'pointer' }}
                      onClick={handleDeselectAll}
                    >
                      None
                    </Text>
                  </Flex>
                </Flex>

                {/* Search filter for parcellation models */}
                {showSearch && (
                  <TextField.Root
                    size="1"
                    placeholder="Filter labels..."
                    value={labelFilter}
                    onChange={(e) => setLabelFilter(e.target.value)}
                  />
                )}

                <ScrollArea style={{ maxHeight: 200 }} scrollbars="vertical">
                  <Flex direction="column" gap="1">
                    {filteredLabels.map((entry) => (
                      <Flex key={entry.value} align="center" gap="2" asChild>
                        <label style={{ cursor: 'pointer' }}>
                          <Checkbox
                            size="1"
                            checked={selectedExtractLabels.has(entry.value)}
                            onCheckedChange={(checked) =>
                              handleToggleLabel(entry.value, checked === true)
                            }
                          />
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 2,
                              backgroundColor: `rgb(${entry.color[0]}, ${entry.color[1]}, ${entry.color[2]})`,
                              border: '1px solid rgba(0,0,0,0.2)',
                              flexShrink: 0
                            }}
                          />
                          <Text size="1" truncate>
                            {entry.name}
                          </Text>
                        </label>
                      </Flex>
                    ))}
                  </Flex>
                </ScrollArea>
              </Flex>
            )}
          </Flex>
        </>
      )}

      {/* Progress display when running */}
      {isRunning && (
        <Card size="1">
          <Flex direction="column" gap="3">
            <Flex justify="between" align="center">
              <Text size="2" weight="bold">
                Processing
              </Text>
              <Text size="2" weight="bold">
                {Math.round(progress)}%
              </Text>
            </Flex>
            <Progress value={progress} max={100} size="3" />
            <Text size="1" color="gray">
              {status || 'Starting...'}
            </Text>
          </Flex>
        </Card>
      )}

      <Separator size="4" />

      {/* Run / Cancel Button */}
      <Flex direction="column" gap="2">
        {isRunning ? (
          <Button
            size="3"
            onClick={onCancelSegmentation}
            style={{ width: '100%' }}
            color="red"
            variant="soft"
          >
            Cancel
          </Button>
        ) : (
          <Button
            size="3"
            onClick={handleRun}
            disabled={!canRun}
            style={{ width: '100%' }}
            color="blue"
          >
            {extractSubvolume ? 'Run & Extract' : 'Run Segmentation'}
          </Button>
        )}

        {!hasVolume && (
          <Text size="1" color="red">
            Please load a volume first
          </Text>
        )}
      </Flex>

      {/* Info Section */}
      {!isRunning && (
        <Card size="1" variant="surface">
          <Flex direction="column" gap="2">
            <Text size="2" weight="bold">
              How to use
            </Text>
            <Text size="1" color="gray">
              1. Load a T1-weighted MRI scan
              <br />
              &nbsp;&nbsp;&nbsp;(Try: Tools &rarr; Brain Segmentation &rarr; Load Sample Brain)
              <br />
              &nbsp;&nbsp;&nbsp;&bull; MNI152 (skull stripped) - for tissue segmentation
              <br />
              &nbsp;&nbsp;&nbsp;&bull; T1 with Skull - for brain extraction
              <br />
              2. Select a segmentation model
              <br />
              3. Click &quot;Run Segmentation&quot;
              <br />
              4. Wait for processing to complete
              <br />
              5. View results as an overlay
            </Text>
          </Flex>
        </Card>
      )}
    </div>
  )
}
