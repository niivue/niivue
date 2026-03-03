import { Text } from '@radix-ui/themes'
import type { BidsSeriesMapping } from '../../../../common/bidsTypes.js'
import { SeriesRow } from './SeriesRow.js'
import { BidsPreview } from './BidsPreview.js'

interface StepClassificationProps {
  mappings: BidsSeriesMapping[]
  onUpdateMapping: (index: number, changes: Partial<BidsSeriesMapping>) => void
  datasetName: string
}

export function StepClassification({
  mappings,
  onUpdateMapping,
  datasetName
}: StepClassificationProps): JSX.Element {
  return (
    <div className="flex gap-4">
      {/* Left: classification table */}
      <div className="flex-1 min-w-0">
        <Text size="2" weight="bold" className="block mb-2">
          Review Classifications
        </Text>
        <Text size="1" color="gray" className="block mb-3">
          Verify and edit the proposed BIDS classification for each series.
        </Text>

        <div className="overflow-auto max-h-[350px] border rounded">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="py-1.5 px-1 text-left font-medium">Inc</th>
                <th className="py-1.5 px-1 text-left font-medium">Series</th>
                <th className="py-1.5 px-1 text-left font-medium">Conf</th>
                <th className="py-1.5 px-1 text-left font-medium">Datatype</th>
                <th className="py-1.5 px-1 text-left font-medium">Suffix</th>
                <th className="py-1.5 px-1 text-left font-medium">Task</th>
                <th className="py-1.5 px-1 text-left font-medium">Acq</th>
                <th className="py-1.5 px-1 text-left font-medium">Run</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <SeriesRow key={m.index} mapping={m} onUpdate={onUpdateMapping} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: BIDS tree preview */}
      <div className="w-[260px] flex-shrink-0">
        <BidsPreview mappings={mappings} datasetName={datasetName} />
      </div>
    </div>
  )
}
