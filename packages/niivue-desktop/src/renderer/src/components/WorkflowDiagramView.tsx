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
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeChange,
  MarkerType
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Badge, Text } from '@radix-ui/themes'
import { TrashIcon, ChevronUpIcon, ChevronDownIcon } from '@radix-ui/react-icons'
import type { ToolDefinition } from '../../../common/workflowTypes.js'
import {
  detectBlockForStep,
  TYPE_COLORS,
  TYPE_LABELS,
  type StepDraft,
  type WorkflowDraft
} from '../../../common/workflowBlocks.js'
import { getBlockIcon } from './BlockPalette.js'

// ── Constants ────────────────────────────────────────────────────────

const NODE_WIDTH = 240
const NODE_X_GAP = 320
const NODE_Y_GAP = 40

/** Map a TYPE_COLORS value (Radix color name) to a CSS variable. */
function typeColorVar(type: string): string {
  const c = TYPE_COLORS[type] || 'gray'
  return `var(--${c}-9)`
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
  /** input name → 'wf-input' | 'context' | null (drawn as a badge on the handle) */
  inputAnnotations: Record<string, 'wf-input' | 'context' | null>
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
    inputAnnotations,
    onSelect,
    onRemove,
    onMove
  } = data

  const inputs = tool ? Object.entries(tool.inputs) : []
  const outputs = tool ? Object.entries(tool.outputs) : []

  const ringColor = hasError ? 'var(--red-7)' : selected ? 'var(--accent-8)' : 'var(--gray-6)'

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
                  {annot === 'wf-input' && (
                    <Badge variant="soft" size="1" color="iris">
                      in
                    </Badge>
                  )}
                  {annot === 'context' && (
                    <Badge variant="soft" size="1" color="orange">
                      form
                    </Badge>
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
  errorSteps
}: WorkflowDiagramViewProps): React.ReactElement {
  // Build nodes: one per step, laid out left-to-right.
  const nodes = useMemo<Node<StepNodeData>[]>(() => {
    return draft.steps.map((step, i) => {
      const tool = tools.get(step.tool)
      const block = detectBlockForStep(step, tools)

      const inputAnnotations: Record<string, 'wf-input' | 'context' | null> = {}
      for (const [inputName, binding] of Object.entries(step.inputs)) {
        if (binding.mode !== 'ref' || !binding.value) {
          inputAnnotations[inputName] = null
          continue
        }
        if (binding.value.startsWith('inputs.')) {
          inputAnnotations[inputName] = 'wf-input'
        } else if (binding.value.startsWith('context.')) {
          inputAnnotations[inputName] = 'context'
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
  }, [draft.steps, tools, selectedStep, errorSteps, onSelectStep, onRemoveStep, onMoveStep])

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
        const color = outDef ? typeColorVar(outDef.type) : 'var(--gray-9)'

        out.push({
          id: `e-${srcIdx}-${srcOut}-${targetIdx}-${inputName}`,
          source: `step-${srcIdx}`,
          sourceHandle: `out:${srcOut}`,
          target: `step-${targetIdx}`,
          targetHandle: `in:${inputName}`,
          style: { stroke: color, strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color },
          animated: false
        })
      }
    })

    return out
  }, [draft.steps, tools])

  // ── Edge mutations ─────────────────────────────────────────────────

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
      const removed = changes.filter((c) => c.type === 'remove')
      if (removed.length === 0) return

      setDraft((prev) => {
        let steps = prev.steps
        for (const change of removed) {
          // Edge id encodes target step index and input name.
          const m = change.id.match(/^e-\d+-.+-(\d+)-(.+)$/)
          if (!m) continue
          const tgtIdx = parseInt(m[1], 10)
          const tgtIn = m[2]
          if (Number.isNaN(tgtIdx) || !steps[tgtIdx]) continue
          if (steps === prev.steps) steps = [...steps]
          const targetStep = steps[tgtIdx]
          steps[tgtIdx] = {
            ...targetStep,
            inputs: {
              ...targetStep.inputs,
              [tgtIn]: { mode: 'ref', value: '' }
            }
          }
        }
        return steps === prev.steps ? prev : { ...prev, steps }
      })
    },
    [setDraft]
  )

  // ── Empty state ────────────────────────────────────────────────────

  if (draft.steps.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--gray-2)'
        }}
      >
        <Text size="3" style={{ color: 'var(--gray-9)' }}>
          Add a tool from the palette to start building your pipeline
        </Text>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, height: '100%', minHeight: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.0 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'default' }}
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
