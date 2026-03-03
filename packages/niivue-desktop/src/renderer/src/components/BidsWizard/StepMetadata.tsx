import { Button, Text } from '@radix-ui/themes'
import type { BidsDatasetConfig } from '../../../../common/bidsTypes.js'

const electron = window.electron

interface StepMetadataProps {
  config: BidsDatasetConfig
  onUpdateConfig: <K extends keyof BidsDatasetConfig>(key: K, value: BidsDatasetConfig[K]) => void
}

export function StepMetadata({ config, onUpdateConfig }: StepMetadataProps): JSX.Element {
  const handleSelectOutputDir = async (): Promise<void> => {
    const dir = await electron.bidsSelectOutputDir()
    if (dir) {
      onUpdateConfig('outputDir', dir)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Text size="2" weight="bold">Dataset Metadata</Text>
      <Text size="1" color="gray">
        Configure the dataset_description.json fields and output location.
      </Text>

      <label className="flex flex-col gap-1">
        <Text size="1" weight="medium">
          Dataset Name <span className="text-red-500">*</span>
        </Text>
        <input
          type="text"
          value={config.name}
          onChange={(e) => onUpdateConfig('name', e.target.value)}
          placeholder="My BIDS Dataset"
          className="px-3 py-2 text-sm border border-gray-300 rounded"
        />
      </label>

      <label className="flex flex-col gap-1">
        <Text size="1" weight="medium">BIDS Version</Text>
        <input
          type="text"
          value={config.bidsVersion}
          onChange={(e) => onUpdateConfig('bidsVersion', e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded w-32"
        />
      </label>

      <label className="flex flex-col gap-1">
        <Text size="1" weight="medium">License</Text>
        <input
          type="text"
          value={config.license}
          onChange={(e) => onUpdateConfig('license', e.target.value)}
          placeholder="CC0"
          className="px-3 py-2 text-sm border border-gray-300 rounded w-48"
        />
      </label>

      <label className="flex flex-col gap-1">
        <Text size="1" weight="medium">Authors (comma-separated)</Text>
        <input
          type="text"
          value={config.authors.join(', ')}
          onChange={(e) =>
            onUpdateConfig(
              'authors',
              e.target.value
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean)
            )
          }
          placeholder="Author One, Author Two"
          className="px-3 py-2 text-sm border border-gray-300 rounded"
        />
      </label>

      <div className="flex flex-col gap-1">
        <Text size="1" weight="medium">
          Output Directory <span className="text-red-500">*</span>
        </Text>
        <div className="flex gap-2">
          <Button variant="soft" size="2" onClick={handleSelectOutputDir}>
            Browse...
          </Button>
          <input
            type="text"
            value={config.outputDir}
            onChange={(e) => onUpdateConfig('outputDir', e.target.value)}
            placeholder="Select output directory"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded"
          />
        </div>
      </div>
    </div>
  )
}
