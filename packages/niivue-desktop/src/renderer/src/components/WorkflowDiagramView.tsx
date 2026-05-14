// ── WorkflowDiagramView ──────────────────────────────────────────────
//
// Interactive node-graph view of a WorkflowDraft built on @xyflow/react.
// Each step renders as a node with one handle per tool input (left) and
// one per tool output (right). Edges represent `steps.X.outputs.Y` refs.
// Connecting two handles writes the corresponding ref into the target
// step's input binding; deleting an edge clears that binding.
//
// Refs to workflow inputs (`inputs.X`) or context fields (`context.X`)
// are not drawn as edges — they appear as a small badge on the input
// handle so the diagram stays readable.

import React, { useMemo, useCallback } from 'react'
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
import { Badge, Text } from '@radix-ui/themes'
import {
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  RocketIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  Cross1Icon
} from '@radix-ui/react-icons'
import type { ToolDefinition } from '../../../common/workflowTypes.js'
import {
  detectBlockForStep,
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

/** Map a TYPE_COLORS value (Radix color name) to a CSS variable. */
function typeColorVar(type: string): string {
  const c = TYPE_COLORS[type] || 'gray'
  return `var(--${c}-9)`
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
  /** First validation error/warning message for this step, surfaced inline under the header. */
  issue?: { kind: 'error' | 'warning'; message: string }
  /**
   * input name → annotation describing where the value comes from. `null`
   * means the input is unbound or wired from another step (the latter is
   * shown as a graph edge instead of a badge).
   */
  inputAnnotations: Record<
    string,
    { kind: 'wf-input' | 'context' | 'constant'; tooltip: string } | null
  >
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

  const inputs = tool ? Object.entries(tool.inputs) : []
  const outputs = tool ? Object.entries(tool.outputs) : []

  const ringColor = hasError
    ? 'var(--red-7)'
    : hasWarning
      ? 'var(--amber-8)'
      : selected
        ? 'var(--accent-8)'
        : 'var(--gray-6)'

  return (
    <div
      onClick={onSelect}
      style={{
        width: NODE_WIDTH,
        background: 'var(--color-panel-solid)',
        border: `2px solid ${ringColor}`,
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        fontFamily: 'inherit'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderBottom: '1px solid var(--gray-5)',
          background: selected ? 'var(--accent-3)' : 'var(--gray-2)',
          borderRadius: '6px 6px 0 0'
        }}
      >
        <span style={{ color: selected ? 'var(--accent-11)' : 'var(--gray-11)' }}>{blockIcon}</span>
        <Text size="2" weight="bold" style={{ flex: 1, minWidth: 0 }} truncate>
          {blockLabel}
        </Text>
        <Badge variant="soft" size="1" color={hasError ? 'red' : 'gray'}>
          {index + 1}
        </Badge>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMove(-1)
          }}
          disabled={index === 0}
          aria-label="Move step earlier"
          title="Move earlier"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: index === 0 ? 'not-allowed' : 'pointer',
            color: index === 0 ? 'var(--gray-7)' : 'var(--gray-9)',
            padding: 2,
            display: 'flex'
          }}
        >
          <ChevronUpIcon />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMove(1)
          }}
          disabled={index === totalSteps - 1}
          aria-label="Move step later"
          title="Move later"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: index === totalSteps - 1 ? 'not-allowed' : 'pointer',
            color: index === totalSteps - 1 ? 'var(--gray-7)' : 'var(--gray-9)',
            padding: 2,
            display: 'flex'
          }}
        >
          <ChevronDownIcon />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={`Remove step ${step.name || index + 1}`}
          title="Remove step"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--gray-9)',
            padding: 2,
            display: 'flex'
          }}
        >
          <TrashIcon />
        </button>
      </div>

      {/* Inline validation message — surfaced on the offending node so authors
          don't have to open the header popover to discover what's wrong. */}
      {issue && (
        <div
          role={issue.kind === 'error' ? 'alert' : 'status'}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
            padding: '6px 10px',
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
      <div style={{ display: 'flex', padding: '6px 0' }}>
        {/* Inputs column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                    gap: 4,
                    minHeight: 18
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
                  {annot?.kind === 'wf-input' && (
                    <span title={annot.tooltip} style={{ display: 'inline-flex' }}>
                      <Badge variant="soft" size="1" color="iris">
                        in
                      </Badge>
                    </span>
                  )}
                  {annot?.kind === 'context' && (
                    <span title={annot.tooltip} style={{ display: 'inline-flex' }}>
                      <Badge variant="soft" size="1" color="orange">
                        form
                      </Badge>
                    </span>
                  )}
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                  gap: 4,
                  minHeight: 18
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

      {/* Step name footer (small) */}
      <div
        style={{
          padding: '4px 10px 6px',
          borderTop: '1px solid var(--gray-4)',
          background: 'var(--gray-1)',
          borderRadius: '0 0 6px 6px'
        }}
      >
        <Text size="1" style={{ color: 'var(--gray-10)', fontFamily: 'var(--code-font-family)' }}>
          {step.name}
        </Text>
      </div>
    </div>
  )
}

const nodeTypes = { step: StepNode }

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
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
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
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
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
  onAddBlockById
}: WorkflowDiagramViewProps): React.ReactElement {
  // Build nodes: one per step, laid out left-to-right.
  const nodes = useMemo<Node<StepNodeData>[]>(() => {
    return draft.steps.map((step, i) => {
      const tool = tools.get(step.tool)
      const block = detectBlockForStep(step, tools)

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
        if (binding.value.startsWith('inputs.')) {
          const wfInput = binding.value.slice('inputs.'.length)
          inputAnnotations[inputName] = {
            kind: 'wf-input',
            tooltip: `Workflow input: ${wfInput}`
          }
        } else if (binding.value.startsWith('context.')) {
          const ctxField = binding.value.slice('context.'.length)
          inputAnnotations[inputName] = {
            kind: 'context',
            tooltip: `Form / context field: ${ctxField}`
          }
        } else {
          inputAnnotations[inputName] = null
        }
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
  }, [
    draft.steps,
    tools,
    selectedStep,
    errorSteps,
    warnSteps,
    stepIssueByIndex,
    onSelectStep,
    onRemoveStep,
    onMoveStep
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

  // Build edges from step.X.outputs.Y refs.
  const edges = useMemo<Edge[]>(() => {
    const out: Edge[] = []
    const stepIndexByName = new Map<string, number>()
    draft.steps.forEach((s, i) => stepIndexByName.set(s.name, i))

    draft.steps.forEach((step, targetIdx) => {
      for (const [inputName, binding] of Object.entries(step.inputs)) {
        if (binding.mode !== 'ref' || !binding.value) continue
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
            ? typeColorVar(outDef.type)
            : 'var(--gray-9)'
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
            strokeDasharray: isCoercion ? '4 4' : undefined
          },
          markerEnd: { type: MarkerType.ArrowClosed, color },
          animated: false
        })
      }
    })

    return out
  }, [draft.steps, tools, clearInputBinding])

  // ── Edge mutations ─────────────────────────────────────────────────

  // Reject incompatible drag-drops before they become edges. Returns true
  // when the source output type can flow into the target input type
  // (exact match or registered coercion).
  const isValidConnection = useCallback(
    (conn: Connection | Edge): boolean => {
      if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) return false
      const srcIdx = parseInt(conn.source.replace('step-', ''), 10)
      const tgtIdx = parseInt(conn.target.replace('step-', ''), 10)
      if (Number.isNaN(srcIdx) || Number.isNaN(tgtIdx)) return false
      // Self-loops aren't meaningful here.
      if (srcIdx === tgtIdx) return false
      const srcOut = conn.sourceHandle.replace(/^out:/, '')
      const tgtIn = conn.targetHandle.replace(/^in:/, '')
      const srcTool = tools.get(draft.steps[srcIdx]?.tool ?? '')
      const tgtTool = tools.get(draft.steps[tgtIdx]?.tool ?? '')
      const outType = srcTool?.outputs[srcOut]?.type
      const inType = tgtTool?.inputs[tgtIn]?.type
      // If either side's type is unknown, fall back to permissive behavior
      // rather than blocking — unknown-type tools shouldn't become unwireable.
      if (!outType || !inType) return true
      return isTypeCompatible(outType, inType)
    },
    [draft.steps, tools]
  )

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) return
      const srcIdx = parseInt(conn.source.replace('step-', ''), 10)
      const tgtIdx = parseInt(conn.target.replace('step-', ''), 10)
      if (Number.isNaN(srcIdx) || Number.isNaN(tgtIdx)) return
      const srcOut = conn.sourceHandle.replace(/^out:/, '')
      const tgtIn = conn.targetHandle.replace(/^in:/, '')

      setDraft((prev) => {
        const srcStep = prev.steps[srcIdx]
        if (!srcStep) return prev
        const steps = [...prev.steps]
        const targetStep = steps[tgtIdx]
        steps[tgtIdx] = {
          ...targetStep,
          inputs: {
            ...targetStep.inputs,
            [tgtIn]: { mode: 'ref', value: `steps.${srcStep.name}.outputs.${srcOut}` }
          }
        }
        return { ...prev, steps }
      })
    },
    [setDraft]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type !== 'remove') continue
        // Edge id encodes target step index and input name.
        const m = change.id.match(/^e-\d+-.+-(\d+)-(.+)$/)
        if (!m) continue
        const tgtIdx = parseInt(m[1], 10)
        const tgtIn = m[2]
        if (Number.isNaN(tgtIdx)) continue
        clearInputBinding(tgtIdx, tgtIn)
      }
    },
    [clearInputBinding]
  )

  // ── Empty state ────────────────────────────────────────────────────

  if (draft.steps.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--gray-2)] p-8">
        <div className="flex flex-col items-center gap-4 max-w-md text-center border-2 border-dashed border-[var(--gray-6)] rounded-lg px-8 py-10 bg-[var(--color-background)]">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-3)] flex items-center justify-center text-[var(--accent-11)]">
            <RocketIcon width="24" height="24" />
          </div>
          <div className="flex flex-col gap-1">
            <Text size="4" weight="bold" className="text-neutral-12">
              Build your first pipeline
            </Text>
            <Text size="2" className="text-neutral-9">
              Pick a tool from the palette below to add your first step.
            </Text>
          </div>
          <div className="flex items-center gap-1 text-[var(--accent-11)]">
            <ArrowDownIcon />
            <Text size="2" weight="medium">
              Palette
            </Text>
          </div>
          {onOpenGallery && (
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
      if (!onAddBlockById) return
      const blockId = e.dataTransfer.getData(BLOCK_DRAG_MIME)
      if (!blockId) return
      e.preventDefault()
      onAddBlockById(blockId)
    },
    [onAddBlockById]
  )

  return (
    <div
      style={{ flex: 1, height: '100%', minHeight: 0 }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
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
              gap: 10,
              padding: '6px 10px',
              borderRadius: 6,
              background: 'var(--color-panel-translucent)',
              border: '1px solid var(--gray-5)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              fontSize: 11,
              color: 'var(--gray-11)'
            }}
            title="How inputs get their values"
          >
            <Text size="1" weight="medium" style={{ color: 'var(--gray-12)' }}>
              Input source:
            </Text>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Badge variant="soft" size="1" color="iris">
                in
              </Badge>
              <Text size="1">workflow input</Text>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Badge variant="soft" size="1" color="orange">
                form
              </Badge>
              <Text size="1">user form</Text>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Badge variant="soft" size="1" color="grass">
                =
              </Badge>
              <Text size="1">constant</Text>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 2,
                  background: 'var(--gray-9)',
                  borderRadius: 1
                }}
              />
              <Text size="1">step output</Text>
            </span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
