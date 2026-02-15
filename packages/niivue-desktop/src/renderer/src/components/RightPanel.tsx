import { Text, Tooltip } from '@radix-ui/themes'
import { GeneralTab } from './GeneralTab.js'
import { MeshTab } from './MeshTab.js'
import { VolumeTab } from './VolumeTab.js'
import { AtlasTab } from './AtlasTab.js'
import { SegmentationPanel } from './SegmentationPanel.js'
import { NiimathToolbar } from './NiimathToolbar.js'
import type { ModelInfo } from '../services/brainchop/types.js'

interface RightPanelProps {
  activeTab: string
  onTabChange: (tab: string) => void
  onRunSegmentation: (modelId: string) => void
  onCancelSegmentation?: () => void
  availableModels: ModelInfo[]
  isRunning: boolean
  progress: number
  status: string
  modeMap: Map<string, 'replace' | 'overlay'>
  indexMap: Map<string, number>
  extractSubvolume: boolean
  onExtractSubvolumeChange: (enabled: boolean) => void
  selectedExtractLabels: Set<number>
  onSelectedExtractLabelsChange: (labels: Set<number>) => void
}

const tabs = [
  {
    id: 'controls',
    title: 'Controls',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )
  },
  {
    id: 'volume',
    title: 'Volume',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    )
  },
  {
    id: 'mesh',
    title: 'Mesh',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    )
  },
  {
    id: 'atlas',
    title: 'Atlas',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    )
  },
  {
    id: 'segmentation',
    title: 'Segmentation',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M12 2c-2 3-3 6-3 10s1 7 3 10" />
        <path d="M12 2c2 3 3 6 3 10s-1 7-3 10" />
        <path d="M4 8h16" />
        <path d="M4 16h16" />
      </svg>
    )
  },
  {
    id: 'niimath',
    title: 'Niimath',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="9" x2="20" y2="9" />
        <line x1="4" y1="15" x2="20" y2="15" />
        <line x1="10" y1="3" x2="8" y2="21" />
        <line x1="16" y1="3" x2="14" y2="21" />
      </svg>
    )
  }
]

export function RightPanel({
  activeTab,
  onTabChange,
  onRunSegmentation,
  onCancelSegmentation,
  availableModels,
  isRunning,
  progress,
  status,
  modeMap,
  indexMap,
  extractSubvolume,
  onExtractSubvolumeChange,
  selectedExtractLabels,
  onSelectedExtractLabelsChange
}: RightPanelProps): JSX.Element {
  const activeTitle = tabs.find((t) => t.id === activeTab)?.title ?? ''

  return (
    <div className="flex flex-col h-full overflow-auto p-2">
      {/* Icon strip */}
      <div className="flex items-center gap-1 pb-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <Tooltip key={tab.id} content={tab.title}>
            <button
              onClick={() => onTabChange(tab.id)}
              className={
                'p-1.5 rounded transition-colors ' +
                (activeTab === tab.id
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100')
              }
            >
              {tab.icon}
            </button>
          </Tooltip>
        ))}
      </div>
      {/* Panel title */}
      <div className="py-2">
        <Text size="2" weight="bold">
          {activeTitle}
        </Text>
      </div>
      {/* Tab content */}
      <div className="flex flex-col grow w-full">
        {activeTab === 'controls' && <GeneralTab />}
        {activeTab === 'volume' && <VolumeTab />}
        {activeTab === 'mesh' && <MeshTab />}
        {activeTab === 'atlas' && <AtlasTab />}
        {activeTab === 'segmentation' && (
          <SegmentationPanel
            onRunSegmentation={onRunSegmentation}
            onCancelSegmentation={onCancelSegmentation}
            availableModels={availableModels}
            isRunning={isRunning}
            progress={progress}
            status={status}
            extractSubvolume={extractSubvolume}
            onExtractSubvolumeChange={onExtractSubvolumeChange}
            selectedExtractLabels={selectedExtractLabels}
            onSelectedExtractLabelsChange={onSelectedExtractLabelsChange}
          />
        )}
        {activeTab === 'niimath' && <NiimathToolbar modeMap={modeMap} indexMap={indexMap} />}
      </div>
    </div>
  )
}
