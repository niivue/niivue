import React, { useCallback, useEffect, useState } from 'react'
import { Button, Heading, Text, Card, Badge, Callout, AlertDialog, Flex } from '@radix-ui/themes'
import {
  ArrowLeftIcon,
  RocketIcon,
  UploadIcon,
  MixerHorizontalIcon,
  DownloadIcon,
  PlusIcon,
  GearIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  Cross2Icon
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
  | { kind: 'use-as-template'; definition: Record<string, unknown> }
  | { kind: 'edit-user'; definition: Record<string, unknown> }
  | { kind: 'blank' }

interface WorkflowTemplateGalleryProps {
  onClose: () => void
  onSelect: (choice: TemplateChoice) => void
}

// ── Component ─────────────────────────────────────────────────────────

export function WorkflowTemplateGallery({
  onClose,
  onSelect
}: WorkflowTemplateGalleryProps): React.ReactElement {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkflowListItem | null>(null)

  const loadWorkflows = useCallback(async (): Promise<void> => {
    setLoading(true)
    setLoadError(null)
    try {
      const items: WorkflowListItem[] = await electron.ipcRenderer.invoke('workflow:list')
      setWorkflows(items)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadWorkflows()
  }, [loadWorkflows])

  // Escape closes the gallery — restores the dismissal affordance that
  // Radix Dialog used to provide before we moved the gallery inline.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
      }
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', handler)
    return (): void => window.removeEventListener('keydown', handler)
  }, [onClose])

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

  const handleUseAsTemplate = async (wf: WorkflowListItem): Promise<void> => {
    setActionError(null)
    try {
      const definition = await electron.ipcRenderer.invoke('workflow:get-definition', wf.name)
      // Clear the name so user must provide a new one
      onSelect({ kind: 'use-as-template', definition: { ...definition, name: '' } })
    } catch (err) {
      setActionError(
        `Couldn't open "${wf.description || wf.name}" as a template: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  const handleEditUser = async (wf: WorkflowListItem): Promise<void> => {
    setActionError(null)
    try {
      const definition = await electron.ipcRenderer.invoke('workflow:get-definition', wf.name)
      onSelect({ kind: 'edit-user', definition })
    } catch (err) {
      setActionError(
        `Couldn't load "${wf.description || wf.name}" for editing: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  const handleConfirmDelete = async (wf: WorkflowListItem): Promise<void> => {
    setActionError(null)
    setDeleteTarget(null)
    try {
      await electron.ipcRenderer.invoke('workflow:delete', wf.name)
      setWorkflows((prev) => prev.filter((w) => w.name !== wf.name))
    } catch (err) {
      setActionError(
        `Couldn't delete "${wf.description || wf.name}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  return (
    <div
      className="flex flex-col h-full w-full bg-surface"
      role="region"
      aria-label="Create Workflow"
    >
      {/* Header — "← Back to viewer" replaces the old modal X */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-5 shrink-0 bg-panel">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            color="gray"
            size="2"
            onClick={onClose}
            aria-label="Back to viewer"
          >
            <ArrowLeftIcon /> Back to viewer
          </Button>
          <div className="w-px h-6 bg-neutral-5" aria-hidden />
          <RocketIcon className="w-5 h-5 text-[var(--accent-9)]" />
          <Heading size="4" weight="bold" className="text-neutral-12">
            Create Workflow
          </Heading>
        </div>
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

          {actionError && (
            <Callout.Root color="red" size="2" className="mb-4">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text className="flex-1">{actionError}</Callout.Text>
              <Button
                variant="ghost"
                color="gray"
                size="1"
                onClick={() => setActionError(null)}
                aria-label="Dismiss error"
              >
                <Cross2Icon />
              </Button>
            </Callout.Root>
          )}

          {loading ? (
            <Text size="2" className="text-neutral-8">
              Loading workflows...
            </Text>
          ) : loadError ? (
            <Callout.Root color="red" size="2">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text className="flex-1">
                Couldn&apos;t load workflows: {loadError}
              </Callout.Text>
              <Button variant="soft" color="red" size="1" onClick={() => void loadWorkflows()}>
                Retry
              </Button>
            </Callout.Root>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Existing workflow templates by category */}
              {Object.entries(grouped).map(([category, wfs]) => {
                const meta = CATEGORY_META[category] || CATEGORY_META.Processing
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[var(--accent-9)]">{meta.icon}</span>
                      <Heading size="3" className="text-neutral-11">
                        {category}
                      </Heading>
                      <Badge
                        variant="soft"
                        size="1"
                        color={meta.color as 'blue' | 'violet' | 'green'}
                      >
                        {wfs.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {wfs.map((wf) => (
                        <Card
                          key={wf.name}
                          size="2"
                          className="transition-shadow hover:[box-shadow:var(--shadow-3)]"
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <Text size="3" weight="bold" className="text-neutral-12">
                                  {wf.description || wf.name}
                                </Text>
                                <Text size="1" className="text-neutral-8 font-mono block mt-0.5">
                                  {wf.name}
                                </Text>
                              </div>
                              {wf.userCreated && (
                                <Badge variant="soft" size="1" color="green">
                                  Custom
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="solid"
                                size="1"
                                onClick={() => handleUseTemplate(wf)}
                              >
                                <RocketIcon /> Run
                              </Button>
                              {wf.userCreated ? (
                                <>
                                  <Button
                                    variant="soft"
                                    size="1"
                                    onClick={() => void handleEditUser(wf)}
                                  >
                                    <GearIcon /> Edit
                                  </Button>
                                  <Button
                                    variant="soft"
                                    color="red"
                                    size="1"
                                    onClick={() => setDeleteTarget(wf)}
                                  >
                                    <TrashIcon /> Delete
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="soft"
                                  size="1"
                                  onClick={() => void handleUseAsTemplate(wf)}
                                >
                                  <PlusIcon /> Use as Template
                                </Button>
                              )}
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
                <Heading size="3" className="text-neutral-11 mb-3">
                  Build Your Own
                </Heading>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card
                    size="2"
                    className="transition-shadow cursor-pointer border-2 border-dashed border-neutral-6 hover:border-[var(--accent-7)] hover:[box-shadow:var(--shadow-3)]"
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
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog.Root
        open={deleteTarget !== null}
        onOpenChange={(open): void => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Delete workflow</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Delete &ldquo;{deleteTarget?.description || deleteTarget?.name}&rdquo;? This cannot be
            undone.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                variant="solid"
                color="red"
                onClick={(): void => {
                  if (deleteTarget) void handleConfirmDelete(deleteTarget)
                }}
              >
                Delete
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </div>
  )
}
