import React, { useState, useMemo, useCallback } from 'react'
import {
  Text,
  Badge,
  Tooltip,
  Select,
  TextField,
  Card
} from '@radix-ui/themes'
import {
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DragHandleDots2Icon,
  PersonIcon
} from '@radix-ui/react-icons'
import type { ToolDefinition, ToolParameterDef } from '../../../common/workflowTypes.js'
import type { ValidationResult } from '../../../common/workflowValidator.js'
import {
  computeContextSlots,
  detectBlockForStep,
  TYPE_COLORS,
  TYPE_LABELS,
  type WorkflowBlock,
  type WorkflowDraft,
  type StepDraft,
  type ContextSlot
} from '../../../common/workflowBlocks.js'
import { getAvailableSources, type SourceSuggestion } from '../../../common/typeCompatibility.js'
import { generateContextFieldFromParam } from '../../../common/bindingAnalyzer.js'
import { BlockPalette, getBlockIcon } from './BlockPalette.js'

// ── Constants ────────────────────────────────────────────────────────

/** Special value for "ask user at runtime via form" */
const USER_FORM_VALUE = '__user_form__'

// ── Props ────────────────────────────────────────────────────────────

interface ContextSpineDesignerProps {
  draft: WorkflowDraft
  setDraft: React.Dispatch<React.SetStateAction<WorkflowDraft>>
  tools: Map<string, ToolDefinition>
  validation: ValidationResult
  onAddBlock: (block: WorkflowBlock) => void
  onRemoveStep: (index: number) => void
  onMoveStep: (index: number, direction: -1 | 1) => void
  onSave: () => void
}

// ── Input source info ────────────────────────────────────────────────

type InputSource = 'context' | 'user-form' | 'constant' | 'unset'

interface InputInfo {
  name: string
  paramDef: ToolParameterDef
  source: InputSource
  /** For context sources: the friendly label */
  sourceLabel?: string
  /** For context sources: the slot color */
  sourceColor?: string
  /** Current binding value */
  value: string
  mode: 'ref' | 'constant'
  /** Whether this is in the block's hiddenFields */
  hidden: boolean
  /** Available context sources for the dropdown */
  suggestions: SourceSuggestion[]
  /** Whether this input is bound to a user-form context field */
  isUserForm: boolean
}

function analyzeInputs(
  step: StepDraft,
  stepIndex: number,
  tool: ToolDefinition,
  block: WorkflowBlock | undefined,
  slots: ContextSlot[],
  allSteps: StepDraft[],
  tools: Map<string, ToolDefinition>,
  workflowInputs: Record<string, { type: string }>,
  contextFields: Record<string, { type: string }>
): InputInfo[] {
  const results: InputInfo[] = []
  const hiddenFields = new Set(block?.hiddenFields || [])

  // Build StepInfo array for getAvailableSources
  const stepInfos = allSteps.map((s) => ({
    name: s.name,
    tool: s.tool,
    inputs: s.inputs as Record<string, { mode: 'ref' | 'constant'; value: string }>
  }))

  for (const [inputName, paramDef] of Object.entries(tool.inputs)) {
    const binding = step.inputs[inputName]
    const mode = binding?.mode || 'ref'
    const value = binding?.value || ''
    const hidden = hiddenFields.has(inputName) && mode === 'constant' && !!value

    // Get available sources for the dropdown (workflow inputs, context
    // fields, and preceding step outputs).
    const suggestions = getAvailableSources(
      stepIndex,
      inputName,
      paramDef.type,
      stepInfos,
      tools,
      workflowInputs,
      contextFields
    )

    // Determine current source type
    let source: InputSource = 'unset'
    let sourceLabel: string | undefined
    let sourceColor: string | undefined
    let isUserForm = false

    if (mode === 'ref' && value) {
      // Check if it's a step output ref
      const stepRefMatch = value.match(/^steps\.(.+)\.outputs\.(.+)$/)
      if (stepRefMatch) {
        source = 'context'
        const [, refStepName, refOutput] = stepRefMatch
        const sourceStepIdx = allSteps.findIndex((s) => s.name === refStepName)
        const slot = slots.find((s) => s.sourceStep === sourceStepIdx && s.sourceOutput === refOutput)
        const sourceBlock = sourceStepIdx >= 0 ? detectBlockForStep(allSteps[sourceStepIdx], tools) : null
        sourceLabel = `${sourceBlock?.label || refStepName} → ${refOutput}`
        sourceColor = slot?.color || 'gray'
      } else if (value.startsWith('context.')) {
        const ctxField = value.split('.')[1]
        // Check if this context field has a heuristic or is auto-generated for user form
        if (contextFields[ctxField]) {
          source = 'user-form'
          sourceLabel = `User provides: ${ctxField}`
          isUserForm = true
        } else {
          source = 'context'
          sourceLabel = `context.${ctxField}`
        }
      } else if (value.startsWith('inputs.')) {
        source = 'context'
        sourceLabel = `workflow input: ${value.split('.')[1]}`
      }
    } else if (mode === 'constant' && value) {
      source = 'constant'
    }

    results.push({
      name: inputName,
      paramDef,
      source,
      sourceLabel,
      sourceColor,
      value,
      mode,
      hidden,
      suggestions,
      isUserForm
    })
  }

  return results
}

// ── Component ────────────────────────────────────────────────────────

export function ContextSpineDesigner({
  draft,
  setDraft,
  tools,
  validation,
  onAddBlock,
  onRemoveStep,
  onMoveStep
}: ContextSpineDesignerProps): React.ReactElement {
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [showPalette, setShowPalette] = useState(false)

  const slots = useMemo(() => computeContextSlots(draft.steps, tools), [draft.steps, tools])

  const lastStepTool = draft.steps.length > 0
    ? draft.steps[draft.steps.length - 1].tool
    : undefined

  const wfInputTypes = useMemo(() => {
    const m: Record<string, { type: string }> = {}
    for (const [k, v] of Object.entries(draft.workflowInputs)) {
      m[k] = { type: v.type }
    }
    return m
  }, [draft.workflowInputs])

  const ctxFieldTypes = useMemo(() => {
    const m: Record<string, { type: string }> = {}
    for (const [k, v] of Object.entries(draft.contextFields)) {
      m[k] = { type: v.type }
    }
    return m
  }, [draft.contextFields])

  // ── Handlers ───────────────────────────────────────────────────────

  const updateStepInput = useCallback((stepIndex: number, inputName: string, value: string, mode: 'ref' | 'constant' = 'constant') => {
    setDraft((prev) => {
      const steps = [...prev.steps]
      const step = { ...steps[stepIndex], inputs: { ...steps[stepIndex].inputs } }
      step.inputs[inputName] = { mode, value }
      steps[stepIndex] = step
      return { ...prev, steps }
    })
  }, [setDraft])

  /**
   * Switch an input to "user form" mode. Prefers reusing an existing
   * context field with a matching name and compatible type; otherwise
   * creates a new (step-prefixed) field and ensures it appears in a form
   * section so the user actually gets prompted at runtime.
   */
  const setInputToUserForm = useCallback((stepIndex: number, inputName: string, paramDef: ToolParameterDef) => {
    setDraft((prev) => {
      const step = prev.steps[stepIndex]

      // 1. Reuse an existing context field with the plain input name if its
      //    type is compatible. This is the common case when opening an older
      //    workflow that already has a context field the user needs to bind.
      const existing = prev.contextFields[inputName]
      if (existing) {
        const steps = [...prev.steps]
        steps[stepIndex] = {
          ...step,
          inputs: {
            ...step.inputs,
            [inputName]: { mode: 'ref', value: `context.${inputName}` }
          }
        }
        return { ...prev, steps }
      }

      // 2. Otherwise create a new step-prefixed context field to avoid
      //    collisions across steps.
      const contextFieldName = `${step.name}_${inputName}`
      const generated = generateContextFieldFromParam(inputName, paramDef)

      const steps = [...prev.steps]
      steps[stepIndex] = {
        ...step,
        inputs: {
          ...step.inputs,
          [inputName]: { mode: 'ref', value: `context.${contextFieldName}` }
        }
      }

      const contextFields = {
        ...prev.contextFields,
        [contextFieldName]: {
          type: generated.type,
          label: generated.label,
          description: generated.description,
          heuristic: '',
          default: generated.default !== undefined ? JSON.stringify(generated.default) : ''
        }
      }

      // 3. Make sure the new field appears in a form section so the runtime
      //    UI actually asks for it. Prefer a section whose title matches the
      //    step's block label; fall back to a new section.
      const block = detectBlockForStep(step, tools)
      const targetTitle = block?.label || step.tool
      const sections = [...prev.sections]
      const existingIdx = sections.findIndex((s) => s.title === targetTitle)
      if (existingIdx >= 0) {
        const current = sections[existingIdx]
        if (!current.fields.includes(contextFieldName)) {
          sections[existingIdx] = {
            ...current,
            fields: [...current.fields, contextFieldName]
          }
        }
      } else {
        sections.push({
          title: targetTitle,
          description: '',
          fields: [contextFieldName],
          component: '',
          buttonText: ''
        })
      }

      return { ...prev, steps, contextFields, sections }
    })
  }, [setDraft, tools])

  const handleAddBlockWrapped = useCallback((block: WorkflowBlock) => {
    onAddBlock(block)
    setShowPalette(false)
    setSelectedStep(draft.steps.length)
  }, [onAddBlock, draft.steps.length])

  /** Handle source selection from the dropdown */
  const handleSourceChange = useCallback((stepIndex: number, inputName: string, paramDef: ToolParameterDef, selectedValue: string) => {
    if (selectedValue === USER_FORM_VALUE) {
      setInputToUserForm(stepIndex, inputName, paramDef)
    } else {
      updateStepInput(stepIndex, inputName, selectedValue, 'ref')
    }
  }, [setInputToUserForm, updateStepInput])

  // ── Drag-and-drop reordering ───────────────────────────────────────

  const handleCardDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }, [])

  const handleCardDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (dragIndex === null || dragIndex === index) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [dragIndex])

  const handleCardDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === targetIndex) return

    // Move step one position at a time to reach target
    let current = dragIndex
    while (current !== targetIndex) {
      const direction = targetIndex > current ? 1 : -1
      onMoveStep(current, direction as -1 | 1)
      current += direction
    }

    if (selectedStep === dragIndex) {
      setSelectedStep(targetIndex)
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }, [dragIndex, selectedStep, onMoveStep])

  const handleCardDragEnd = useCallback(() => {
    setDragIndex(null)
    setDragOverIndex(null)
  }, [])

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Left: Context Spine */}
      <div className="w-64 border-r border-neutral-5 flex flex-col bg-[var(--gray-2)] shrink-0 overflow-y-auto">
        <div className="px-4 py-3 border-b border-neutral-5">
          <Text size="2" weight="bold" className="text-neutral-11 uppercase tracking-wider">
            Context
          </Text>
          <Text size="1" className="text-neutral-8 block mt-1">
            Shared data between steps
          </Text>
        </div>

        <div className="flex flex-col gap-0.5 p-2">
          {slots.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <Text size="1" className="text-neutral-7">
                Add tools to see their outputs here
              </Text>
            </div>
          ) : (() => {
            const stepGroups = new Map<number, ContextSlot[]>()
            for (const slot of slots) {
              const group = stepGroups.get(slot.sourceStep) || []
              group.push(slot)
              stepGroups.set(slot.sourceStep, group)
            }

            return Array.from(stepGroups.entries()).map(([stepIdx, groupSlots]) => {
              const step = draft.steps[stepIdx]
              const block = detectBlockForStep(step, tools)

              return (
                <div key={stepIdx} className="mb-2">
                  <Text size="1" weight="medium" className="text-neutral-8 px-2 py-1 uppercase tracking-wider block">
                    {block?.label || step.tool}
                  </Text>
                  {groupSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[var(--gray-3)]"
                      style={{ borderLeft: `3px solid var(--${slot.color}-9, var(--gray-7))` }}
                    >
                      <div className="flex-1 min-w-0">
                        <Text size="1" className="text-neutral-11 truncate block">
                          {TYPE_LABELS[slot.type] || slot.type}
                        </Text>
                      </div>
                      {slot.consumers.length > 0 && (
                        <Badge variant="soft" size="1" color="violet">
                          {slot.consumers.length}×
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )
            })
          })()}
        </div>
      </div>

      {/* Right: Tool cards + palette */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Workflow metadata */}
        <div className="px-4 pt-4 pb-2 flex flex-col gap-2 border-b border-neutral-5">
          <div className="flex items-center gap-2">
            <Text size="1" className="text-neutral-9 w-20 shrink-0">Workflow</Text>
            <TextField.Root
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="my-workflow"
              size="1"
              className="flex-1"
              style={!draft.name.trim() ? { borderColor: 'var(--red-7)' } : undefined}
            />
          </div>
          <div className="flex items-center gap-2">
            <Text size="1" className="text-neutral-9 w-20 shrink-0">Description</Text>
            <TextField.Root
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="What does this workflow do?"
              size="1"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Text size="1" className="text-neutral-9 w-20 shrink-0">Dataset</Text>
            <TextField.Root
              value={(draft.contextFields.dataset_name?.default as string) || ''}
              onChange={(e) => setDraft((d) => ({
                ...d,
                contextFields: {
                  ...d.contextFields,
                  dataset_name: {
                    type: 'string',
                    label: 'Dataset Name',
                    description: 'Name for the output dataset',
                    heuristic: '',
                    default: e.target.value
                  }
                }
              }))}
              placeholder="My Dataset"
              size="1"
              className="flex-1"
            />
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-3">
          {draft.steps.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Text size="3" className="text-neutral-8">
                Start by adding a tool from the palette below
              </Text>
            </div>
          ) : (
            draft.steps.map((step, i) => {
              const block = detectBlockForStep(step, tools)
              const tool = tools.get(step.tool)
              const isSelected = selectedStep === i
              const hasError = validation.errors.some((e) => e.message.includes(step.name))

              const inputInfos = tool
                ? analyzeInputs(step, i, tool, block, slots, draft.steps, tools, wfInputTypes, ctxFieldTypes)
                : []

              const visibleInputs = inputInfos.filter((inp) => !inp.hidden)
              const hiddenInputs = inputInfos.filter((inp) => inp.hidden)
              const hasMissingRequired = visibleInputs.some((inp) => inp.source === 'unset' && !inp.paramDef.optional)

              const outputTypes = tool
                ? Object.entries(tool.outputs).map(([name, def]) => ({
                    name,
                    type: def.type,
                    color: TYPE_COLORS[def.type] || 'gray',
                    label: TYPE_LABELS[def.type] || def.type
                  }))
                : []

              const isDragging = dragIndex === i
              const isDragOver = dragOverIndex === i

              return (
                <Card
                  key={i}
                  size="2"
                  draggable
                  onDragStart={(e) => handleCardDragStart(e, i)}
                  onDragOver={(e) => handleCardDragOver(e, i)}
                  onDrop={(e) => handleCardDrop(e, i)}
                  onDragEnd={handleCardDragEnd}
                  className={`transition-all ${
                    isDragging
                      ? 'opacity-40'
                      : isDragOver
                        ? 'ring-2 ring-[var(--accent-8)] ring-dashed'
                        : hasMissingRequired
                          ? 'ring-1 ring-[var(--red-6)]'
                          : isSelected
                            ? 'ring-2 ring-[var(--accent-7)]'
                            : hasError
                              ? 'ring-1 ring-[var(--red-6)]'
                              : ''
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <span
                      className="text-neutral-7 cursor-grab active:cursor-grabbing shrink-0"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <DragHandleDots2Icon />
                    </span>
                    <button
                      className="flex-1 flex items-center gap-2 cursor-pointer text-left min-w-0"
                      onClick={() => setSelectedStep(isSelected ? null : i)}
                    >
                      <span className={isSelected ? 'text-[var(--accent-9)]' : 'text-neutral-9'}>
                        {block ? getBlockIcon(block.icon || '') : null}
                      </span>
                      <div className="flex-1 min-w-0">
                        <Text size="2" weight="bold" className="text-neutral-12 truncate block">
                          {block?.label || step.tool}
                        </Text>
                      </div>
                    </button>
                    <Badge variant="soft" size="1" color={hasError || hasMissingRequired ? 'red' : 'gray'}>
                      {i + 1}
                    </Badge>
                    <button
                      className="text-neutral-7 hover:text-[var(--red-9)] transition-colors cursor-pointer p-1 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveStep(i)
                        if (selectedStep === i) setSelectedStep(null)
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </div>

                  {/* Inputs section */}
                  {visibleInputs.length > 0 && (
                    <div className="mt-2 rounded-md overflow-hidden border border-[var(--violet-5)]">
                      <div className="bg-[var(--violet-2)] px-3 py-1">
                        <Text size="1" weight="medium" className="text-[var(--violet-11)] uppercase tracking-wider">
                          Inputs
                        </Text>
                      </div>
                      <div className="px-3 py-2 flex flex-col gap-2 bg-[var(--violet-1)]">
                        {visibleInputs.map((inp) => {
                          const hasContextSources = inp.suggestions.length > 0
                          const isRequired = !inp.paramDef.optional

                          // For enum fields with a constant, just show the select.
                          // Draft constants are stored JSON-stringified (e.g. '"y"'), so
                          // unwrap the quotes before comparing to Select.Item values.
                          if (inp.paramDef.enum && inp.source === 'constant') {
                            let displayValue = inp.value
                            try {
                              const parsed = JSON.parse(inp.value)
                              if (parsed !== undefined && parsed !== null) displayValue = String(parsed)
                            } catch {
                              /* not valid JSON — use raw */
                            }
                            return (
                              <div key={inp.name} className="flex items-center gap-2">
                                <Text size="1" className="text-neutral-9 w-28 shrink-0 truncate">
                                  {inp.name}
                                </Text>
                                <Select.Root
                                  value={displayValue}
                                  onValueChange={(v) => updateStepInput(i, inp.name, JSON.stringify(v))}
                                  size="1"
                                >
                                  <Select.Trigger className="flex-1" />
                                  <Select.Content>
                                    {inp.paramDef.enum.map((opt) => (
                                      <Select.Item key={String(opt)} value={String(opt)}>
                                        {String(opt)}
                                      </Select.Item>
                                    ))}
                                  </Select.Content>
                                </Select.Root>
                              </div>
                            )
                          }

                          return (
                            <div key={inp.name} className="flex items-center gap-2">
                              <Text size="1" className="text-neutral-9 w-28 shrink-0 truncate">
                                {inp.name}
                              </Text>

                              {/* Source selector dropdown */}
                              <Select.Root
                                value={
                                  inp.isUserForm ? USER_FORM_VALUE
                                    : inp.source === 'context' ? inp.value
                                    : inp.source === 'unset' ? ''
                                    : inp.value
                                }
                                onValueChange={(v) => {
                                  if (v === USER_FORM_VALUE) {
                                    handleSourceChange(i, inp.name, inp.paramDef, USER_FORM_VALUE)
                                  } else {
                                    handleSourceChange(i, inp.name, inp.paramDef, v)
                                  }
                                }}
                                size="1"
                              >
                                <Select.Trigger
                                  className="flex-1"
                                  placeholder={isRequired ? 'Select source...' : 'Select source (optional)'}
                                  style={inp.source === 'unset' && isRequired ? { borderColor: 'var(--red-7)' } : undefined}
                                />
                                <Select.Content>
                                  {/* Context sources */}
                                  {hasContextSources && (
                                    <Select.Group>
                                      <Select.Label>From Context</Select.Label>
                                      {inp.suggestions.map((s) => (
                                        <Select.Item key={s.ref} value={s.ref}>
                                          <div className="flex items-center gap-1.5">
                                            <span>{s.label}</span>
                                            {s.exact && <Badge variant="soft" size="1" color="green">exact</Badge>}
                                          </div>
                                        </Select.Item>
                                      ))}
                                    </Select.Group>
                                  )}
                                  {/* User form option */}
                                  <Select.Group>
                                    <Select.Label>User Provides</Select.Label>
                                    <Select.Item value={USER_FORM_VALUE}>
                                      <div className="flex items-center gap-1.5">
                                        <PersonIcon />
                                        <span>Ask user at runtime</span>
                                      </div>
                                    </Select.Item>
                                  </Select.Group>
                                </Select.Content>
                              </Select.Root>

                              {/* Show user form indicator */}
                              {inp.isUserForm && (
                                <Badge variant="soft" size="1" color="orange">
                                  form
                                </Badge>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Outputs → context */}
                  {outputTypes.length > 0 && (
                    <div className="mt-2 rounded-md overflow-hidden border border-[var(--teal-5)]">
                      <div className="bg-[var(--teal-2)] px-3 py-1 flex items-center gap-1.5">
                        <Text size="1" weight="medium" className="text-[var(--teal-11)] uppercase tracking-wider">
                          → Context
                        </Text>
                      </div>
                      <div className="px-3 py-2 flex flex-wrap gap-1 bg-[var(--teal-1)]">
                        {outputTypes.map((out) => (
                          <Tooltip key={out.name} content={`${out.name}: ${out.type}`}>
                            <Badge
                              variant="soft"
                              size="1"
                              color={out.color as 'blue' | 'purple' | 'yellow' | 'green' | 'gray' | 'teal' | 'orange'}
                            >
                              {out.label}
                            </Badge>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hidden defaults (collapsed) */}
                  {isSelected && hiddenInputs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {hiddenInputs.map((inp) => (
                        <Badge key={inp.name} variant="outline" size="1" color="gray">
                          {inp.name}={inp.value}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>

        {/* Block palette toggle */}
        <div className="border-t border-neutral-5 bg-[var(--gray-2)]">
          <button
            className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[var(--gray-3)] transition-colors cursor-pointer"
            onClick={() => setShowPalette(!showPalette)}
          >
            {showPalette ? <ChevronDownIcon /> : <ChevronRightIcon />}
            <PlusIcon />
            <Text size="1" weight="medium" className="text-neutral-11">
              Add Tool
            </Text>
          </button>
          {showPalette && (
            <div className="px-3 pb-3 max-h-64 overflow-y-auto">
              <BlockPalette
                onAddBlock={handleAddBlockWrapped}
                tools={tools}
                lastStepTool={lastStepTool}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
