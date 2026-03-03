import { Text } from '@radix-ui/themes'
import type { BidsSeriesMapping } from '../../../../common/bidsTypes.js'
import { buildBidsTree } from './bidsTreeUtil.js'

interface BidsPreviewProps {
  mappings: BidsSeriesMapping[]
  datasetName: string
}

export function BidsPreview({ mappings, datasetName }: BidsPreviewProps): JSX.Element {
  const tree = buildBidsTree(mappings)

  return (
    <div className="flex flex-col gap-1">
      <Text size="1" weight="bold" color="gray">
        Preview
      </Text>
      <div className="bg-gray-900 text-green-400 rounded p-3 text-xs font-mono overflow-auto max-h-[300px]">
        <div>{datasetName || 'my_bids_dataset'}/</div>
        <div className="ml-3">dataset_description.json</div>
        <div className="ml-3">participants.tsv</div>
        <div className="ml-3">README</div>
        {tree.map((filePath, i) => {
          const parts = filePath.split('/')
          return (
            <div key={i} className="ml-3">
              {parts.map((part, j) => (
                <span key={j}>
                  {j > 0 && '/'}
                  {part}
                </span>
              ))}
            </div>
          )
        })}
        {tree.length === 0 && (
          <div className="ml-3 text-gray-500 italic">No series selected</div>
        )}
      </div>
    </div>
  )
}
