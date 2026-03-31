import React, { useState, useCallback, useEffect } from 'react'
import {
  Button,
  Heading,
  Text,
  TextField,
  TextArea,
  Select,
  IconButton,
  Card,
  Separator,
  Badge,
  Tabs,
  Box,
  Theme,
  Tooltip
} from '@radix-ui/themes'
import {
  Cross1Icon,
  PlusIcon,
  TrashIcon,
  DragHandleDots2Icon,
  ChevronUpIcon,
  ChevronDownIcon,
  CodeIcon,
  MixerHorizontalIcon,
  LayersIcon
} from '@radix-ui/react-icons'
import type { ToolDefinition } from '../../../common/workflowTypes'

const electron = window.electron

// ── Draft types ────────────────────────────────────────────────────

interface FormSectionDraft {
  title: string
  description: string
  fields: string[]
  component: string
  buttonText: string
}

interface ContextFieldDraft {
  type: string
  description: string
  heuristic: string
  default: string // JSON-encoded default value
}

interface BindingDraft {
  mode: 'ref' | 'constant'
  value: string
}

interface StepDraft {
  name: string
  tool: string
  inputs: Record<string, BindingDraft>
  outputMappings: Record<string, string>
  condition: string
}

interface WorkflowDraft {
  name: string
  version: string
  description: string
  menu: string
  sections: FormSectionDraft[]
  contextFields: Record<string, ContextFieldDraft>
  steps: StepDraft[]
  workflowInputs: Record<string, { type: string; description: string }>
  workflowOutputs: Record<string, { type: string; ref: string }>
}

interface WorkflowDesignerProps {
  open: boolean
  onClose: () => void
  onSave?: (schema: Record<string, unknown>) => void
  initialDefinition?: Record<string, unknown> | null
}

// ── Constants ──────────────────────────────────────────────────────

const PARAM_TYPES = [
  'string', 'number', 'boolean', 'volume', 'volume[]', 'mask',
  'dicom-folder', 'json[]', 'series-mapping[]', 'subject[]', 'number[]', 'bids-dir'
]

const EMPTY_SECTION: FormSectionDraft = {
  title: '',
  description: '',
  fields: [],
  component: '',
  buttonText: ''
}

const EMPTY_STEP: StepDraft = {
  name: '',
  tool: '',
  inputs: {},
  outputMappings: {},
  condition: ''
}

const DEFAULT_DRAFT: WorkflowDraft = {
  name: '',
  version: '1.0.0',
  description: '',
  menu: 'Processing',
  sections: [{ ...EMPTY_SECTION, title: 'Configuration' }],
  contextFields: {},
  steps: [],
  workflowInputs: {},
  workflowOutputs: {}
}

// ── Section Editor (existing) ──────────────────────────────────────

function SectionEditor({
  section,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown
}: {
  section: FormSectionDraft
  index: number
  total: number
  onUpdate: (section: FormSectionDraft) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}): React.ReactElement {
  const updateField = <K extends keyof FormSectionDraft>(
    key: K,
    value: FormSectionDraft[K]
  ): void => {
    onUpdate({ ...section, [key]: value })
  }

  const addField = (): void => {
    updateField('fields', [...section.fields, ''])
  }

  const updateFieldName = (fieldIndex: number, value: string): void => {
    const updated = [...section.fields]
    updated[fieldIndex] = value
    updateField('fields', updated)
  }

  const removeField = (fieldIndex: number): void => {
    updateField('fields', section.fields.filter((_, i) => i !== fieldIndex))
  }

  return (
    <Card size="2">
      <div className="flex flex-col gap-3">
        {/* Section header */}
        <div className="flex items-center gap-2">
          <DragHandleDots2Icon className="text-neutral-8 shrink-0 cursor-grab" />
          <Badge variant="soft" size="1">{index + 1}</Badge>
          <div className="flex-1">
            <TextField.Root
              value={section.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Section title"
              size="2"
            />
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              variant="ghost"
              color="gray"
              size="1"
              onClick={onMoveUp}
              disabled={index === 0}
            >
              <ChevronUpIcon />
            </IconButton>
            <IconButton
              variant="ghost"
              color="gray"
              size="1"
              onClick={onMoveDown}
              disabled={index === total - 1}
            >
              <ChevronDownIcon />
            </IconButton>
            <IconButton
              variant="ghost"
              color="red"
              size="1"
              onClick={onRemove}
              disabled={total <= 1}
            >
              <TrashIcon />
            </IconButton>
          </div>
        </div>

        {/* Description */}
        <TextField.Root
          value={section.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Optional description"
          size="1"
        />

        {/* Custom component */}
        <div className="flex items-center gap-2">
          <Text size="1" className="text-neutral-9 shrink-0">Component:</Text>
          <TextField.Root
            value={section.component}
            onChange={(e) => updateField('component', e.target.value)}
            placeholder="none (auto-generate fields)"
            size="1"
            className="flex-1"
          />
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-1.5">
          <Text size="1" weight="medium" className="text-neutral-11">Context fields:</Text>
          {section.fields.map((field, fi) => (
            <div key={fi} className="flex items-center gap-2">
              <TextField.Root
                value={field}
                onChange={(e) => updateFieldName(fi, e.target.value)}
                placeholder="field_name"
                size="1"
                className="flex-1 font-mono"
              />
              <IconButton
                variant="ghost"
                color="gray"
                size="1"
                onClick={() => removeField(fi)}
              >
                <Cross1Icon />
              </IconButton>
            </div>
          ))}
          <Button variant="ghost" size="1" onClick={addField} className="w-fit">
            <PlusIcon /> Add field
          </Button>
        </div>

        {/* Button text (for last section) */}
        {index === total - 1 && (
          <div className="flex items-center gap-2">
            <Text size="1" className="text-neutral-9 shrink-0">Button label:</Text>
            <TextField.Root
              value={section.buttonText}
              onChange={(e) => updateField('buttonText', e.target.value)}
              placeholder="Run"
              size="1"
              className="flex-1"
            />
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Step Editor ────────────────────────────────────────────────────

function StepEditor({
  step,
  index,
  total,
  tools,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown
}: {
  step: StepDraft
  index: number
  total: number
  tools: ToolDefinition[]
  onUpdate: (step: StepDraft) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}): React.ReactElement {
  const selectedTool = tools.find((t) => t.name === step.tool)

  const setToolName = (toolName: string): void => {
    const tool = tools.find((t) => t.name === toolName)
    // Pre-populate input bindings from tool definition
    const inputs: Record<string, BindingDraft> = {}
    if (tool) {
      for (const key of Object.keys(tool.inputs)) {
        inputs[key] = step.inputs[key] || { mode: 'ref', value: '' }
      }
    }
    onUpdate({ ...step, tool: toolName, inputs })
  }

  const updateInput = (key: string, binding: BindingDraft): void => {
    onUpdate({ ...step, inputs: { ...step.inputs, [key]: binding } })
  }

  const addOutputMapping = (): void => {
    onUpdate({
      ...step,
      outputMappings: { ...step.outputMappings, '': '' }
    })
  }

  const updateOutputMapping = (oldKey: string, newKey: string, contextField: string): void => {
    const mappings = { ...step.outputMappings }
    if (oldKey !== newKey) delete mappings[oldKey]
    mappings[newKey] = contextField
    onUpdate({ ...step, outputMappings: mappings })
  }

  const removeOutputMapping = (key: string): void => {
    const mappings = { ...step.outputMappings }
    delete mappings[key]
    onUpdate({ ...step, outputMappings: mappings })
  }

  return (
    <Card size="2">
      <div className="flex flex-col gap-3">
        {/* Step header */}
        <div className="flex items-center gap-2">
          <DragHandleDots2Icon className="text-neutral-8 shrink-0 cursor-grab" />
          <Badge variant="soft" size="1">{index + 1}</Badge>
          <TextField.Root
            value={step.name}
            onChange={(e) => onUpdate({ ...step, name: e.target.value })}
            placeholder="step_name"
            size="2"
            className="flex-1 font-mono"
          />
          <div className="flex items-center gap-1">
            <IconButton variant="ghost" color="gray" size="1" onClick={onMoveUp} disabled={index === 0}>
              <ChevronUpIcon />
            </IconButton>
            <IconButton variant="ghost" color="gray" size="1" onClick={onMoveDown} disabled={index === total - 1}>
              <ChevronDownIcon />
            </IconButton>
            <IconButton variant="ghost" color="red" size="1" onClick={onRemove}>
              <TrashIcon />
            </IconButton>
          </div>
        </div>

        {/* Tool selection */}
        <div className="flex items-center gap-2">
          <Text size="1" className="text-neutral-9 shrink-0">Tool:</Text>
          <Select.Root value={step.tool} onValueChange={setToolName} size="1">
            <Select.Trigger placeholder="Select a tool..." className="flex-1" />
            <Select.Content>
              {tools.map((t) => (
                <Select.Item key={t.name} value={t.name}>
                  {t.name} - {t.description}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>

        {/* Condition */}
        <div className="flex items-center gap-2">
          <Text size="1" className="text-neutral-9 shrink-0">Condition:</Text>
          <TextField.Root
            value={step.condition}
            onChange={(e) => onUpdate({ ...step, condition: e.target.value })}
            placeholder="e.g. context.skull_strip_config.enabled"
            size="1"
            className="flex-1 font-mono"
          />
        </div>

        {/* Input bindings */}
        {selectedTool && Object.keys(selectedTool.inputs).length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Text size="1" weight="medium" className="text-neutral-11">Inputs:</Text>
            {Object.entries(selectedTool.inputs).map(([key, paramDef]) => {
              const binding = step.inputs[key] || { mode: 'ref' as const, value: '' }
              return (
                <div key={key} className="flex items-center gap-2">
                  <Tooltip content={paramDef.description}>
                    <Text size="1" className="text-neutral-10 shrink-0 font-mono w-28 truncate">
                      {key}
                    </Text>
                  </Tooltip>
                  <Select.Root
                    value={binding.mode}
                    onValueChange={(v) => updateInput(key, { ...binding, mode: v as 'ref' | 'constant' })}
                    size="1"
                  >
                    <Select.Trigger className="w-24" />
                    <Select.Content>
                      <Select.Item value="ref">ref</Select.Item>
                      <Select.Item value="constant">constant</Select.Item>
                    </Select.Content>
                  </Select.Root>
                  <TextField.Root
                    value={binding.value}
                    onChange={(e) => updateInput(key, { ...binding, value: e.target.value })}
                    placeholder={binding.mode === 'ref' ? 'inputs.X or context.Y' : 'value'}
                    size="1"
                    className="flex-1 font-mono"
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* Output mappings */}
        <div className="flex flex-col gap-1.5">
          <Text size="1" weight="medium" className="text-neutral-11">Output mappings:</Text>
          {Object.entries(step.outputMappings).map(([key, contextField], i) => (
            <div key={i} className="flex items-center gap-2">
              <TextField.Root
                value={key}
                onChange={(e) => updateOutputMapping(key, e.target.value, contextField)}
                placeholder="tool_output"
                size="1"
                className="flex-1 font-mono"
              />
              <Text size="1" className="text-neutral-8">-&gt;</Text>
              <TextField.Root
                value={contextField}
                onChange={(e) => updateOutputMapping(key, key, e.target.value)}
                placeholder="context_field"
                size="1"
                className="flex-1 font-mono"
              />
              <IconButton variant="ghost" color="gray" size="1" onClick={() => removeOutputMapping(key)}>
                <Cross1Icon />
              </IconButton>
            </div>
          ))}
          <Button variant="ghost" size="1" onClick={addOutputMapping} className="w-fit">
            <PlusIcon /> Add mapping
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ── Context Field Editor ───────────────────────────────────────────

function ContextFieldsEditor({
  fields,
  heuristics,
  onChange
}: {
  fields: Record<string, ContextFieldDraft>
  heuristics: string[]
  onChange: (fields: Record<string, ContextFieldDraft>) => void
}): React.ReactElement {
  const fieldEntries = Object.entries(fields)

  const addField = (): void => {
    const name = `field_${fieldEntries.length + 1}`
    onChange({ ...fields, [name]: { type: 'string', description: '', heuristic: '', default: '' } })
  }

  const updateField = (oldName: string, newName: string, field: ContextFieldDraft): void => {
    const updated = { ...fields }
    if (oldName !== newName) delete updated[oldName]
    updated[newName] = field
    onChange(updated)
  }

  const removeField = (name: string): void => {
    const updated = { ...fields }
    delete updated[name]
    onChange(updated)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Heading size="3" className="text-neutral-12">Context Fields</Heading>
        <Button variant="soft" size="1" onClick={addField}>
          <PlusIcon /> Add Field
        </Button>
      </div>

      {fieldEntries.map(([name, field]) => (
        <Card key={name} size="1">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <TextField.Root
                value={name}
                onChange={(e) => updateField(name, e.target.value, field)}
                placeholder="field_name"
                size="1"
                className="flex-1 font-mono"
              />
              <Select.Root
                value={field.type}
                onValueChange={(v) => updateField(name, name, { ...field, type: v })}
                size="1"
              >
                <Select.Trigger className="w-36" />
                <Select.Content>
                  {PARAM_TYPES.map((t) => (
                    <Select.Item key={t} value={t}>{t}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <IconButton variant="ghost" color="red" size="1" onClick={() => removeField(name)}>
                <TrashIcon />
              </IconButton>
            </div>
            <TextField.Root
              value={field.description}
              onChange={(e) => updateField(name, name, { ...field, description: e.target.value })}
              placeholder="Description"
              size="1"
            />
            <div className="flex items-center gap-2">
              <Text size="1" className="text-neutral-9 shrink-0">Heuristic:</Text>
              <Select.Root
                value={field.heuristic || '__none__'}
                onValueChange={(v) => updateField(name, name, { ...field, heuristic: v === '__none__' ? '' : v })}
                size="1"
              >
                <Select.Trigger className="flex-1" />
                <Select.Content>
                  <Select.Item value="__none__">none</Select.Item>
                  {heuristics.map((h) => (
                    <Select.Item key={h} value={h}>{h}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Text size="1" className="text-neutral-9 shrink-0 ml-2">Default:</Text>
              <TextField.Root
                value={field.default}
                onChange={(e) => updateField(name, name, { ...field, default: e.target.value })}
                placeholder="JSON value"
                size="1"
                className="flex-1 font-mono"
              />
            </div>
          </div>
        </Card>
      ))}

      {fieldEntries.length === 0 && (
        <Text size="2" className="text-neutral-8 py-4 text-center">
          No context fields defined. Add fields to store data between steps.
        </Text>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────

/**
 * Parse a workflow definition JSON object into the designer's draft format.
 */
function definitionToDraft(parsed: Record<string, unknown>): WorkflowDraft {
  const newDraft: WorkflowDraft = {
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

  // Parse form sections
  const form = parsed.form as { sections?: Record<string, unknown>[] } | undefined
  if (form?.sections) {
    newDraft.sections = form.sections.map((s) => ({
      title: (s.title as string) || '',
      description: (s.description as string) || '',
      fields: (s.fields as string[]) || [],
      component: (s.component as string) || '',
      buttonText: (s.buttonText as string) || ''
    }))
  }

  // Parse context fields
  const context = parsed.context as { fields?: Record<string, Record<string, unknown>> } | undefined
  if (context?.fields) {
    for (const [name, field] of Object.entries(context.fields)) {
      newDraft.contextFields[name] = {
        type: (field.type as string) || 'string',
        description: (field.description as string) || '',
        heuristic: (field.heuristic as string) || '',
        default: field.default !== undefined ? JSON.stringify(field.default) : ''
      }
    }
  }

  // Parse steps
  const steps = parsed.steps as Record<string, Record<string, unknown>> | undefined
  if (steps) {
    for (const [name, step] of Object.entries(steps)) {
      const inputs: Record<string, BindingDraft> = {}
      if (step.inputs) {
        for (const [key, binding] of Object.entries(step.inputs as Record<string, Record<string, unknown>>)) {
          if ('ref' in binding) {
            inputs[key] = { mode: 'ref', value: binding.ref as string }
          } else if ('constant' in binding) {
            inputs[key] = { mode: 'constant', value: JSON.stringify(binding.constant) }
          }
        }
      }
      newDraft.steps.push({
        name,
        tool: (step.tool as string) || '',
        inputs,
        outputMappings: (step.outputMappings as Record<string, string>) || {},
        condition: (step.condition as string) || ''
      })
    }
  }

  return newDraft
}

export function WorkflowDesigner({
  open,
  onClose,
  onSave,
  initialDefinition
}: WorkflowDesignerProps): React.ReactElement | null {
  const [draft, setDraft] = useState<WorkflowDraft>({ ...DEFAULT_DRAFT })
  const [jsonSource, setJsonSource] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [tab, setTab] = useState<string>('visual')
  const [tools, setTools] = useState<ToolDefinition[]>([])
  const [heuristics, setHeuristics] = useState<string[]>([])

  useEffect(() => {
    if (!open) {
      setDraft({ ...DEFAULT_DRAFT })
      setJsonSource('')
      setJsonError(null)
      setTab('visual')
      return
    }
    // Load available tools and heuristics when designer opens
    electron.ipcRenderer.invoke('workflow:list-tools').then((t: ToolDefinition[]) => setTools(t))
    electron.ipcRenderer.invoke('workflow:list-heuristics').then((h: string[]) => setHeuristics(h))

    // If editing an existing workflow, load it into the draft
    if (initialDefinition) {
      setDraft(definitionToDraft(initialDefinition))
    }
  }, [open, initialDefinition])

  const buildSchema = useCallback((): Record<string, unknown> => {
    const schema: Record<string, unknown> = {
      name: draft.name,
      version: draft.version,
      description: draft.description,
      menu: draft.menu,
      inputs: draft.workflowInputs,
      form: {
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
      },
      outputs: draft.workflowOutputs
    }

    // Build context from contextFields
    if (Object.keys(draft.contextFields).length > 0) {
      const fields: Record<string, Record<string, unknown>> = {}
      for (const [name, field] of Object.entries(draft.contextFields)) {
        const f: Record<string, unknown> = {
          type: field.type,
          description: field.description
        }
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

    // Build steps
    if (draft.steps.length > 0) {
      const steps: Record<string, Record<string, unknown>> = {}
      for (const step of draft.steps) {
        if (!step.name.trim() || !step.tool) continue
        const s: Record<string, unknown> = { tool: step.tool }

        // Build input bindings
        const inputs: Record<string, Record<string, unknown>> = {}
        for (const [key, binding] of Object.entries(step.inputs)) {
          if (!binding.value.trim()) continue
          if (binding.mode === 'ref') {
            inputs[key] = { ref: binding.value }
          } else {
            // Try to parse as JSON, fall back to string
            try {
              inputs[key] = { constant: JSON.parse(binding.value) }
            } catch {
              inputs[key] = { constant: binding.value }
            }
          }
        }
        s.inputs = inputs

        // Build output mappings
        const mappings: Record<string, string> = {}
        for (const [outKey, ctxField] of Object.entries(step.outputMappings)) {
          if (outKey.trim() && ctxField.trim()) {
            mappings[outKey] = ctxField
          }
        }
        if (Object.keys(mappings).length > 0) s.outputMappings = mappings
        if (step.condition.trim()) s.condition = step.condition

        steps[step.name] = s
      }
      schema.steps = steps
    }

    return schema
  }, [draft])

  const handleSave = (): void => {
    if (tab === 'json') {
      try {
        const parsed = JSON.parse(jsonSource)
        onSave?.(parsed)
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
        return
      }
    } else {
      onSave?.(buildSchema())
    }
  }

  const syncToJson = (): void => {
    setJsonSource(JSON.stringify(buildSchema(), null, 2))
    setJsonError(null)
  }

  const syncFromJson = (): void => {
    try {
      const parsed = JSON.parse(jsonSource)
      setDraft(definitionToDraft(parsed))
      setJsonError(null)
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }

  // Section CRUD
  const updateSection = (index: number, section: FormSectionDraft): void => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === index ? section : s))
    }))
  }

  const removeSection = (index: number): void => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }))
  }

  const moveSection = (index: number, direction: -1 | 1): void => {
    const target = index + direction
    setDraft((prev) => {
      const sections = [...prev.sections]
      ;[sections[index], sections[target]] = [sections[target], sections[index]]
      return { ...prev, sections }
    })
  }

  const addSection = (): void => {
    setDraft((prev) => ({
      ...prev,
      sections: [...prev.sections, { ...EMPTY_SECTION }]
    }))
  }

  // Step CRUD
  const updateStep = (index: number, step: StepDraft): void => {
    setDraft((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? step : s))
    }))
  }

  const removeStep = (index: number): void => {
    setDraft((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }))
  }

  const moveStep = (index: number, direction: -1 | 1): void => {
    const target = index + direction
    setDraft((prev) => {
      const steps = [...prev.steps]
      ;[steps[index], steps[target]] = [steps[target], steps[index]]
      return { ...prev, steps }
    })
  }

  const addStep = (): void => {
    setDraft((prev) => ({
      ...prev,
      steps: [...prev.steps, { ...EMPTY_STEP, name: `step_${prev.steps.length + 1}` }]
    }))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      <Theme style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-5 shrink-0 bg-panel">
          <div className="flex items-center gap-3">
            <Heading size="4" weight="bold" className="text-neutral-12">
              Workflow Designer
            </Heading>
            <Text size="2" className="text-neutral-9">
              Design your workflow pipeline and form layout
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="soft" size="2" onClick={handleSave}>
              Save
            </Button>
            <Button variant="soft" color="gray" size="2" onClick={onClose}>
              Close
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6">
            <Tabs.Root value={tab} onValueChange={(t) => {
              if (t === 'json') syncToJson()
              setTab(t)
            }}>
              <Tabs.List size="2">
                <Tabs.Trigger value="visual">
                  <MixerHorizontalIcon className="mr-1.5" /> Visual
                </Tabs.Trigger>
                <Tabs.Trigger value="steps">
                  <LayersIcon className="mr-1.5" /> Steps
                </Tabs.Trigger>
                <Tabs.Trigger value="json">
                  <CodeIcon className="mr-1.5" /> JSON
                </Tabs.Trigger>
              </Tabs.List>

              <Box pt="4">
                {/* ── Visual Tab ── */}
                <Tabs.Content value="visual">
                  <div className="flex flex-col gap-6">
                    {/* Workflow metadata */}
                    <div className="flex flex-col gap-3">
                      <Heading size="3" className="text-neutral-12">Metadata</Heading>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <Text size="1" weight="medium" className="text-neutral-11">Name</Text>
                          <TextField.Root
                            value={draft.name}
                            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                            placeholder="my-workflow"
                            size="2"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Text size="1" weight="medium" className="text-neutral-11">Version</Text>
                          <TextField.Root
                            value={draft.version}
                            onChange={(e) => setDraft((d) => ({ ...d, version: e.target.value }))}
                            placeholder="1.0.0"
                            size="2"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Text size="1" weight="medium" className="text-neutral-11">Description</Text>
                        <TextField.Root
                          value={draft.description}
                          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                          placeholder="Human-readable description"
                          size="2"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Text size="1" weight="medium" className="text-neutral-11">Menu</Text>
                        <Select.Root
                          value={draft.menu}
                          onValueChange={(v) => setDraft((d) => ({ ...d, menu: v }))}
                          size="2"
                        >
                          <Select.Trigger />
                          <Select.Content>
                            <Select.Item value="Import">Import</Select.Item>
                            <Select.Item value="Processing">Processing</Select.Item>
                            <Select.Item value="Export">Export</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      </div>
                    </div>

                    <Separator size="4" />

                    {/* Context fields */}
                    <ContextFieldsEditor
                      fields={draft.contextFields}
                      heuristics={heuristics}
                      onChange={(fields) => setDraft((d) => ({ ...d, contextFields: fields }))}
                    />

                    <Separator size="4" />

                    {/* Form sections */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <Heading size="3" className="text-neutral-12">Form Sections</Heading>
                        <Button variant="soft" size="1" onClick={addSection}>
                          <PlusIcon /> Add Section
                        </Button>
                      </div>

                      {draft.sections.map((section, i) => (
                        <SectionEditor
                          key={i}
                          section={section}
                          index={i}
                          total={draft.sections.length}
                          onUpdate={(s) => updateSection(i, s)}
                          onRemove={() => removeSection(i)}
                          onMoveUp={() => moveSection(i, -1)}
                          onMoveDown={() => moveSection(i, 1)}
                        />
                      ))}
                    </div>
                  </div>
                </Tabs.Content>

                {/* ── Steps Tab ── */}
                <Tabs.Content value="steps">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <Heading size="3" className="text-neutral-12">Pipeline Steps</Heading>
                        <Button variant="soft" size="1" onClick={addStep}>
                          <PlusIcon /> Add Step
                        </Button>
                      </div>

                      <Text size="2" className="text-neutral-9">
                        Steps execute tools in order. Each step can map its outputs to context fields
                        and can be conditionally skipped.
                      </Text>

                      {draft.steps.map((step, i) => (
                        <StepEditor
                          key={i}
                          step={step}
                          index={i}
                          total={draft.steps.length}
                          tools={tools}
                          onUpdate={(s) => updateStep(i, s)}
                          onRemove={() => removeStep(i)}
                          onMoveUp={() => moveStep(i, -1)}
                          onMoveDown={() => moveStep(i, 1)}
                        />
                      ))}

                      {draft.steps.length === 0 && (
                        <Text size="2" className="text-neutral-8 py-8 text-center">
                          No steps defined. Add steps to build your processing pipeline.
                        </Text>
                      )}
                    </div>
                  </div>
                </Tabs.Content>

                {/* ── JSON Tab ── */}
                <Tabs.Content value="json">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Button variant="soft" size="1" onClick={syncFromJson}>
                        Apply JSON to Visual
                      </Button>
                      {jsonError && (
                        <Text size="1" color="red">{jsonError}</Text>
                      )}
                    </div>
                    <TextArea
                      value={jsonSource}
                      onChange={(e) => {
                        setJsonSource(e.target.value)
                        setJsonError(null)
                      }}
                      rows={30}
                      size="2"
                      className="font-mono"
                      placeholder="Paste or edit workflow JSON here..."
                    />
                  </div>
                </Tabs.Content>
              </Box>
            </Tabs.Root>
          </div>
        </div>
      </Theme>
    </div>
  )
}
