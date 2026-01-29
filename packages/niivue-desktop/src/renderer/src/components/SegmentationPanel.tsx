import { useState, useEffect } from 'react'
import { Button, Flex, Text, Select, Separator, Card, Badge } from '@radix-ui/themes'
import { useSelectedInstance } from '../AppContext.js'
import type { ModelInfo, ModelCategory } from '../services/brainchop/types.js'

interface SegmentationPanelProps {
  onRunSegmentation: (modelId: string) => void
  availableModels: ModelInfo[]
  isRunning: boolean
}

export function SegmentationPanel({
  onRunSegmentation,
  availableModels,
  isRunning
}: SegmentationPanelProps): JSX.Element {
  const instance = useSelectedInstance()
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory | 'All'>('All')

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
      {selectedModel && (
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

      <Separator size="4" />

      {/* Run Button */}
      <Flex direction="column" gap="2">
        <Button
          size="3"
          onClick={handleRun}
          disabled={!canRun}
          style={{ width: '100%' }}
          color={isRunning ? 'gray' : 'blue'}
        >
          {isRunning ? 'Running...' : 'Run Segmentation'}
        </Button>

        {!hasVolume && (
          <Text size="1" color="red">
            Please load a volume first
          </Text>
        )}
      </Flex>

      {/* Info Section */}
      <Card size="1" variant="surface">
        <Flex direction="column" gap="2">
          <Text size="2" weight="bold">
            How to use
          </Text>
          <Text size="1" color="gray">
            1. Load a T1-weighted MRI scan
            <br />
            &nbsp;&nbsp;&nbsp;(Try: Tools → Brain Segmentation → Load Sample Brain)
            <br />
            &nbsp;&nbsp;&nbsp;• MNI152 (skull stripped) - for tissue segmentation
            <br />
            &nbsp;&nbsp;&nbsp;• T1 with Skull - for brain extraction
            <br />
            2. Select a segmentation model
            <br />
            3. Click "Run Segmentation"
            <br />
            4. Wait for processing to complete
            <br />
            5. View results as an overlay
          </Text>
        </Flex>
      </Card>
    </div>
  )
}
