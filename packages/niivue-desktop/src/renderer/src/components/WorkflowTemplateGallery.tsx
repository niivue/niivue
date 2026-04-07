import React, { useEffect, useState } from 'react'
import {
  Button,
  Heading,
  Text,
  Card,
  Badge,
  Theme
} from '@radix-ui/themes'
import {
  Cross1Icon,
  RocketIcon,
  UploadIcon,
  MixerHorizontalIcon,
  DownloadIcon,
  PlusIcon,
  CodeIcon,
  GearIcon
} from '@radix-ui/react-icons'
import type { WorkflowListItem } from '../../../common/workflowTypes.js'

const electron = window.electron

// ── Category icons and colors ────────────────────────────────────────

const CATEGORY_META: Record<string, { icon: React.ReactNode; color: string }> = {
  Import: { icon: <UploadIcon />, color: 'blue' },
  Processing: { icon: <MixerHorizontalIcon />, color: 'violet' },
  Export: { icon: <DownloadIcon />, color: 'green' }
}

// ── Types ─────────────────────────────────────────────────────────────

export type TemplateChoice =
  | { kind: 'run-workflow'; workflowName: string; inputs: Record<string, unknown> }
  | { kind: 'customize'; definition: Record<string, unknown> }
  | { kind: 'blank' }
  | { kind: 'advanced' }

interface WorkflowTemplateGalleryProps {
  open: boolean
  onClose: () => void
  onSelect: (choice: TemplateChoice) => void
}

// ── Component ─────────────────────────────────────────────────────────

export function WorkflowTemplateGallery({
  open,
  onClose,
  onSelect
}: WorkflowTemplateGalleryProps): React.ReactElement | null {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    electron.ipcRenderer
      .invoke('workflow:list')
      .then((items: WorkflowListItem[]) => {
        setWorkflows(items)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [open])

  if (!open) return null

  // Group workflows by menu category
  const grouped: Record<string, WorkflowListItem[]> = {}
  for (const wf of workflows) {
    const cat = wf.menu || 'Processing'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(wf)
  }

  const handleUseTemplate = (wf: WorkflowListItem): void => {
    // For workflows that need a dicom_dir input, we signal that the
    // WorkflowDialog should prompt for it
    onSelect({ kind: 'run-workflow', workflowName: wf.name, inputs: {} })
  }

  const handleCustomize = async (wf: WorkflowListItem): Promise<void> => {
    try {
      const definition = await electron.ipcRenderer.invoke('workflow:get-definition', wf.name)
      onSelect({ kind: 'customize', definition })
    } catch (err) {
      console.error('Failed to load workflow definition:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      <Theme style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-5 shrink-0 bg-panel">
          <div className="flex items-center gap-3">
            <RocketIcon className="w-5 h-5 text-[var(--accent-9)]" />
            <Heading size="4" weight="bold" className="text-neutral-12">
              Create Workflow
            </Heading>
          </div>
          <Button variant="ghost" color="gray" size="2" onClick={onClose}>
            <Cross1Icon />
          </Button>
        </header>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            {/* Intro */}
            <div className="mb-8">
              <Heading size="5" weight="bold" className="text-neutral-12 mb-2">
                Start from a template
              </Heading>
              <Text size="3" className="text-neutral-9">
                Choose a workflow template to get started quickly, or build your own from scratch.
              </Text>
            </div>

            {loading ? (
              <Text size="2" className="text-neutral-8">Loading workflows...</Text>
            ) : (
              <div className="flex flex-col gap-8">
                {/* Existing workflow templates by category */}
                {Object.entries(grouped).map(([category, wfs]) => {
                  const meta = CATEGORY_META[category] || CATEGORY_META.Processing
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[var(--accent-9)]">{meta.icon}</span>
                        <Heading size="3" className="text-neutral-11">{category}</Heading>
                        <Badge variant="soft" size="1" color={meta.color as 'blue' | 'violet' | 'green'}>
                          {wfs.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {wfs.map((wf) => (
                          <Card key={wf.name} size="2" className="hover:shadow-md transition-shadow">
                            <div className="flex flex-col gap-3">
                              <div>
                                <Text size="3" weight="bold" className="text-neutral-12">
                                  {wf.description || wf.name}
                                </Text>
                                <Text size="1" className="text-neutral-8 font-mono block mt-0.5">
                                  {wf.name}
                                </Text>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="solid"
                                  size="1"
                                  onClick={() => handleUseTemplate(wf)}
                                >
                                  <RocketIcon /> Use Template
                                </Button>
                                <Button
                                  variant="soft"
                                  size="1"
                                  onClick={() => void handleCustomize(wf)}
                                >
                                  <GearIcon /> Customize
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {/* Start from scratch */}
                <div>
                  <Heading size="3" className="text-neutral-11 mb-3">Build Your Own</Heading>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card
                      size="2"
                      className="hover:shadow-md transition-shadow cursor-pointer border-2 border-dashed border-neutral-6 hover:border-[var(--accent-7)]"
                      onClick={() => onSelect({ kind: 'blank' })}
                    >
                      <div className="flex flex-col items-center gap-2 py-4">
                        <PlusIcon className="w-8 h-8 text-[var(--accent-9)]" />
                        <Text size="3" weight="bold" className="text-neutral-12">
                          Start from Scratch
                        </Text>
                        <Text size="2" className="text-neutral-9 text-center">
                          Build a workflow using the block-based visual builder
                        </Text>
                      </div>
                    </Card>
                    <Card
                      size="2"
                      className="hover:shadow-md transition-shadow cursor-pointer border-2 border-dashed border-neutral-6 hover:border-neutral-8"
                      onClick={() => onSelect({ kind: 'advanced' })}
                    >
                      <div className="flex flex-col items-center gap-2 py-4">
                        <CodeIcon className="w-8 h-8 text-neutral-9" />
                        <Text size="3" weight="bold" className="text-neutral-12">
                          Advanced Editor
                        </Text>
                        <Text size="2" className="text-neutral-9 text-center">
                          Full control over JSON, bindings, and tool configuration
                        </Text>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Theme>
    </div>
  )
}
