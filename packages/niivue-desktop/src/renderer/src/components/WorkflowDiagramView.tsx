// ── WorkflowDiagramView ──────────────────────────────────────────────
//
// Interactive node-graph view of a WorkflowDraft built on @xyflow/react.
// Each step renders as a node with one handle per tool input (left) and
// one per tool output (right). Edges represent `steps.X.outputs.Y` refs.
// Connecting two handles writes the corresponding ref into the target
// step's input binding; deleting an edge clears that binding.
//
// Refs to workflow inputs (`inputs.X`) and context fields (`context.X`)
// render as edges from two synthetic "source pool" nodes on the left so
// every binding is visible as a graph connection. Constants still show
// as a small `=` badge on the input row because they have no off-step
// source to draw a wire from.

import React, { useMemo, useCallback, useState, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Panel,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeChange,
  type EdgeProps,
  MarkerType
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Badge, Text, Button, TextField, IconButton } from '@radix-ui/themes'
import {
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  RocketIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  Cross1Icon,
  EnterIcon,
  PersonIcon
} from '@radix-ui/react-icons'
import type { ToolDefinition } from '../../../common/workflowTypes.js'
import {
  detectBlockForStep,
  isToolRunnable,
  TYPE_COLORS,
  TYPE_LABELS,
  type StepDraft,
  type WorkflowDraft
} from '../../../common/workflowBlocks.js'
import { isTypeCompatible } from '../../../common/typeCompatibility.js'
import { getBlockIcon, BLOCK_DRAG_MIME } from './BlockPalette.js'

// ── Constants ────────────────────────────────────────────────────────

const NODE_WIDTH = 240
const NODE_X_GAP = 320
const NODE_Y_GAP = 40

// Internal node geometry — kept in one place so step nodes and source
// nodes stay visually aligned. Tweak here, not in the JSX.
const NODE_RADIUS = 8
const NODE_INNER_RADIUS = '6px 6px 0 0'
const NODE_HEADER_PADDING = '8px 10px'
const NODE_BODY_PADDING = '6px 0'
const NODE_ROW_PADDING = '6px 10px'
const NODE_FOOTER_PADDING = '6px 10px 8px'
const NODE_HEADER_GAP = 8
const NODE_ROW_GAP = 6
const NODE_IO_GAP = 4
const NODE_IO_ROW_MIN_HEIGHT = 18

/** Map a TYPE_COLORS value (Radix color name) to a CSS variable.
 *  Step 9 = solid brand (handles, badges). Step 8 = UI element (edge
 *  strokes, borders) — softer so a busy graph doesn't read as confetti. */
function typeColorVar(type: string): string {
  const c = TYPE_COLORS[type] || 'gray'
  return `var(--${c}-9)`
}
function typeEdgeColorVar(type: string): string {
  const c = TYPE_COLORS[type] || 'gray'
  return `var(--${c}-8)`
}

/** Constants are stored JSON-stringified; show a short, readable preview. */
function truncateForTooltip(value: string): string {
  let display = value
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'string') display = parsed
    else display = JSON.stringify(parsed)
  } catch {
    // not JSON — show raw
  }
  return display.length > 80 ? `${display.slice(0, 77)}…` : display
}

// ── Step node ────────────────────────────────────────────────────────

interface StepNodeData extends Record<string, unknown> {
  step: StepDraft
  index: number
  totalSteps: number
  tool: ToolDefinition | undefined
  blockLabel: string
  blockIcon: React.ReactNode
  selected: boolean
  hasError: boolean
  hasWarning: boolean
  /** True when the step's tool has no executor registered. The palette
   *  already badges these "config-only"; mirror it on placed nodes so authors
   *  who land on someone else's draft can tell at a glance which steps won't
   *  actually run. */
  configOnly: boolean
  /** First validation error/warning message for this step, surfaced inline under the header. */
  issue?: { kind: 'error' | 'warning'; message: string }
  /**
   * input name → annotation describing the binding when it can't be shown
   * as a graph edge (i.e. constants). Step→step, workflow-input, and
   * form-field bindings all render as edges instead.
   */
  inputAnnotations: Record<string, { kind: 'constant'; tooltip: string } | null>
  onSelect: () => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}

function StepNode({ data }: NodeProps<Node<StepNodeData>>): React.ReactElement {
  const {
    step,
    index,
    totalSteps,
    tool,
    blockLabel,
    blockIcon,
    selected,
    hasError,
    hasWarning,
    issue,
    inputAnnotations,
    onSelect,
    onRemove,
    onMove
  } = data

  const { configOnly } = data
  const inputs = tool ? Object.entries(tool.inputs) : []
  const outputs = tool ? Object.entries(tool.outputs) : []

  const ringColor = hasError
    ? 'var(--red-7)'
    : hasWarning
      ? 'var(--amber-8)'
      : selected
        ? 'var(--accent-8)'
        : 'var(--gray-6)'
  const ringWidth = hasError || hasWarning || selected ? 2 : 1

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        // Enter / Space selects the node, matching the click behavior. Once
        // selected, the dialog's global Delete handler picks up Backspace /
        // Delete so a single keyboard path covers select-then-remove without
        // duplicating the handler here.
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`Step ${index + 1}: ${blockLabel}${hasError ? ' — has errors' : hasWarning ? ' — has warnings' : ''}`}
      className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-9)]"
      style={{
        width: NODE_WIDTH,
        background: 'var(--color-panel-solid)',
        border: `${ringWidth}px solid ${ringColor}`,
        borderRadius: NODE_RADIUS,
        boxShadow: 'var(--shadow-2)',
        cursor: 'pointer',
        fontFamily: 'inherit'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: NODE_HEADER_GAP,
          padding: NODE_HEADER_PADDING,
          borderBottom: '1px solid var(--gray-5)',
          background: selected ? 'var(--accent-3)' : 'var(--gray-2)',
          borderRadius: NODE_INNER_RADIUS
        }}
      >
        <span style={{ color: selected ? 'var(--accent-11)' : 'var(--gray-11)' }}>{blockIcon}</span>
        <Text size="2" weight="bold" style={{ flex: 1, minWidth: 0 }} truncate>
          {blockLabel}
        </Text>
        {configOnly && (
          <Badge
            variant="outline"
            size="1"
            color="gray"
            title="No executor — won't run without a custom backend"
          >
            config-only
          </Badge>
        )}
        <Badge variant="soft" size="1" color={hasError ? 'red' : 'gray'}>
          {index + 1}
        </Badge>
        <IconButton
          size="1"
          variant="ghost"
          color="gray"
          onClick={(e) => {
            e.stopPropagation()
            onMove(-1)
          }}
          disabled={index === 0}
          aria-label="Move step earlier"
          title="Move earlier"
        >
          <ChevronUpIcon />
        </IconButton>
        <IconButton
          size="1"
          variant="ghost"
          color="gray"
          onClick={(e) => {
            e.stopPropagation()
            onMove(1)
          }}
          disabled={index === totalSteps - 1}
          aria-label="Move step later"
          title="Move later"
        >
          <ChevronDownIcon />
        </IconButton>
        <IconButton
          size="1"
          variant="ghost"
          color="gray"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={`Remove step ${step.name || index + 1}`}
          title="Remove step"
        >
          <TrashIcon />
        </IconButton>
      </div>

      {/* Inline validation message — surfaced on the offending node so authors
          don't have to open the header popover to discover what's wrong. */}
      {issue && (
        <div
          role={issue.kind === 'error' ? 'alert' : 'status'}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: NODE_ROW_GAP,
            padding: NODE_ROW_PADDING,
            background: issue.kind === 'error' ? 'var(--red-3)' : 'var(--amber-3)',
            color: issue.kind === 'error' ? 'var(--red-11)' : 'var(--amber-11)',
            borderBottom: '1px solid var(--gray-5)'
          }}
          title={issue.message}
        >
          <ExclamationTriangleIcon style={{ marginTop: 2, flexShrink: 0 }} />
          <Text size="1" style={{ lineHeight: 1.3, minWidth: 0 }}>
            {issue.message}
          </Text>
        </div>
      )}

      {/* Inputs / Outputs side-by-side */}
      <div style={{ display: 'flex', padding: NODE_BODY_PADDING }}>
        {/* Inputs column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: NODE_IO_GAP }}>
          {inputs.length === 0 ? (
            <Text size="1" style={{ color: 'var(--gray-9)', padding: '0 12px' }}>
              —
            </Text>
          ) : (
            inputs.map(([name, def]) => {
              const annot = inputAnnotations[name]
              return (
                <div
                  key={name}
                  style={{
                    position: 'relative',
                    paddingLeft: 14,
                    paddingRight: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: NODE_IO_GAP,
                    minHeight: NODE_IO_ROW_MIN_HEIGHT
                  }}
                >
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`in:${name}`}
                    style={{
                      background: typeColorVar(def.type),
                      width: 10,
                      height: 10,
                      border: '2px solid var(--color-panel-solid)',
                      left: -6
                    }}
                    title={`${name}: ${TYPE_LABELS[def.type] || def.type}`}
                  />
                  <Text size="1" style={{ color: 'var(--gray-12)', flex: 1, minWidth: 0 }} truncate>
                    {(def as { label?: string }).label || name}
                  </Text>
                  {annot?.kind === 'constant' && (
                    <span title={annot.tooltip} style={{ display: 'inline-flex' }}>
                      <Badge variant="soft" size="1" color="grass">
                        =
                      </Badge>
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Outputs column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: NODE_IO_GAP }}>
          {outputs.length === 0 ? (
            <Text
              size="1"
              style={{ color: 'var(--gray-9)', padding: '0 12px', textAlign: 'right' }}
            >
              —
            </Text>
          ) : (
            outputs.map(([name, def]) => (
              <div
                key={name}
                style={{
                  position: 'relative',
                  paddingLeft: 6,
                  paddingRight: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: NODE_IO_GAP,
                  minHeight: NODE_IO_ROW_MIN_HEIGHT
                }}
                title={`${name}: ${TYPE_LABELS[def.type] || def.type}`}
              >
                <Text size="1" style={{ color: 'var(--gray-12)' }}>
                  {TYPE_LABELS[def.type] || def.type}
                </Text>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`out:${name}`}
                  style={{
                    background: typeColorVar(def.type),
                    width: 10,
                    height: 10,
                    border: '2px solid var(--color-panel-solid)',
                    right: -6
                  }}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Step name footer — this is the authoritative identifier that
          validation errors and downstream `steps.X.outputs.Y` refs use,
          so it needs to scan cleanly. Code font marks it as an id; full
          gray-12 contrast keeps it from disappearing into chrome. */}
      <div
        style={{
          padding: NODE_FOOTER_PADDING,
          borderTop: '1px solid var(--gray-4)',
          background: 'var(--gray-1)',
          borderRadius: '0 0 6px 6px'
        }}
      >
        <Text
          size="2"
          weight="medium"
          style={{ color: 'var(--gray-12)', fontFamily: 'var(--code-font-family)' }}
        >
          {step.name}
        </Text>
      </div>
    </div>
  )
}

// ── Source pool node ─────────────────────────────────────────────────
//
// Synthetic node rendered on the left edge of the canvas grouping
// workflow inputs or form/context fields. Each entry gets one source
// handle so the otherwise-invisible `inputs.X` / `context.X` bindings
// show up as proper graph edges instead of small badges on the
// consuming step's input row.

interface SourceNodeEntry {
  name: string
  type: string
  label: string
}

interface SourceNodeData extends Record<string, unknown> {
  title: string
  kind: 'wf-input' | 'context'
  entries: SourceNodeEntry[]
  /** Set of entry names that have at least one outgoing edge. Used to
   *  dim unused entries so authors can see at a glance what's wired. */
  usedNames: Set<string>
}

function SourceNode({ data }: NodeProps<Node<SourceNodeData>>): React.ReactElement {
  const { title, kind, entries, usedNames } = data
  const accent = kind === 'wf-input' ? 'iris' : 'orange'
  const accentVar = `var(--${accent}-9)`
  const Icon = kind === 'wf-input' ? EnterIcon : PersonIcon

  return (
    <div
      style={{
        width: NODE_WIDTH,
        background: 'var(--color-panel-solid)',
        border: `2px solid var(--${accent}-7)`,
        borderRadius: NODE_RADIUS,
        boxShadow: 'var(--shadow-2)',
        fontFamily: 'inherit'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: NODE_HEADER_GAP,
          padding: NODE_HEADER_PADDING,
          borderBottom: '1px solid var(--gray-5)',
          background: `var(--${accent}-3)`,
          color: `var(--${accent}-11)`,
          borderRadius: NODE_INNER_RADIUS
        }}
      >
        <Icon />
        <Text size="2" weight="bold" style={{ flex: 1, minWidth: 0 }} truncate>
          {title}
        </Text>
      </div>

      <div
        style={{
          padding: NODE_BODY_PADDING,
          display: 'flex',
          flexDirection: 'column',
          gap: NODE_IO_GAP
        }}
      >
        {entries.length === 0 ? (
          <Text size="1" style={{ color: 'var(--gray-9)', padding: '0 12px' }}>
            None defined
          </Text>
        ) : (
          entries.map((entry) => {
            const inUse = usedNames.has(entry.name)
            return (
              <div
                key={entry.name}
                style={{
                  position: 'relative',
                  paddingLeft: 6,
                  paddingRight: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: NODE_ROW_GAP,
                  minHeight: NODE_IO_ROW_MIN_HEIGHT,
                  opacity: inUse ? 1 : 0.6
                }}
                title={`${entry.name}: ${TYPE_LABELS[entry.type] || entry.type}`}
              >
                <Text size="1" style={{ color: 'var(--gray-12)' }}>
                  {entry.label}
                </Text>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`out:${entry.name}`}
                  style={{
                    background: typeColorVar(entry.type),
                    width: 10,
                    height: 10,
                    border: `2px solid ${accentVar}`,
                    right: -6
                  }}
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const nodeTypes = { step: StepNode, source: SourceNode }

// ── Deletable edge ───────────────────────────────────────────────────
//
// Renders the standard bezier path plus a small × button at the midpoint.
// The button is hidden until the edge or its container is hovered, then
// fades in. Clicking dispatches an edge `remove` change through React
// Flow's normal channel so the existing onEdgesChange handler clears
// the corresponding step input binding.

interface DeletableEdgeData extends Record<string, unknown> {
  onDelete: () => void
  /** Source output type, used for the on-edge type badge. */
  sourceType?: string
  /** Target input type — when it differs from sourceType the edge is a coercion. */
  targetType?: string
  /** Hex/CSS color string used for the badge border to match the edge stroke. */
  edgeColor?: string
}

function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
  data
}: EdgeProps<Edge<DeletableEdgeData>>): React.ReactElement {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  })

  const handleDelete = (e: React.MouseEvent): void => {
    e.stopPropagation()
    data?.onDelete()
  }

  const sourceType = data?.sourceType
  const targetType = data?.targetType
  const isCoercion = !!sourceType && !!targetType && sourceType !== targetType
  const typeLabel = sourceType ? TYPE_LABELS[sourceType] || sourceType : null
  const badgeBorder = data?.edgeColor || 'var(--gray-7)'

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            opacity: selected ? 1 : undefined,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          {typeLabel && (
            <span
              title={isCoercion ? `${sourceType} → ${targetType} (coerced)` : `${sourceType}`}
              style={{
                fontSize: 10,
                lineHeight: 1,
                padding: '2px 6px',
                borderRadius: 999,
                border: `1px solid ${badgeBorder}`,
                background: 'var(--color-panel-solid)',
                color: 'var(--gray-12)',
                fontStyle: isCoercion ? 'italic' : 'normal',
                whiteSpace: 'nowrap',
                boxShadow: 'var(--shadow-2)'
              }}
            >
              {isCoercion ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {typeLabel}
                  <ArrowRightIcon width={10} height={10} />
                </span>
              ) : (
                typeLabel
              )}
            </span>
          )}
          <button
            onClick={handleDelete}
            aria-label="Delete connection"
            title="Delete connection"
            className="workflow-edge-delete"
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '1px solid var(--gray-7)',
              background: 'var(--color-panel-solid)',
              color: 'var(--gray-11)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              lineHeight: 1,
              padding: 0,
              boxShadow: 'var(--shadow-2)'
            }}
          >
            <Cross1Icon width={10} height={10} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const edgeTypes = { deletable: DeletableEdge }

// ── Props ────────────────────────────────────────────────────────────

interface WorkflowDiagramViewProps {
  draft: WorkflowDraft
  setDraft: React.Dispatch<React.SetStateAction<WorkflowDraft>>
  tools: Map<string, ToolDefinition>
  selectedStep: number | null
  onSelectStep: (index: number | null) => void
  onRemoveStep: (index: number) => void
  onMoveStep: (index: number, direction: -1 | 1) => void
  /** Marked-error step indices, derived from validation. */
  errorSteps: Set<number>
  /** Steps with non-fatal validation warnings (e.g. type-mismatch coercion). */
  warnSteps?: Set<number>
  /** Per-step-index validation issue (first error or warning), shown inline on the node. */
  stepIssueByIndex?: Map<number, { kind: 'error' | 'warning'; message: string }>
  /** Open the workflow template gallery — used by the empty-state CTA so an
   *  author who landed on a blank designer can pivot to starting from a template. */
  onOpenGallery?: () => void
  /** Drop handler invoked when a palette block is dragged onto the canvas.
   *  Receives the block id from the dataTransfer payload; the dialog owns the
   *  blocks list and is responsible for resolving the id and appending a step. */
  onAddBlockById?: (blockId: string) => void
  /** Switch the parent dialog back to the list view. Surfaced from the
   *  inspector's "Edit details" affordance so authors can jump into the
   *  richer per-step editor when the diagram inspector is read-only. */
  onSwitchToListView?: () => void
  /** Tools known to have an executor; used to badge nodes whose tool has no
   *  registered runner. Matches the palette's "config-only" badge so authors
   *  can spot non-runnable steps at a glance. */
  runnableTools?: Set<string>
}

// ── Component ────────────────────────────────────────────────────────

export function WorkflowDiagramView({
  draft,
  setDraft,
  tools,
  selectedStep,
  onSelectStep,
  onRemoveStep,
  onMoveStep,
  errorSteps,
  warnSteps,
  stepIssueByIndex,
  onOpenGallery,
  onAddBlockById,
  onSwitchToListView,
  runnableTools
}: WorkflowDiagramViewProps): React.ReactElement {
  // Names of workflow inputs / context fields that are actually referenced
  // by at least one step input. The synthetic source nodes dim entries that
  // nothing's pointed at yet so authors can see at a glance what's wired.
  const usedWfInputs = useMemo(() => {
    const used = new Set<string>()
    for (const step of draft.steps) {
      for (const binding of Object.values(step.inputs)) {
        if (binding.mode !== 'ref' || !binding.value) continue
        if (binding.value.startsWith('inputs.')) used.add(binding.value.slice('inputs.'.length))
      }
    }
    return used
  }, [draft.steps])

  const usedCtxFields = useMemo(() => {
    const used = new Set<string>()
    for (const step of draft.steps) {
      for (const binding of Object.values(step.inputs)) {
        if (binding.mode !== 'ref' || !binding.value) continue
        if (binding.value.startsWith('context.')) used.add(binding.value.slice('context.'.length))
      }
    }
    return used
  }, [draft.steps])

  // Build nodes: one per step, laid out left-to-right; plus synthetic
  // source pool nodes on the left for workflow inputs and form fields.
  const nodes = useMemo<Node[]>(() => {
    const stepNodes: Node<StepNodeData>[] = draft.steps.map((step, i) => {
      const tool = tools.get(step.tool)
      const block = detectBlockForStep(step, tools)

      // Annotate inputs that aren't satisfied by a graph edge. With the
      // synthetic source nodes in place, `inputs.X` and `context.X`
      // bindings show up as visible edges, so suppress the corresponding
      // badges to avoid duplicating the same info.
      const inputAnnotations: StepNodeData['inputAnnotations'] = {}
      for (const [inputName, binding] of Object.entries(step.inputs)) {
        if (!binding.value) {
          inputAnnotations[inputName] = null
          continue
        }
        if (binding.mode === 'constant') {
          inputAnnotations[inputName] = {
            kind: 'constant',
            tooltip: `Constant value: ${truncateForTooltip(binding.value)}`
          }
          continue
        }
        // wf-input / context bindings are now represented as edges from
        // synthetic source nodes, so don't badge them again.
        inputAnnotations[inputName] = null
      }

      return {
        id: `step-${i}`,
        type: 'step',
        position: { x: i * NODE_X_GAP, y: i * NODE_Y_GAP },
        data: {
          step,
          index: i,
          totalSteps: draft.steps.length,
          tool,
          blockLabel: block?.label || step.tool,
          blockIcon: block ? getBlockIcon(block.icon || '') : null,
          selected: selectedStep === i,
          hasError: errorSteps.has(i),
          hasWarning: warnSteps?.has(i) ?? false,
          configOnly: !isToolRunnable(tool, runnableTools),
          issue: stepIssueByIndex?.get(i),
          inputAnnotations,
          onSelect: (): void => onSelectStep(selectedStep === i ? null : i),
          onRemove: (): void => onRemoveStep(i),
          onMove: (direction: -1 | 1): void => onMoveStep(i, direction)
        },
        // We handle selection ourselves; React Flow's selection is not used.
        selectable: false,
        draggable: true
      }
    })

    const wfInputEntries = Object.entries(draft.workflowInputs).map(([name, def]) => ({
      name,
      type: def.type,
      label: name
    }))
    const ctxFieldEntries = Object.entries(draft.contextFields).map(([name, def]) => ({
      name,
      type: def.type,
      label: def.label || name
    }))

    const sourceNodes: Node<SourceNodeData>[] = []
    if (wfInputEntries.length > 0) {
      sourceNodes.push({
        id: 'src-wfinputs',
        type: 'source',
        position: { x: -NODE_X_GAP, y: 0 },
        data: {
          title: 'Workflow Inputs',
          kind: 'wf-input',
          entries: wfInputEntries,
          usedNames: usedWfInputs
        },
        selectable: false,
        draggable: true
      })
    }
    if (ctxFieldEntries.length > 0) {
      // Stack the form-fields node below the workflow-inputs node; if there
      // are no workflow inputs, anchor it at the top instead.
      const yOffset = wfInputEntries.length > 0 ? wfInputEntries.length * 28 + 80 : 0
      sourceNodes.push({
        id: 'src-ctxfields',
        type: 'source',
        position: { x: -NODE_X_GAP, y: yOffset },
        data: {
          title: 'Form Fields',
          kind: 'context',
          entries: ctxFieldEntries,
          usedNames: usedCtxFields
        },
        selectable: false,
        draggable: true
      })
    }

    return [...sourceNodes, ...stepNodes]
  }, [
    draft.steps,
    draft.workflowInputs,
    draft.contextFields,
    tools,
    selectedStep,
    errorSteps,
    warnSteps,
    stepIssueByIndex,
    onSelectStep,
    onRemoveStep,
    onMoveStep,
    runnableTools,
    usedWfInputs,
    usedCtxFields
  ])

  // Clear the input binding for a target step. Used by both the inline
  // edge × button and React Flow's keyboard-delete path.
  const clearInputBinding = useCallback(
    (tgtIdx: number, tgtIn: string) => {
      setDraft((prev) => {
        const targetStep = prev.steps[tgtIdx]
        if (!targetStep) return prev
        const steps = [...prev.steps]
        steps[tgtIdx] = {
          ...targetStep,
          inputs: {
            ...targetStep.inputs,
            [tgtIn]: { mode: 'ref', value: '' }
          }
        }
        return { ...prev, steps }
      })
    },
    [setDraft]
  )

  // Clear a single binding regardless of where its source came from.
  // Used by the synthetic-edge × button and by React Flow's keyboard
  // delete path for input-pool / form-pool edges.
  const clearBindingByEdgeId = useCallback(
    (edgeId: string) => {
      // step→step edge: e-<srcIdx>-<srcOut>-<tgtIdx>-<tgtIn>
      const stepEdge = edgeId.match(/^e-\d+-.+-(\d+)-(.+)$/)
      // wf-input → step edge: ewi-<src>-<tgtIdx>-<tgtIn>
      const wfiEdge = edgeId.match(/^ewi-.+-(\d+)-(.+)$/)
      // context → step edge: ectx-<src>-<tgtIdx>-<tgtIn>
      const ctxEdge = edgeId.match(/^ectx-.+-(\d+)-(.+)$/)
      const m = stepEdge || wfiEdge || ctxEdge
      if (!m) return
      const tgtIdx = parseInt(m[1], 10)
      const tgtIn = m[2]
      if (Number.isNaN(tgtIdx)) return
      clearInputBinding(tgtIdx, tgtIn)
    },
    [clearInputBinding]
  )

  // Build edges from step.X.outputs.Y refs and from synthetic source pools.
  const edges = useMemo<Edge[]>(() => {
    const out: Edge[] = []
    const stepIndexByName = new Map<string, number>()
    draft.steps.forEach((s, i) => stepIndexByName.set(s.name, i))

    draft.steps.forEach((step, targetIdx) => {
      for (const [inputName, binding] of Object.entries(step.inputs)) {
        if (binding.mode !== 'ref' || !binding.value) continue

        // inputs.X — edge from the Workflow Inputs synthetic node
        if (binding.value.startsWith('inputs.')) {
          const srcName = binding.value.slice('inputs.'.length)
          if (!draft.workflowInputs[srcName]) continue
          const wfDef = draft.workflowInputs[srcName]
          const tgtTool = tools.get(step.tool)
          const inDef = tgtTool?.inputs[inputName]
          const sourceType = wfDef.type
          const targetType = inDef?.type
          const compatible =
            !sourceType || !targetType ? true : isTypeCompatible(sourceType, targetType)
          const isCoercion = !!sourceType && !!targetType && sourceType !== targetType && compatible
          const color = compatible ? typeEdgeColorVar(sourceType) : 'var(--red-9)'
          out.push({
            id: `ewi-${srcName}-${targetIdx}-${inputName}`,
            source: 'src-wfinputs',
            sourceHandle: `out:${srcName}`,
            target: `step-${targetIdx}`,
            targetHandle: `in:${inputName}`,
            type: 'deletable',
            data: {
              onDelete: (): void => clearInputBinding(targetIdx, inputName),
              sourceType,
              targetType,
              edgeColor: color
            },
            style: {
              stroke: color,
              strokeWidth: !compatible ? 4 : 2,
              strokeDasharray: isCoercion ? '3 6' : undefined
            },
            markerEnd: { type: MarkerType.ArrowClosed, color },
            animated: false
          })
          continue
        }

        // context.X — edge from the Form Fields synthetic node
        if (binding.value.startsWith('context.')) {
          const srcName = binding.value.slice('context.'.length)
          if (!draft.contextFields[srcName]) continue
          const ctxDef = draft.contextFields[srcName]
          const tgtTool = tools.get(step.tool)
          const inDef = tgtTool?.inputs[inputName]
          const sourceType = ctxDef.type
          const targetType = inDef?.type
          const compatible =
            !sourceType || !targetType ? true : isTypeCompatible(sourceType, targetType)
          const isCoercion = !!sourceType && !!targetType && sourceType !== targetType && compatible
          const color = compatible ? typeEdgeColorVar(sourceType) : 'var(--red-9)'
          out.push({
            id: `ectx-${srcName}-${targetIdx}-${inputName}`,
            source: 'src-ctxfields',
            sourceHandle: `out:${srcName}`,
            target: `step-${targetIdx}`,
            targetHandle: `in:${inputName}`,
            type: 'deletable',
            data: {
              onDelete: (): void => clearInputBinding(targetIdx, inputName),
              sourceType,
              targetType,
              edgeColor: color
            },
            style: {
              stroke: color,
              strokeWidth: !compatible ? 4 : 2,
              strokeDasharray: isCoercion ? '3 6' : undefined
            },
            markerEnd: { type: MarkerType.ArrowClosed, color },
            animated: false
          })
          continue
        }

        const m = binding.value.match(/^steps\.(.+)\.outputs\.(.+)$/)
        if (!m) continue
        const [, srcName, srcOut] = m
        const srcIdx = stepIndexByName.get(srcName)
        if (srcIdx === undefined) continue

        const srcTool = tools.get(draft.steps[srcIdx].tool)
        const outDef = srcTool?.outputs[srcOut]
        const tgtTool = tools.get(draft.steps[targetIdx].tool)
        const inDef = tgtTool?.inputs[inputName]
        const sourceType = outDef?.type
        const targetType = inDef?.type
        const isArray = !!sourceType && sourceType.endsWith('[]')
        const compatible =
          !sourceType || !targetType ? true : isTypeCompatible(sourceType, targetType)
        const isCoercion = !!sourceType && !!targetType && sourceType !== targetType && compatible

        const color = compatible
          ? outDef
            ? typeEdgeColorVar(outDef.type)
            : 'var(--gray-8)'
          : 'var(--red-9)'

        out.push({
          id: `e-${srcIdx}-${srcOut}-${targetIdx}-${inputName}`,
          source: `step-${srcIdx}`,
          sourceHandle: `out:${srcOut}`,
          target: `step-${targetIdx}`,
          targetHandle: `in:${inputName}`,
          type: 'deletable',
          data: {
            onDelete: (): void => clearInputBinding(targetIdx, inputName),
            sourceType,
            targetType,
            edgeColor: color
          },
          style: {
            stroke: color,
            // Incompatible edges go thicker and solid so they read as a hard
            // error from across the canvas. Coercion stays the normal weight
            // but uses a light dash so it's still distinguishable from a
            // clean type match without competing with the error styling.
            strokeWidth: !compatible ? (isArray ? 5 : 4) : isArray ? 3 : 2,
            strokeDasharray: isCoercion ? '3 6' : undefined
          },
          markerEnd: { type: MarkerType.ArrowClosed, color },
          animated: false
        })
      }
    })

    return out
  }, [draft.steps, draft.workflowInputs, draft.contextFields, tools, clearInputBinding])

  // ── Edge mutations ─────────────────────────────────────────────────

  // Reject incompatible drag-drops before they become edges. Returns true
  // when the source output type can flow into the target input type
  // (exact match or registered coercion).
  const isValidConnection = useCallback(
    (conn: Connection | Edge): boolean => {
      if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) return false
      // Target must be a step input.
      if (!conn.target.startsWith('step-')) return false
      const tgtIdx = parseInt(conn.target.replace('step-', ''), 10)
      if (Number.isNaN(tgtIdx)) return false
      const tgtIn = conn.targetHandle.replace(/^in:/, '')
      const tgtTool = tools.get(draft.steps[tgtIdx]?.tool ?? '')
      const inType = tgtTool?.inputs[tgtIn]?.type
      const srcOut = conn.sourceHandle.replace(/^out:/, '')

      // Source: workflow inputs synthetic node
      if (conn.source === 'src-wfinputs') {
        const outType = draft.workflowInputs[srcOut]?.type
        if (!outType || !inType) return true
        return isTypeCompatible(outType, inType)
      }
      // Source: form-fields synthetic node
      if (conn.source === 'src-ctxfields') {
        const outType = draft.contextFields[srcOut]?.type
        if (!outType || !inType) return true
        return isTypeCompatible(outType, inType)
      }

      // Source: another step
      if (!conn.source.startsWith('step-')) return false
      const srcIdx = parseInt(conn.source.replace('step-', ''), 10)
      if (Number.isNaN(srcIdx)) return false
      if (srcIdx === tgtIdx) return false
      const srcTool = tools.get(draft.steps[srcIdx]?.tool ?? '')
      const outType = srcTool?.outputs[srcOut]?.type
      if (!outType || !inType) return true
      return isTypeCompatible(outType, inType)
    },
    [draft.steps, draft.workflowInputs, draft.contextFields, tools]
  )

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) return
      if (!conn.target.startsWith('step-')) return
      const tgtIdx = parseInt(conn.target.replace('step-', ''), 10)
      if (Number.isNaN(tgtIdx)) return
      const srcOut = conn.sourceHandle.replace(/^out:/, '')
      const tgtIn = conn.targetHandle.replace(/^in:/, '')

      // Resolve the binding value based on the source node kind.
      let bindingValue: string | null = null
      if (conn.source === 'src-wfinputs') {
        bindingValue = `inputs.${srcOut}`
      } else if (conn.source === 'src-ctxfields') {
        bindingValue = `context.${srcOut}`
      } else if (conn.source.startsWith('step-')) {
        const srcIdx = parseInt(conn.source.replace('step-', ''), 10)
        if (!Number.isNaN(srcIdx)) {
          const srcStep = draft.steps[srcIdx]
          if (srcStep) bindingValue = `steps.${srcStep.name}.outputs.${srcOut}`
        }
      }
      if (!bindingValue) return

      setDraft((prev) => {
        const steps = [...prev.steps]
        const targetStep = steps[tgtIdx]
        if (!targetStep) return prev
        steps[tgtIdx] = {
          ...targetStep,
          inputs: {
            ...targetStep.inputs,
            [tgtIn]: { mode: 'ref', value: bindingValue as string }
          }
        }
        return { ...prev, steps }
      })
    },
    [setDraft, draft.steps]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type !== 'remove') continue
        clearBindingByEdgeId(change.id)
      }
    },
    [clearBindingByEdgeId]
  )

  // ── Palette drag-and-drop ──────────────────────────────────────────
  //
  // Drag handlers live above the empty-state early return so the same
  // drop zone works whether the workflow has zero steps or fifty —
  // otherwise authors with a blank canvas can't drop their first block.
  // dragDepthRef tracks the enter/leave counter (the DOM fires both
  // events for child crossings, so a naive boolean would flicker).

  const [dragOver, setDragOver] = useState(false)
  const dragDepthRef = useRef(0)

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>): void => {
      if (!onAddBlockById) return
      if (!Array.from(e.dataTransfer.types).includes(BLOCK_DRAG_MIME)) return
      dragDepthRef.current += 1
      setDragOver(true)
    },
    [onAddBlockById]
  )

  const handleDragLeave = useCallback((): void => {
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setDragOver(false)
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>): void => {
      if (!onAddBlockById) return
      if (!Array.from(e.dataTransfer.types).includes(BLOCK_DRAG_MIME)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    },
    [onAddBlockById]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>): void => {
      dragDepthRef.current = 0
      setDragOver(false)
      if (!onAddBlockById) return
      const blockId = e.dataTransfer.getData(BLOCK_DRAG_MIME)
      if (!blockId) return
      e.preventDefault()
      onAddBlockById(blockId)
    },
    [onAddBlockById]
  )

  // ── Empty state ────────────────────────────────────────────────────

  if (draft.steps.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center bg-[var(--gray-2)] p-8"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={`flex flex-col items-center gap-4 max-w-md text-center border-2 border-dashed rounded-lg px-8 py-10 transition-colors ${
            dragOver
              ? 'border-[var(--accent-9)] bg-[var(--accent-3)]'
              : 'border-[var(--gray-6)] bg-[var(--color-background)]'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-[var(--accent-3)] flex items-center justify-center text-[var(--accent-11)]">
            <RocketIcon width="24" height="24" />
          </div>
          <div className="flex flex-col gap-1">
            <Text size="4" weight="bold" className="text-neutral-12">
              {dragOver ? 'Drop to add this step' : 'Build your first pipeline'}
            </Text>
            <Text size="2" className="text-neutral-9">
              {dragOver
                ? 'Release to drop the block onto the canvas.'
                : 'Click or drag a tool from the palette below to add your first step.'}
            </Text>
          </div>
          {!dragOver && (
            <div className="flex items-center gap-1 text-[var(--accent-11)]">
              <ArrowDownIcon />
              <Text size="2" weight="medium">
                Palette
              </Text>
            </div>
          )}
          {!dragOver && onOpenGallery && (
            <button
              className="text-sm text-[var(--accent-11)] hover:underline"
              onClick={onOpenGallery}
            >
              Or browse templates →
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────

  const selectedStepData = selectedStep !== null ? draft.steps[selectedStep] : null
  const selectedTool = selectedStepData ? tools.get(selectedStepData.tool) : undefined
  const selectedBlock = selectedStepData ? detectBlockForStep(selectedStepData, tools) : undefined

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        position: 'relative'
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop-zone highlight overlay — only visible while a palette block
          is being dragged. pointer-events:none so it doesn't intercept
          the drop event itself. */}
      {dragOver && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            border: '2px dashed var(--accent-9)',
            background: 'var(--accent-a3)',
            borderRadius: 6,
            zIndex: 10
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onConnect={onConnect}
          onEdgesChange={onEdgesChange}
          isValidConnection={isValidConnection}
          deleteKeyCode={['Delete', 'Backspace']}
          edgesFocusable
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1.0 }}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: 'deletable' }}
        >
          <Background gap={16} />
          <Controls showInteractive={false} />
          <Panel position="top-right">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 12px',
                borderRadius: 6,
                background: 'var(--color-panel-translucent)',
                border: '1px solid var(--gray-5)',
                boxShadow: 'var(--shadow-2)',
                color: 'var(--gray-11)'
              }}
              title="How inputs get their values"
            >
              <Text size="1" weight="medium" style={{ color: 'var(--gray-12)' }}>
                Input source:
              </Text>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    background: 'var(--iris-3)',
                    border: '2px solid var(--iris-9)',
                    borderRadius: 2
                  }}
                />
                <Text size="1">workflow input</Text>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    background: 'var(--orange-3)',
                    border: '2px solid var(--orange-9)',
                    borderRadius: 2
                  }}
                />
                <Text size="1">form field</Text>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Badge variant="soft" size="1" color="grass">
                  =
                </Badge>
                <Text size="1">constant</Text>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 18,
                    height: 2,
                    background: 'var(--gray-8)',
                    borderRadius: 1
                  }}
                />
                <Text size="1">step output</Text>
              </span>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {selectedStepData && selectedStep !== null && (
        <aside
          aria-label={`Inspector for ${selectedBlock?.label || selectedStepData.tool}`}
          style={{
            width: 320,
            flexShrink: 0,
            borderLeft: '1px solid var(--gray-5)',
            background: 'var(--color-panel-solid)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Inspector header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderBottom: '1px solid var(--gray-5)',
              background: 'var(--gray-2)'
            }}
          >
            <span style={{ color: 'var(--accent-11)', display: 'flex' }}>
              {selectedBlock ? getBlockIcon(selectedBlock.icon || '') : null}
            </span>
            <Text size="2" weight="bold" style={{ flex: 1, minWidth: 0 }} truncate>
              {selectedBlock?.label || selectedStepData.tool}
            </Text>
            <Badge variant="soft" size="1" color="gray">
              {selectedStep + 1}
            </Badge>
            <IconButton
              size="1"
              variant="ghost"
              color="gray"
              onClick={(): void => onSelectStep(null)}
              aria-label="Close inspector"
              title="Close inspector"
            >
              <Cross1Icon />
            </IconButton>
          </div>

          {/* Inspector body */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Text size="1" weight="medium" style={{ color: 'var(--gray-11)' }}>
                  Step name
                </Text>
                <TextField.Root
                  size="2"
                  value={selectedStepData.name}
                  onChange={(e): void => {
                    const newName = e.target.value
                    setDraft((prev) => {
                      const steps = [...prev.steps]
                      steps[selectedStep] = { ...steps[selectedStep], name: newName }
                      return { ...prev, steps }
                    })
                  }}
                />
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Text size="1" weight="medium" style={{ color: 'var(--gray-11)' }}>
                  Tool
                </Text>
                <Text size="2" style={{ color: 'var(--gray-12)', fontFamily: 'var(--font-mono)' }}>
                  {selectedStepData.tool}
                </Text>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Text size="1" weight="medium" style={{ color: 'var(--gray-11)' }}>
                  Inputs
                </Text>
                {selectedTool && Object.entries(selectedTool.inputs).length > 0 ? (
                  Object.entries(selectedTool.inputs).map(([inputName, def]) => {
                    const binding = selectedStepData.inputs[inputName]
                    const summary = !binding?.value
                      ? { label: 'unset', color: 'gray' as const }
                      : binding.mode === 'constant'
                        ? {
                            label: `= ${truncateForTooltip(binding.value)}`,
                            color: 'grass' as const
                          }
                        : binding.value.startsWith('inputs.')
                          ? {
                              label: `in: ${binding.value.slice('inputs.'.length)}`,
                              color: 'iris' as const
                            }
                          : binding.value.startsWith('context.')
                            ? {
                                label: `form: ${binding.value.slice('context.'.length)}`,
                                color: 'orange' as const
                              }
                            : {
                                label: binding.value.replace(/^steps\./, ''),
                                color: 'gray' as const
                              }
                    return (
                      <div
                        key={inputName}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 0',
                          borderBottom: '1px dashed var(--gray-4)'
                        }}
                      >
                        <Text
                          size="1"
                          style={{ color: 'var(--gray-12)', flex: 1, minWidth: 0 }}
                          truncate
                          title={inputName}
                        >
                          {inputName}
                          <Text size="1" style={{ color: 'var(--gray-9)' }}>
                            {' '}
                            ({def.type})
                          </Text>
                        </Text>
                        <Badge variant="soft" size="1" color={summary.color}>
                          {summary.label}
                        </Badge>
                      </div>
                    )
                  })
                ) : (
                  <Text size="1" style={{ color: 'var(--gray-9)' }}>
                    No inputs.
                  </Text>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Text size="1" weight="medium" style={{ color: 'var(--gray-11)' }}>
                  Outputs
                </Text>
                {selectedTool && Object.entries(selectedTool.outputs).length > 0 ? (
                  Object.entries(selectedTool.outputs).map(([outName, def]) => (
                    <div
                      key={outName}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 0',
                        borderBottom: '1px dashed var(--gray-4)'
                      }}
                    >
                      <Text
                        size="1"
                        style={{ color: 'var(--gray-12)', flex: 1, minWidth: 0 }}
                        truncate
                        title={outName}
                      >
                        {outName}
                      </Text>
                      <Badge variant="soft" size="1" color="gray">
                        {def.type}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <Text size="1" style={{ color: 'var(--gray-9)' }}>
                    No outputs.
                  </Text>
                )}
              </div>
            </div>
          </div>

          {/* Inspector footer — escape hatch to the richer list editor where
              input bindings can actually be changed. */}
          {onSwitchToListView && (
            <div
              style={{
                padding: '10px 12px',
                borderTop: '1px solid var(--gray-5)',
                background: 'var(--gray-2)'
              }}
            >
              <Button
                variant="soft"
                size="1"
                onClick={onSwitchToListView}
                style={{ width: '100%' }}
              >
                Edit bindings in list view →
              </Button>
            </div>
          )}
        </aside>
      )}
    </div>
  )
}
