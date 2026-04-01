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
  Switch,
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
  CheckCircledIcon
} from '@radix-ui/react-icons'
import type { HeuristicDefinition, HeuristicOperation } from '../../../common/workflowTypes'

const electron = window.electron

// ── Constants ──────────────────────────────────────────────────────

const OPERATIONS = [
  { value: 'filter', label: 'Filter', desc: 'Keep items matching a condition' },
  { value: 'map', label: 'Map', desc: 'Extract a field from each item' },
  { value: 'sort', label: 'Sort', desc: 'Sort items by a field' },
  { value: 'group-by', label: 'Group By', desc: 'Group items by a field value' },
  { value: 'flatten', label: 'Flatten', desc: 'Flatten nested arrays' },
  { value: 'unique', label: 'Unique', desc: 'Remove duplicate items' },
  { value: 'count', label: 'Count', desc: 'Return the number of items' },
  { value: 'first', label: 'First', desc: 'Take the first item' },
  { value: 'last', label: 'Last', desc: 'Take the last item' },
  { value: 'default', label: 'Default', desc: 'Provide a fallback value if empty' },
  { value: 'lookup', label: 'Lookup', desc: 'Read a value from context' },
  { value: 'set-field', label: 'Set Field', desc: 'Add/overwrite a field on each item' },
  { value: 'merge', label: 'Merge', desc: 'Merge fields from another context array' },
  { value: 'pick-fields', label: 'Pick Fields', desc: 'Keep only specified fields' },
  { value: 'template', label: 'Template', desc: 'Format a string with {{field}} placeholders' }
]

const FILTER_OPERATORS = [
  { value: 'eq', label: '= equals' },
  { value: 'neq', label: '!= not equals' },
  { value: 'gt', label: '> greater than' },
  { value: 'gte', label: '>= greater or equal' },
  { value: 'lt', label: '< less than' },
  { value: 'lte', label: '<= less or equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not-contains', label: 'not contains' },
  { value: 'starts-with', label: 'starts with' },
  { value: 'ends-with', label: 'ends with' },
  { value: 'matches', label: 'matches (regex)' },
  { value: 'exists', label: 'exists (not null)' },
  { value: 'not-exists', label: 'not exists (null)' },
  { value: 'in', label: 'in (array)' },
  { value: 'not-in', label: 'not in (array)' }
]

const OUTPUT_TYPES = ['string', 'number', 'boolean', 'string[]', 'number[]', 'json[]', 'object', 'any']

// ── Operation Editor ───────────────────────────────────────────────

function OperationEditor({
  operation,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown
}: {
  operation: HeuristicOperation
  index: number
  total: number
  onUpdate: (op: HeuristicOperation) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}): React.ReactElement {
  const opMeta = OPERATIONS.find((o) => o.value === operation.op)
  const needsField = ['filter', 'map', 'sort', 'group-by', 'unique', 'set-field'].includes(operation.op)
  const needsOperator = operation.op === 'filter'
  const needsValue = ['filter', 'default', 'set-field'].includes(operation.op)
  const needsOrder = operation.op === 'sort'
  const needsContextField = ['lookup', 'set-field', 'merge'].includes(operation.op)
  const needsTargetField = operation.op === 'set-field'
  const needsFields = ['pick-fields', 'merge'].includes(operation.op)
  const needsTemplate = ['template', 'set-field'].includes(operation.op)

  return (
    <Card size="2">
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center gap-2">
          <DragHandleDots2Icon className="text-neutral-8 shrink-0 cursor-grab" />
          <Badge variant="soft" size="1">{index + 1}</Badge>
          <Select.Root
            value={operation.op}
            onValueChange={(v) => onUpdate({ ...operation, op: v })}
            size="1"
          >
            <Select.Trigger className="flex-1" />
            <Select.Content>
              {OPERATIONS.map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {o.label} - {o.desc}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
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

        {/* Description */}
        <TextField.Root
          value={operation.description || ''}
          onChange={(e) => onUpdate({ ...operation, description: e.target.value || undefined })}
          placeholder="Optional description of this step"
          size="1"
        />

        {/* Field path (for filter, map, sort, etc.) */}
        {needsField && (
          <div className="flex items-center gap-2">
            <Text size="1" className="text-neutral-9 shrink-0 w-20">Field:</Text>
            <TextField.Root
              value={operation.field || ''}
              onChange={(e) => onUpdate({ ...operation, field: e.target.value || undefined })}
              placeholder="e.g. seriesDescription, confidence"
              size="1"
              className="flex-1 font-mono"
            />
          </div>
        )}

        {/* Comparison operator (for filter) */}
        {needsOperator && (
          <div className="flex items-center gap-2">
            <Text size="1" className="text-neutral-9 shrink-0 w-20">Operator:</Text>
            <Select.Root
              value={operation.operator || 'eq'}
              onValueChange={(v) => onUpdate({ ...operation, operator: v })}
              size="1"
            >
              <Select.Trigger className="flex-1" />
              <Select.Content>
                {FILTER_OPERATORS.map((o) => (
                  <Select.Item key={o.value} value={o.value}>{o.label}</Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
        )}

        {/* Value */}
        {needsValue && (
          <div className="flex items-center gap-2">
            <Text size="1" className="text-neutral-9 shrink-0 w-20">Value:</Text>
            <TextField.Root
              value={operation.value !== undefined ? JSON.stringify(operation.value) : ''}
              onChange={(e) => {
                const raw = e.target.value
                let parsed: unknown = raw
                try { parsed = JSON.parse(raw) } catch { /* use raw string */ }
                onUpdate({ ...operation, value: parsed })
              }}
              placeholder="Comparison or default value (JSON)"
              size="1"
              className="flex-1 font-mono"
            />
          </div>
        )}

        {/* Sort order */}
        {needsOrder && (
          <div className="flex items-center gap-2">
            <Text size="1" className="text-neutral-9 shrink-0 w-20">Order:</Text>
            <Select.Root
              value={operation.order || 'asc'}
              onValueChange={(v) => onUpdate({ ...operation, order: v as 'asc' | 'desc' })}
              size="1"
            >
              <Select.Trigger className="w-32" />
              <Select.Content>
                <Select.Item value="asc">Ascending</Select.Item>
                <Select.Item value="desc">Descending</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
        )}

        {/* Context field (for lookup, set-field, merge) */}
        {needsContextField && (
          <div className="flex items-center gap-2">
            <Text size="1" className="text-neutral-9 shrink-0 w-20">Context:</Text>
            <TextField.Root
              value={operation.contextField || ''}
              onChange={(e) => onUpdate({ ...operation, contextField: e.target.value || undefined })}
              placeholder="e.g. _stepOutputs_convert_sidecars"
              size="1"
              className="flex-1 font-mono"
            />
          </div>
        )}

        {/* Target field (for set-field) */}
        {needsTargetField && (
          <div className="flex items-center gap-2">
            <Text size="1" className="text-neutral-9 shrink-0 w-20">Target:</Text>
            <TextField.Root
              value={operation.targetField || ''}
              onChange={(e) => onUpdate({ ...operation, targetField: e.target.value || undefined })}
              placeholder="Field name to write"
              size="1"
              className="flex-1 font-mono"
            />
          </div>
        )}

        {/* Fields list (for pick-fields) */}
        {needsFields && (
          <div className="flex items-center gap-2">
            <Text size="1" className="text-neutral-9 shrink-0 w-20">Fields:</Text>
            <TextField.Root
              value={(operation.fields || []).join(', ')}
              onChange={(e) => onUpdate({
                ...operation,
                fields: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
              })}
              placeholder="field1, field2, field3"
              size="1"
              className="flex-1 font-mono"
            />
          </div>
        )}

        {/* Template (for template, set-field) */}
        {needsTemplate && (
          <div className="flex items-center gap-2">
            <Text size="1" className="text-neutral-9 shrink-0 w-20">Template:</Text>
            <TextField.Root
              value={operation.template || ''}
              onChange={(e) => onUpdate({ ...operation, template: e.target.value || undefined })}
              placeholder="sub-{{subject}}_ses-{{session}}"
              size="1"
              className="flex-1 font-mono"
            />
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Main Component ─────────────────────────────────────────────────

interface HeuristicDesignerProps {
  open: boolean
  onClose: () => void
  onSave?: (definition: HeuristicDefinition) => void
  initialDefinition?: HeuristicDefinition | null
}

interface HeuristicDraft {
  name: string
  version: string
  description: string
  preserveExisting: boolean
  source: string
  operations: HeuristicOperation[]
  output: string
}

const DEFAULT_DRAFT: HeuristicDraft = {
  name: '',
  version: '1.0.0',
  description: '',
  preserveExisting: false,
  source: '',
  operations: [],
  output: 'json[]'
}

function draftToDefinition(draft: HeuristicDraft): HeuristicDefinition {
  return {
    name: draft.name,
    version: draft.version,
    description: draft.description,
    preserveExisting: draft.preserveExisting || undefined,
    source: draft.source,
    operations: draft.operations.map((op) => {
      // Strip undefined/empty fields for clean JSON
      const clean: HeuristicOperation = { op: op.op }
      if (op.field) clean.field = op.field
      if (op.operator) clean.operator = op.operator
      if (op.value !== undefined && op.value !== '') clean.value = op.value
      if (op.fields && op.fields.length > 0) clean.fields = op.fields
      if (op.order && op.order !== 'asc') clean.order = op.order
      if (op.contextField) clean.contextField = op.contextField
      if (op.targetField) clean.targetField = op.targetField
      if (op.template) clean.template = op.template
      if (op.description) clean.description = op.description
      return clean
    }),
    output: draft.output
  }
}

function definitionToDraft(def: HeuristicDefinition): HeuristicDraft {
  return {
    name: def.name,
    version: def.version,
    description: def.description,
    preserveExisting: def.preserveExisting ?? false,
    source: def.source,
    operations: [...def.operations],
    output: def.output
  }
}

export function HeuristicDesigner({
  open,
  onClose,
  onSave,
  initialDefinition
}: HeuristicDesignerProps): React.ReactElement | null {
  const [draft, setDraft] = useState<HeuristicDraft>({ ...DEFAULT_DRAFT })
  const [jsonSource, setJsonSource] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [tab, setTab] = useState<string>('visual')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (!open) {
      setDraft({ ...DEFAULT_DRAFT })
      setJsonSource('')
      setJsonError(null)
      setTab('visual')
      setSaving(false)
      setSaveSuccess(false)
      return
    }
    if (initialDefinition) {
      setDraft(definitionToDraft(initialDefinition))
    }
  }, [open, initialDefinition])

  const buildDefinition = useCallback((): HeuristicDefinition => {
    return draftToDefinition(draft)
  }, [draft])

  const syncToJson = (): void => {
    setJsonSource(JSON.stringify(buildDefinition(), null, 2))
    setJsonError(null)
  }

  const syncFromJson = (): void => {
    try {
      const parsed = JSON.parse(jsonSource) as HeuristicDefinition
      setDraft(definitionToDraft(parsed))
      setJsonError(null)
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }

  const handleSave = async (): Promise<void> => {
    let definition: HeuristicDefinition
    if (tab === 'json') {
      try {
        definition = JSON.parse(jsonSource) as HeuristicDefinition
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
        return
      }
    } else {
      definition = buildDefinition()
    }

    if (!definition.name.trim()) {
      setJsonError('Name is required')
      return
    }

    setSaving(true)
    try {
      await electron.ipcRenderer.invoke('workflow:save-heuristic', definition)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
      onSave?.(definition)
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // Operation CRUD
  const addOperation = (): void => {
    setDraft((prev) => ({
      ...prev,
      operations: [...prev.operations, { op: 'filter' }]
    }))
  }

  const updateOperation = (index: number, op: HeuristicOperation): void => {
    setDraft((prev) => ({
      ...prev,
      operations: prev.operations.map((o, i) => (i === index ? op : o))
    }))
  }

  const removeOperation = (index: number): void => {
    setDraft((prev) => ({
      ...prev,
      operations: prev.operations.filter((_, i) => i !== index)
    }))
  }

  const moveOperation = (index: number, direction: -1 | 1): void => {
    const target = index + direction
    setDraft((prev) => {
      const ops = [...prev.operations]
      ;[ops[index], ops[target]] = [ops[target], ops[index]]
      return { ...prev, operations: ops }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      <Theme style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-5 shrink-0 bg-panel">
          <div className="flex items-center gap-3">
            <Heading size="4" weight="bold" className="text-neutral-12">
              Heuristic Designer
            </Heading>
            <Text size="2" className="text-neutral-9">
              {initialDefinition ? `Editing: ${initialDefinition.name}` : 'Create a reusable data transformation'}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <div className="flex items-center gap-1 text-[var(--green-11)]">
                <CheckCircledIcon />
                <Text size="2">Saved</Text>
              </div>
            )}
            {jsonError && (
              <Text size="2" color="red">{jsonError}</Text>
            )}
            <Button variant="soft" size="2" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
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
                <Tabs.Trigger value="json">
                  <CodeIcon className="mr-1.5" /> JSON
                </Tabs.Trigger>
              </Tabs.List>

              <Box pt="4">
                {/* ── Visual Tab ── */}
                <Tabs.Content value="visual">
                  <div className="flex flex-col gap-6">
                    {/* Metadata */}
                    <div className="flex flex-col gap-3">
                      <Heading size="3" className="text-neutral-12">Metadata</Heading>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <Text size="1" weight="medium" className="text-neutral-11">Name</Text>
                          <TextField.Root
                            value={draft.name}
                            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                            placeholder="my-heuristic"
                            size="2"
                            className="font-mono"
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
                          placeholder="What this heuristic computes"
                          size="2"
                        />
                      </div>
                    </div>

                    <Separator size="4" />

                    {/* Source & Options */}
                    <div className="flex flex-col gap-3">
                      <Heading size="3" className="text-neutral-12">Data Source</Heading>
                      <div className="flex flex-col gap-1">
                        <Text size="1" weight="medium" className="text-neutral-11">Source path</Text>
                        <TextField.Root
                          value={draft.source}
                          onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
                          placeholder="e.g. context.series_list or inputs.dicom_dir"
                          size="2"
                          className="font-mono"
                        />
                        <Text size="1" className="text-neutral-8">
                          Dot-path to the data this heuristic reads. Use inputs.X for workflow inputs, context.Y for context fields.
                        </Text>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1 flex-1">
                          <Text size="1" weight="medium" className="text-neutral-11">Output type</Text>
                          <Select.Root
                            value={draft.output}
                            onValueChange={(v) => setDraft((d) => ({ ...d, output: v }))}
                            size="2"
                          >
                            <Select.Trigger />
                            <Select.Content>
                              {OUTPUT_TYPES.map((t) => (
                                <Select.Item key={t} value={t}>{t}</Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Text size="1" weight="medium" className="text-neutral-11">Preserve existing</Text>
                          <Tooltip content="If enabled, returns existing value when non-empty (preserves user edits)">
                            <div className="pt-1">
                              <Switch
                                checked={draft.preserveExisting}
                                onCheckedChange={(v) => setDraft((d) => ({ ...d, preserveExisting: v }))}
                                size="2"
                              />
                            </div>
                          </Tooltip>
                        </div>
                      </div>
                    </div>

                    <Separator size="4" />

                    {/* Operations chain */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Heading size="3" className="text-neutral-12">Operations</Heading>
                          <Text size="2" className="text-neutral-9">
                            Chain of transformations applied to the source data, in order.
                          </Text>
                        </div>
                        <Button variant="soft" size="1" onClick={addOperation}>
                          <PlusIcon /> Add Operation
                        </Button>
                      </div>

                      {draft.operations.map((op, i) => (
                        <OperationEditor
                          key={i}
                          operation={op}
                          index={i}
                          total={draft.operations.length}
                          onUpdate={(o) => updateOperation(i, o)}
                          onRemove={() => removeOperation(i)}
                          onMoveUp={() => moveOperation(i, -1)}
                          onMoveDown={() => moveOperation(i, 1)}
                        />
                      ))}

                      {draft.operations.length === 0 && (
                        <Card size="2">
                          <Text size="2" className="text-neutral-8 text-center py-6">
                            No operations defined. The source data will be returned as-is.
                            Add operations to filter, transform, or reshape the data.
                          </Text>
                        </Card>
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
                    </div>
                    <TextArea
                      value={jsonSource}
                      onChange={(e) => {
                        setJsonSource(e.target.value)
                        setJsonError(null)
                      }}
                      rows={25}
                      size="2"
                      className="font-mono"
                      placeholder="Paste or edit heuristic JSON here..."
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
