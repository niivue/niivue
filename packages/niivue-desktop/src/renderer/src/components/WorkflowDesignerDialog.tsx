// ── WorkflowDesignerDialog ────────────────────────────────────────────
//
// A thin modal shell around ContextSpineDesigner. Owns the workflow draft
// state, loads tool definitions via IPC, serializes draft ↔ workflow JSON,
// and runs live validation. Block adding / removing / reordering is wired
// through to ContextSpineDesigner.
//
// This replaces the old WorkflowDesigner.tsx which was a 2,500-line file
// containing a parallel "advanced" JSON editor, tutorial, and form preview.
// Power users who want to edit JSON directly should open the .workflow.json
// file in their text editor.

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Dialog, Button, Text, Flex, SegmentedControl, Popover, Badge } from '@radix-ui/themes'
import { Cross1Icon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import type { ToolDefinition } from '../../../common/workflowTypes.js'
import {
  blockToStepDraft,
  blockToContextFields,
  blockToFormSection,
  repairBlockDefaults,
  type WorkflowBlock,
  type WorkflowDraft,
  type BindingDraft,
  type StepDraft,
  type FormSectionDraft,
  type ContextFieldDraft
} from '../../../common/workflowBlocks.js'
import { validateWorkflowDraft, type ValidationResult } from '../../../common/workflowValidator.js'
import { ContextSpineDesigner } from './ContextSpineDesigner.js'
import { WorkflowDiagramView } from './WorkflowDiagramView.js'
import { BlockPalette } from './BlockPalette.js'

const electron = window.electron

// ── Props ────────────────────────────────────────────────────────────

interface WorkflowDesignerDialogProps {
  open: boolean
  onClose: () => void
  onSave?: (schema: Record<string, unknown>) => void
  /** Optional existing definition to edit (converted to a draft on open). */
  initialDefinition?: Record<string, unknown> | null
}

// ── Constants ────────────────────────────────────────────────────────

const DEFAULT_DRAFT: WorkflowDraft = {
  name: '',
  version: '1.0.0',
  description: '',
  menu: 'Processing',
  sections: [],
  contextFields: {},
  steps: [],
  workflowInputs: {},
  workflowOutputs: {}
}

// ── Draft ↔ Definition serialization ─────────────────────────────────

function definitionToDraft(parsed: Record<string, unknown>): WorkflowDraft {
  const draft: WorkflowDraft = {
    name: (parsed.name as string) || '',
    version: (parsed.version as string) || '1.0.0',
    description: (parsed.description as string) || '',
    menu: (parsed.menu as string) || 'Processing',
    sections: [],
    contextFields: {},
    steps: [],
    workflowInputs: (parsed.inputs as Record<string, { type: string; description: string }>) || {},
    workflowOutputs: (parsed.outputs as Record<string, { type: string; ref: string }>) || {}
  }

  const form = parsed.form as { sections?: Record<string, unknown>[] } | undefined
  if (form?.sections) {
    draft.sections = form.sections.map((s) => ({
      title: (s.title as string) || '',
      description: (s.description as string) || '',
      fields: (s.fields as string[]) || [],
      component: (s.component as string) || '',
      buttonText: (s.buttonText as string) || ''
    }))
  }

  const context = parsed.context as { fields?: Record<string, Record<string, unknown>> } | undefined
  if (context?.fields) {
    for (const [name, field] of Object.entries(context.fields)) {
      draft.contextFields[name] = {
        type: (field.type as string) || 'string',
        label: (field.label as string) || '',
        description: (field.description as string) || '',
        heuristic: (field.heuristic as string) || '',
        default: field.default !== undefined ? JSON.stringify(field.default) : ''
      }
    }
  }

  const steps = parsed.steps as Record<string, Record<string, unknown>> | undefined
  if (steps) {
    for (const [name, step] of Object.entries(steps)) {
      const inputs: Record<string, BindingDraft> = {}
      if (step.inputs) {
        for (const [key, binding] of Object.entries(
          step.inputs as Record<string, Record<string, unknown>>
        )) {
          if ('ref' in binding) {
            inputs[key] = { mode: 'ref', value: binding.ref as string }
          } else if ('constant' in binding) {
            inputs[key] = { mode: 'constant', value: JSON.stringify(binding.constant) }
          }
        }
      }
      draft.steps.push({
        name,
        tool: (step.tool as string) || '',
        inputs,
        outputMappings: (step.outputMappings as Record<string, string>) || {},
        condition: (step.condition as string) || ''
      })
    }
  }

  return draft
}

function draftToSchema(draft: WorkflowDraft): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    name: draft.name,
    version: draft.version,
    description: draft.description,
    menu: draft.menu,
    inputs: draft.workflowInputs,
    outputs: draft.workflowOutputs
  }

  if (draft.sections.length > 0) {
    schema.form = {
      sections: draft.sections
        .filter((s) => s.title.trim())
        .map((s) => {
          const section: Record<string, unknown> = {
            title: s.title,
            fields: s.fields.filter((f) => f.trim())
          }
          if (s.description.trim()) section.description = s.description
          if (s.component.trim()) section.component = s.component
          if (s.buttonText.trim()) section.buttonText = s.buttonText
          return section
        })
    }
  }

  if (Object.keys(draft.contextFields).length > 0) {
    const fields: Record<string, Record<string, unknown>> = {}
    for (const [name, field] of Object.entries(draft.contextFields)) {
      const f: Record<string, unknown> = {
        type: field.type,
        description: field.description
      }
      if (field.label) f.label = field.label
      if (field.heuristic) f.heuristic = field.heuristic
      if (field.default) {
        try {
          f.default = JSON.parse(field.default)
        } catch {
          f.default = field.default
        }
      }
      fields[name] = f
    }
    schema.context = { fields }
  }

  if (draft.steps.length > 0) {
    const steps: Record<string, Record<string, unknown>> = {}
    for (const step of draft.steps) {
      if (!step.name.trim() || !step.tool) continue
      const s: Record<string, unknown> = { tool: step.tool }

      const inputs: Record<string, Record<string, unknown>> = {}
      for (const [key, binding] of Object.entries(step.inputs)) {
        if (!binding.value.trim()) continue
        if (binding.mode === 'ref') {
          inputs[key] = { ref: binding.value }
        } else {
          try {
            inputs[key] = { constant: JSON.parse(binding.value) }
          } catch {
            inputs[key] = { constant: binding.value }
          }
        }
      }
      s.inputs = inputs

      const mappings: Record<string, string> = {}
      for (const [outKey, ctxField] of Object.entries(step.outputMappings)) {
        if (outKey.trim() && ctxField.trim()) mappings[outKey] = ctxField
      }
      if (Object.keys(mappings).length > 0) s.outputMappings = mappings
      if (step.condition.trim()) s.condition = step.condition

      steps[step.name] = s
    }
    schema.steps = steps
  }

  return schema
}

// ── Component ────────────────────────────────────────────────────────

export function WorkflowDesignerDialog({
  open,
  onClose,
  onSave,
  initialDefinition
}: WorkflowDesignerDialogProps): React.ReactElement | null {
  const [draft, setDraft] = useState<WorkflowDraft>({ ...DEFAULT_DRAFT })
  const [tools, setTools] = useState<ToolDefinition[]>([])
  const [validation, setValidation] = useState<ValidationResult>({ errors: [], warnings: [] })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'diagram'>('list')
  const [selectedStep, setSelectedStep] = useState<number | null>(null)

  const toolsMap = useMemo(() => new Map(tools.map((t) => [t.name, t])), [tools])

  // Indices of steps that show up in any validation error message. We match
  // by step name, which is what validator messages embed.
  const errorSteps = useMemo(() => {
    const set = new Set<number>()
    draft.steps.forEach((step, i) => {
      if (validation.errors.some((e) => e.message.includes(step.name))) set.add(i)
    })
    return set
  }, [draft.steps, validation.errors])

  // Reset draft / load tools when dialog opens
  useEffect(() => {
    if (!open) {
      setDraft({ ...DEFAULT_DRAFT })
      setSaveError(null)
      return
    }

    electron.ipcRenderer.invoke('workflow:list-tools').then((t: ToolDefinition[]) => setTools(t))

    if (initialDefinition) {
      setDraft(definitionToDraft(initialDefinition))
    }
  }, [open, initialDefinition])

  // Once tools are loaded, repair any missing block-default bindings on the
  // current draft (e.g. a hidden `config: { ref: "context" }` that was added
  // to the block after this draft was authored). Only fills empty bindings.
  useEffect(() => {
    if (tools.length === 0) return
    if (draft.steps.length === 0) return
    setDraft((prev) => repairBlockDefaults(prev, toolsMap))
  }, [tools.length, toolsMap, draft.steps.length])

  // Live validation — debounced on draft changes.
  // Skip while tools are still loading so we don't flash "unknown tool"
  // errors for a few hundred ms on every open.
  useEffect(() => {
    if (tools.length === 0) return
    const timer = setTimeout(() => {
      setValidation(validateWorkflowDraft(draft, toolsMap))
    }, 300)
    return (): void => clearTimeout(timer)
  }, [draft, toolsMap, tools.length])

  // ── Block CRUD ──────────────────────────────────────────────────────

  const handleAddBlock = useCallback(
    (block: WorkflowBlock): void => {
      const wfInputs = Object.fromEntries(
        Object.entries(draft.workflowInputs).map(([k, v]) => [k, { type: v.type }])
      )
      const stepDraft = blockToStepDraft(block, draft.steps.length, draft.steps, toolsMap, wfInputs)

      const toolDef = toolsMap.get(block.tool)
      const newContextFields: Record<string, ContextFieldDraft> = toolDef
        ? blockToContextFields(block, toolDef)
        : {}
      // Headless blocks (no exposed fields and no form component) don't add
      // anything to the wizard form. Skip the section so the user doesn't see
      // a blank step.
      const isHeadless = block.exposedFields.length === 0 && !block.formComponent
      const formSection: FormSectionDraft | null = isHeadless ? null : blockToFormSection(block)

      setDraft((prev) => {
        const mergedFields = { ...prev.contextFields }
        for (const [name, field] of Object.entries(newContextFields)) {
          if (!(name in mergedFields)) mergedFields[name] = field
        }

        // For exposed fields that weren't auto-wired to a step output, fall
        // back to binding against the matching context field (user form).
        for (const fieldName of block.exposedFields) {
          const existing = stepDraft.inputs[fieldName]
          if (existing && !existing.value) {
            stepDraft.inputs[fieldName] = { mode: 'ref', value: `context.${fieldName}` }
          }
        }

        return {
          ...prev,
          contextFields: mergedFields,
          sections: formSection ? [...prev.sections, formSection] : prev.sections,
          steps: [...prev.steps, stepDraft]
        }
      })
    },
    [draft, toolsMap]
  )

  const handleRemoveStep = useCallback((index: number): void => {
    setDraft((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
      sections: prev.sections.filter((_, i) => i !== index)
    }))
  }, [])

  const handleMoveStep = useCallback((index: number, direction: -1 | 1): void => {
    const target = index + direction
    setDraft((prev) => {
      const steps = [...prev.steps]
      const sections = [...prev.sections]
      if (target < 0 || target >= steps.length) return prev
      ;[steps[index], steps[target]] = [steps[target], steps[index]]
      if (sections[index] && sections[target]) {
        ;[sections[index], sections[target]] = [sections[target], sections[index]]
      }
      return { ...prev, steps, sections }
    })
  }, [])

  // ── Save ────────────────────────────────────────────────────────────

  const handleSave = useCallback((): void => {
    setSaveError(null)
    if (!draft.name.trim()) {
      setSaveError('Please enter a workflow name before saving.')
      return
    }
    if (validation.errors.length > 0) {
      setSaveError(`Fix ${validation.errors.length} validation error(s) before saving.`)
      return
    }
    onSave?.(draftToSchema(draft))
  }, [draft, validation, onSave])

  if (!open) return null

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Content
        maxWidth="95vw"
        style={{
          width: '95vw',
          height: '90vh',
          padding: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Dialog.Title style={{ display: 'none' }}>Workflow Designer</Dialog.Title>
        <Dialog.Description style={{ display: 'none' }}>
          Visual designer for building custom workflows from tool blocks.
        </Dialog.Description>

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-neutral-5">
          <Flex gap="3" align="center">
            <Text size="3" weight="bold">
              Workflow Designer
            </Text>
            <SegmentedControl.Root
              size="1"
              value={view}
              onValueChange={(v) => setView(v as 'list' | 'diagram')}
            >
              <SegmentedControl.Item value="list">List</SegmentedControl.Item>
              <SegmentedControl.Item value="diagram">Diagram</SegmentedControl.Item>
            </SegmentedControl.Root>
          </Flex>
          <Flex gap="2" align="center">
            {saveError && (
              <Text size="1" color="red">
                {saveError}
              </Text>
            )}
            {(validation.errors.length > 0 || validation.warnings.length > 0) && (
              <Popover.Root>
                <Popover.Trigger>
                  <Button
                    size="1"
                    variant="soft"
                    color={validation.errors.length > 0 ? 'red' : 'amber'}
                  >
                    <ExclamationTriangleIcon />
                    {validation.errors.length > 0
                      ? `${validation.errors.length} error${validation.errors.length !== 1 ? 's' : ''}`
                      : `${validation.warnings.length} warning${validation.warnings.length !== 1 ? 's' : ''}`}
                  </Button>
                </Popover.Trigger>
                <Popover.Content size="1" maxWidth="480px">
                  <Flex direction="column" gap="2">
                    {validation.errors.length > 0 && (
                      <Flex direction="column" gap="1">
                        <Text size="1" weight="bold" color="red">
                          Errors
                        </Text>
                        {validation.errors.map((e, i) => (
                          <Flex key={`e-${i}`} gap="2" align="start">
                            {e.stepName && (
                              <Badge size="1" color="red" variant="soft">
                                {e.stepName}
                              </Badge>
                            )}
                            <Text size="1">{e.message}</Text>
                          </Flex>
                        ))}
                      </Flex>
                    )}
                    {validation.warnings.length > 0 && (
                      <Flex direction="column" gap="1">
                        <Text size="1" weight="bold" color="amber">
                          Warnings
                        </Text>
                        {validation.warnings.map((w, i) => (
                          <Flex key={`w-${i}`} gap="2" align="start">
                            {w.stepName && (
                              <Badge size="1" color="amber" variant="soft">
                                {w.stepName}
                              </Badge>
                            )}
                            <Text size="1">{w.message}</Text>
                          </Flex>
                        ))}
                      </Flex>
                    )}
                  </Flex>
                </Popover.Content>
              </Popover.Root>
            )}
            <Button variant="soft" size="2" onClick={handleSave}>
              Save
            </Button>
            <Button variant="ghost" color="gray" size="2" onClick={onClose}>
              <Cross1Icon />
            </Button>
          </Flex>
        </header>

        {/* Body — list view delegates to ContextSpineDesigner; diagram view
            uses WorkflowDiagramView with the same palette docked below. */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {view === 'list' ? (
            <ContextSpineDesigner
              draft={draft}
              setDraft={setDraft}
              tools={toolsMap}
              validation={validation}
              onAddBlock={handleAddBlock}
              onRemoveStep={handleRemoveStep}
              onMoveStep={handleMoveStep}
              onSave={handleSave}
            />
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <WorkflowDiagramView
                draft={draft}
                setDraft={setDraft}
                tools={toolsMap}
                selectedStep={selectedStep}
                onSelectStep={setSelectedStep}
                onRemoveStep={handleRemoveStep}
                onMoveStep={handleMoveStep}
                errorSteps={errorSteps}
              />
              <div className="border-t border-neutral-5 bg-[var(--gray-2)] px-3 py-2 max-h-56 overflow-y-auto shrink-0">
                <BlockPalette
                  onAddBlock={handleAddBlock}
                  tools={toolsMap}
                  lastStepTool={
                    draft.steps.length > 0 ? draft.steps[draft.steps.length - 1].tool : undefined
                  }
                />
              </div>
            </div>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  )
}

// Silence unused-variable lint warnings for StepDraft re-export
// (kept to maintain import symmetry with other designer modules)
export type { StepDraft }
