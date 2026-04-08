import React, { useState, useMemo } from 'react'
import {
  Text,
  TextField,
  Badge,
  Tooltip
} from '@radix-ui/themes'
import {
  MagnifyingGlassIcon,
  UploadIcon,
  FileIcon,
  EyeOpenIcon,
  PersonIcon,
  MixerHorizontalIcon,
  ScissorsIcon,
  TransformIcon,
  EyeNoneIcon,
  ComponentInstanceIcon,
  CheckCircledIcon,
  DownloadIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LayoutIcon,
  ActivityLogIcon,
  BarChartIcon,
  GearIcon
} from '@radix-ui/react-icons'
import {
  WORKFLOW_BLOCKS,
  BLOCK_CATEGORIES,
  type WorkflowBlock,
  type BlockCategory
} from '../../../common/workflowBlocks.js'
import type { ToolDefinition } from '../../../common/workflowTypes.js'
import { isTypeCompatible } from '../../../common/typeCompatibility.js'

// ── Icon mapping ──────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  UploadIcon: <UploadIcon />,
  FileIcon: <FileIcon />,
  EyeOpenIcon: <EyeOpenIcon />,
  PersonIcon: <PersonIcon />,
  MixerHorizontalIcon: <MixerHorizontalIcon />,
  ScissorsIcon: <ScissorsIcon />,
  TransformIcon: <TransformIcon />,
  EyeNoneIcon: <EyeNoneIcon />,
  ComponentInstanceIcon: <ComponentInstanceIcon />,
  CheckCircledIcon: <CheckCircledIcon />,
  DownloadIcon: <DownloadIcon />,
  LayoutIcon: <LayoutIcon />,
  ActivityLogIcon: <ActivityLogIcon />,
  BarChartIcon: <BarChartIcon />,
  GearIcon: <GearIcon />
}

export function getBlockIcon(iconName: string): React.ReactNode {
  return ICON_MAP[iconName] || <MixerHorizontalIcon />
}

const CATEGORY_COLORS: Record<BlockCategory, string> = {
  Import: 'blue',
  Processing: 'violet',
  Quality: 'yellow',
  Output: 'green'
}

// ── Types ─────────────────────────────────────────────────────────────

interface BlockPaletteProps {
  onAddBlock: (block: WorkflowBlock) => void
  /** Tool definitions for computing compatibility highlights */
  tools: Map<string, ToolDefinition>
  /** The last step's tool name, used to highlight compatible next blocks */
  lastStepTool?: string
}

// ── Component ─────────────────────────────────────────────────────────

export function BlockPalette({
  onAddBlock,
  tools,
  lastStepTool
}: BlockPaletteProps): React.ReactElement {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Compute which blocks are compatible with the last step's output
  const compatibleBlockIds = useMemo(() => {
    if (!lastStepTool) return new Set<string>()
    const lastTool = tools.get(lastStepTool)
    if (!lastTool) return new Set<string>()

    const outputTypes = Object.values(lastTool.outputs).map((o) => o.type)
    const compatible = new Set<string>()

    for (const block of WORKFLOW_BLOCKS) {
      const blockTool = tools.get(block.tool)
      if (!blockTool) continue

      // Check if any of the last step's outputs match any of this block's required inputs
      for (const [, paramDef] of Object.entries(blockTool.inputs)) {
        if (paramDef.optional) continue
        for (const outType of outputTypes) {
          if (isTypeCompatible(outType, paramDef.type)) {
            compatible.add(block.id)
            break
          }
        }
      }
    }
    return compatible
  }, [lastStepTool, tools])

  const filteredBlocks = useMemo(() => {
    if (!search.trim()) return WORKFLOW_BLOCKS
    const q = search.toLowerCase()
    return WORKFLOW_BLOCKS.filter(
      (b) =>
        b.label.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.tool.toLowerCase().includes(q)
    )
  }, [search])

  const toggleCategory = (cat: string): void => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <div className="px-1">
        <TextField.Root
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search blocks..."
          size="1"
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="12" width="12" />
          </TextField.Slot>
        </TextField.Root>
      </div>

      {/* Block categories */}
      <div className="flex flex-col gap-1">
        {BLOCK_CATEGORIES.map((category) => {
          const blocks = filteredBlocks.filter((b) => b.category === category)
          if (blocks.length === 0) return null
          const isCollapsed = collapsed[category]
          const color = CATEGORY_COLORS[category]

          return (
            <div key={category}>
              {/* Category header */}
              <button
                className="flex items-center gap-1.5 w-full px-2 py-1 rounded text-left hover:bg-[var(--gray-3)] transition-colors cursor-pointer"
                onClick={() => toggleCategory(category)}
              >
                {isCollapsed ? (
                  <ChevronRightIcon className="text-neutral-8 shrink-0" />
                ) : (
                  <ChevronDownIcon className="text-neutral-8 shrink-0" />
                )}
                <Text size="1" weight="bold" className="text-neutral-10 uppercase tracking-wider">
                  {category}
                </Text>
                <Badge variant="soft" size="1" color={color as 'blue' | 'violet' | 'yellow' | 'green'} className="ml-auto">
                  {blocks.length}
                </Badge>
              </button>

              {/* Block list */}
              {!isCollapsed && (
                <div className="flex flex-col gap-0.5 mt-0.5">
                  {blocks.map((block) => {
                    const isCompatible = compatibleBlockIds.has(block.id)
                    return (
                      <Tooltip key={block.id} content={block.description}>
                        <button
                          className={`flex items-center gap-2 w-full px-3 py-1.5 rounded text-left transition-colors cursor-pointer ${
                            isCompatible
                              ? 'bg-[var(--accent-3)] hover:bg-[var(--accent-4)] border border-[var(--accent-6)]'
                              : 'hover:bg-[var(--gray-3)]'
                          }`}
                          onClick={() => onAddBlock(block)}
                        >
                          <span className={isCompatible ? 'text-[var(--accent-9)]' : 'text-neutral-9'}>
                            {getBlockIcon(block.icon)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <Text size="1" weight="medium" className="text-neutral-12 truncate block">
                              {block.label}
                            </Text>
                          </div>
                          {isCompatible && (
                            <Badge variant="soft" size="1" color="green" className="shrink-0">
                              fit
                            </Badge>
                          )}
                        </button>
                      </Tooltip>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
