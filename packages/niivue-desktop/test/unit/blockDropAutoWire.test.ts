// ── Designer drag-and-drop auto-wiring ───────────────────────────────
//
// Loads the live tool registry from disk and exercises the entry points
// that fire when a user drops a block onto the designer canvas:
//
//   1. blockToStepDraft     — runs on drop; applies block defaults,
//                              wires exposed fields to context, and
//                              auto-wires hidden inputs to compatible
//                              sources (workflow inputs → most-recent
//                              step output).
//   2. autoWireStep          — runs after a pipeline edit (insert,
//                              reorder); fills in any unbound inputs
//                              against currently-available sources.
//   3. repairBlockDefaults  — runs at load; backfills missing block
//                              defaults and prunes empty sections so
//                              JSON saved against an older tool version
//                              still drives the same wiring.
//
// These assertions document the contract users rely on: "drop a block,
// the engine figures out where the data comes from."

import { describe, it, expect, beforeAll, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: () => '/tmp/niivue-testbed' }
}))

import { setupWorkflowTestbed } from '../helpers/workflowTestbed.js'
import { getToolDefinitions } from '../../src/main/utils/workflowLoader.js'
import {
  getWorkflowBlocks,
  getBlockById,
  blockToStepDraft,
  blockToContextFields,
  blockToFormSection,
  autoWireStep,
  repairBlockDefaults,
  type StepDraft,
  type WorkflowDraft,
  type WorkflowBlock
} from '../../src/common/workflowBlocks.js'
import type { ToolDefinition } from '../../src/common/workflowTypes.js'

// ── Test fixtures ─────────────────────────────────────────────────────

let tools: Map<string, ToolDefinition>
let blocks: WorkflowBlock[]

/** Standard workflow inputs every test starts from — mirrors what the
 *  built-in DICOM-driven workflows declare. */
const DICOM_WORKFLOW_INPUTS = {
  dicom_dir: { type: 'dicom-folder', description: 'DICOM source directory' }
}

const EMPTY_DRAFT: WorkflowDraft = {
  name: 'test',
  version: '1.0.0',
  description: '',
  menu: 'Processing',
  sections: [],
  contextFields: {},
  steps: [],
  workflowInputs: DICOM_WORKFLOW_INPUTS,
  workflowOutputs: {}
}

beforeAll(() => {
  setupWorkflowTestbed()
  tools = getToolDefinitions()
  blocks = getWorkflowBlocks(tools)
})

// ── Helpers ───────────────────────────────────────────────────────────

function dropBlock(blockId: string, existing: StepDraft[]): StepDraft {
  const block = getBlockById(tools, blockId)
  if (!block) throw new Error(`Test setup: no block '${blockId}'`)
  return blockToStepDraft(block, existing.length, existing, tools, DICOM_WORKFLOW_INPUTS)
}

/** Required inputs (non-optional) declared on a tool. */
function requiredInputs(toolName: string): string[] {
  const tool = tools.get(toolName)!
  return Object.entries(tool.inputs)
    .filter(([, def]) => !def.optional)
    .map(([name]) => name)
}

// ── 1. Palette discovery ─────────────────────────────────────────────

describe('palette derivation', () => {
  it('exposes a non-empty palette derived from tool definitions', () => {
    expect(blocks.length).toBeGreaterThan(0)
    // Every block belongs to exactly one of the four UI categories
    const categories = new Set(blocks.map((b) => b.category))
    for (const c of categories) {
      expect(['Import', 'Processing', 'Quality', 'Output']).toContain(c)
    }
  })

  it('every palette block resolves to a known tool', () => {
    for (const block of blocks) {
      expect(tools.has(block.tool), `block '${block.id}' → unknown tool '${block.tool}'`).toBe(true)
    }
  })

  it('a tool can declare multiple blocks that share its inputs/outputs', () => {
    // dcm2niix declares both `import-dicoms` and `filter-import-dicoms`;
    // both must resolve to the same tool.
    const importDicoms = getBlockById(tools, 'import-dicoms')
    const filterImport = getBlockById(tools, 'filter-import-dicoms')
    expect(importDicoms?.tool).toBe('dcm2niix')
    expect(filterImport?.tool).toBe('dcm2niix')
  })
})

// ── 2. Single-block drop ─────────────────────────────────────────────

describe('blockToStepDraft — single drop', () => {
  it('every palette block drops without throwing', () => {
    for (const block of blocks) {
      expect(
        () => blockToStepDraft(block, 0, [], tools, DICOM_WORKFLOW_INPUTS),
        `drop of '${block.id}' threw`
      ).not.toThrow()
    }
  })

  it('every palette block produces a step with a unique generated name', () => {
    const dropped = blocks.map((b, i) =>
      blockToStepDraft(b, i, [], tools, DICOM_WORKFLOW_INPUTS).name
    )
    expect(new Set(dropped).size).toBe(dropped.length)
  })

  it('applies block defaults as constants when the value is a scalar', () => {
    // import-dicoms ships with bids:'y', compress:'y', bids_anon:'n' as defaults
    const step = dropBlock('import-dicoms', [])
    expect(step.inputs.bids).toEqual({ mode: 'constant', value: '"y"' })
    expect(step.inputs.compress).toEqual({ mode: 'constant', value: '"y"' })
    expect(step.inputs.bids_anon).toEqual({ mode: 'constant', value: '"n"' })
  })

  it('wires exposed tool inputs to context.<name> so the user form drives them', () => {
    // import-dicoms exposes `dicom_dir`. Even though the workflow declares an
    // `inputs.dicom_dir` of compatible type, exposed fields *always* route
    // through context — the form is the single source of truth users edit.
    const step = dropBlock('import-dicoms', [])
    expect(step.inputs.dicom_dir).toEqual({ mode: 'ref', value: 'context.dicom_dir' })
  })

  it('synthetic exposed-field names (no matching tool input) do not appear as step inputs', () => {
    // classify-bids exposes `series_list`, which is NOT a tool input — it's a
    // user-friendly rename of the `overrides` input. Step inputs should
    // contain `overrides` (wired to context.series_list via the default), not
    // `series_list` itself.
    const step = dropBlock('classify-bids', [])
    expect(step.inputs.series_list).toBeUndefined()
    expect(step.inputs.overrides).toEqual({ mode: 'ref', value: 'context.series_list' })
  })

  it('hidden inputs auto-wire to a compatible workflow input when present', () => {
    // fix-bids-sidecars's hidden `bids_dir` input has type `bids-dir`. Adding
    // a `bids_dir: bids-dir` workflow input should make blockToStepDraft pick
    // it up directly, without any upstream step.
    const block = getBlockById(tools, 'fix-bids-sidecars')!
    const wfInputs = { bids_dir: { type: 'bids-dir', description: '' } }
    const step = blockToStepDraft(block, 0, [], tools, wfInputs)
    expect(step.inputs.bids_dir).toEqual({ mode: 'ref', value: 'inputs.bids_dir' })
  })

  it('leaves required inputs unbound (empty ref) when no compatible source exists', () => {
    // skull-strip needs `nifti_paths: volume[]`, but with no preceding step
    // there is nothing in the workflow that produces volumes. The drop should
    // succeed; the validator surfaces the missing wire later.
    const step = dropBlock('skull-strip', [])
    expect(step.inputs.nifti_paths).toEqual({ mode: 'ref', value: '' })
  })

  it('produces context fields for every exposed and required-context field', () => {
    const block = getBlockById(tools, 'classify-bids')!
    const tool = tools.get(block.tool)!
    const fields = blockToContextFields(block, tool)
    // exposed: series_list (synthetic, proxied from `overrides`)
    expect(fields.series_list).toBeDefined()
    expect(fields.series_list.type).toBe('series-mapping[]')
  })

  it('produces a form section that lists exactly the exposed fields', () => {
    const block = getBlockById(tools, 'import-dicoms')!
    const section = blockToFormSection(block)
    expect(section.fields).toEqual(['dicom_dir'])
    expect(section.title).toBe(block.label)
  })
})

// ── 3. Sequential drop — auto-wiring across steps ────────────────────

describe('blockToStepDraft — sequential drops auto-wire from upstream outputs', () => {
  // The headline contract: "drop two blocks, the second wires from the first."

  it('skull-strip → wires nifti_paths from import-dicoms.volumes (volume[] → volume[])', () => {
    const a = dropBlock('import-dicoms', [])
    const b = dropBlock('skull-strip', [a])
    expect(b.inputs.nifti_paths).toEqual({
      mode: 'ref',
      value: `steps.${a.name}.outputs.volumes`
    })
  })

  it('segment-tissue (no exposed fields) auto-wires nifti_paths directly to upstream volumes', () => {
    const a = dropBlock('import-dicoms', [])
    const b = dropBlock('segment-tissue', [a])
    expect(b.inputs.nifti_paths).toEqual({
      mode: 'ref',
      value: `steps.${a.name}.outputs.volumes`
    })
  })

  it('atlas-parcellate exposes nifti_paths → routes via context', () => {
    const a = dropBlock('import-dicoms', [])
    const b = dropBlock('atlas-parcellate', [a])
    expect(b.inputs.nifti_paths).toEqual({ mode: 'ref', value: 'context.nifti_paths' })
  })

  it('niimath exposes nifti_paths → routes via context', () => {
    const a = dropBlock('import-dicoms', [])
    const b = dropBlock('niimath', [a])
    expect(b.inputs.nifti_paths).toEqual({ mode: 'ref', value: 'context.nifti_paths' })
  })

  it('classify-bids → wires hidden sidecars input from import-dicoms.sidecars (json[])', () => {
    const a = dropBlock('import-dicoms', [])
    const b = dropBlock('classify-bids', [a])
    expect(b.inputs.sidecars).toEqual({
      mode: 'ref',
      value: `steps.${a.name}.outputs.sidecars`
    })
  })

  it('write-bids → wires volumes from import-dicoms but keeps mappings/config bound to context (block defaults)', () => {
    const a = dropBlock('import-dicoms', [])
    const b = dropBlock('write-bids', [a])
    // Hidden, no default → auto-wired to upstream output
    expect(b.inputs.volumes).toEqual({
      mode: 'ref',
      value: `steps.${a.name}.outputs.volumes`
    })
    // Hidden ref-default → forced to context (the user-edited series list,
    // not the raw upstream sidecars)
    expect(b.inputs.mappings).toEqual({ mode: 'ref', value: 'context.series_list' })
    expect(b.inputs.config).toEqual({ mode: 'ref', value: 'context' })
    // Exposed → wires to context.<name>
    expect(b.inputs.output_dir).toEqual({ mode: 'ref', value: 'context.output_dir' })
  })

  it('fix-bids-sidecars → wires bids_dir from a preceding write-bids step', () => {
    const a = dropBlock('import-dicoms', [])
    const b = dropBlock('write-bids', [a])
    const c = dropBlock('fix-bids-sidecars', [a, b])
    expect(c.inputs.bids_dir).toEqual({
      mode: 'ref',
      value: `steps.${b.name}.outputs.bids_dir`
    })
  })
})

// ── 4. Recency wins in chains ────────────────────────────────────────

describe('blockToStepDraft — chain wiring prefers most-recent producer (hidden inputs only)', () => {
  it('a chain of two hidden-input consumers picks each upstream output in order', () => {
    // Both skull-strip and segment-tissue have empty exposedFields, so their
    // nifti_paths inputs go through findCompatibleSource. The second
    // consumer should wire from the first consumer's output_paths (most
    // recent volume[]), not the original import.
    const importStep = dropBlock('import-dicoms', [])
    const stripStep = dropBlock('skull-strip', [importStep])
    const segmentStep = dropBlock('segment-tissue', [importStep, stripStep])

    expect(stripStep.inputs.nifti_paths).toEqual({
      mode: 'ref',
      value: `steps.${importStep.name}.outputs.volumes`
    })
    expect(segmentStep.inputs.nifti_paths).toEqual({
      mode: 'ref',
      value: `steps.${stripStep.name}.outputs.output_paths`
    })
  })
})

// ── 5. autoWireStep heals after pipeline edits ───────────────────────

describe('autoWireStep — re-wires unbound inputs after pipeline changes', () => {
  it('does nothing when all inputs are already bound', () => {
    const a = dropBlock('import-dicoms', [])
    const b = dropBlock('skull-strip', [a])
    const rewired = autoWireStep(b, 1, [a, b], tools, DICOM_WORKFLOW_INPUTS)
    expect(rewired.inputs.nifti_paths).toEqual(b.inputs.nifti_paths)
  })

  it('fills in an empty ref once a producer becomes available upstream', () => {
    // First drop the consumer alone — no producer, hidden input is empty.
    const consumerAlone = dropBlock('skull-strip', [])
    expect(consumerAlone.inputs.nifti_paths.value).toBe('')

    // Now insert a producer ahead of it and re-wire.
    const producer = dropBlock('import-dicoms', [])
    const rewired = autoWireStep(
      consumerAlone,
      1,
      [producer, consumerAlone],
      tools,
      DICOM_WORKFLOW_INPUTS
    )
    expect(rewired.inputs.nifti_paths).toEqual({
      mode: 'ref',
      value: `steps.${producer.name}.outputs.volumes`
    })
  })

  it('preserves explicit constants and non-empty refs', () => {
    const block = getBlockById(tools, 'niimath')!
    const draft = blockToStepDraft(block, 0, [], tools, DICOM_WORKFLOW_INPUTS)
    // Pretend the user typed an explicit operation
    draft.inputs.operation = { mode: 'constant', value: '"-thr 100"' }
    draft.inputs.nifti_paths = { mode: 'ref', value: 'inputs.dicom_dir' } // bogus but explicit
    const rewired = autoWireStep(draft, 0, [draft], tools, DICOM_WORKFLOW_INPUTS)
    expect(rewired.inputs.operation).toEqual({ mode: 'constant', value: '"-thr 100"' })
    expect(rewired.inputs.nifti_paths.value).toBe('inputs.dicom_dir')
  })
})

// ── 6. repairBlockDefaults survives drops + reload ───────────────────

describe('repairBlockDefaults — load-time heal preserves freshly-dropped wiring', () => {
  it('preserves every non-empty binding across the repair pass', () => {
    // Repair must never silently overwrite a user's actual wiring. We allow
    // it to *fill in* missing/empty refs, but anything explicit (constant or
    // a non-empty ref) survives untouched.
    const a = dropBlock('import-dicoms', [])
    const b = dropBlock('skull-strip', [a])
    const c = dropBlock('write-bids', [a, b])
    const draft: WorkflowDraft = {
      ...EMPTY_DRAFT,
      steps: [a, b, c],
      sections: [
        blockToFormSection(getBlockById(tools, 'import-dicoms')!),
        blockToFormSection(getBlockById(tools, 'write-bids')!)
      ],
      contextFields: {
        ...blockToContextFields(getBlockById(tools, 'classify-bids')!, tools.get('bids-classify')!)
      }
    }
    const repaired = repairBlockDefaults(draft, tools)

    for (let i = 0; i < draft.steps.length; i++) {
      const before = draft.steps[i].inputs
      const after = repaired.steps[i].inputs
      for (const [name, binding] of Object.entries(before)) {
        const hasValue =
          (binding.mode === 'constant' && binding.value !== '') ||
          (binding.mode === 'ref' && binding.value !== '')
        if (!hasValue) continue
        expect(after[name], `step ${draft.steps[i].name}.${name} was modified by repair`).toEqual(
          binding
        )
      }
    }
  })

  it('forces a hidden ref-default back into place when a saved step has drifted', () => {
    // Simulate a stale save: write-bids.mappings ended up wired to the
    // previous step's `sidecars` output (a type-compatible but wrong choice).
    // The repair pass restores the block-declared default.
    const a = dropBlock('import-dicoms', [])
    const c = dropBlock('write-bids', [a])
    const driftedC: StepDraft = {
      ...c,
      inputs: {
        ...c.inputs,
        mappings: { mode: 'ref', value: `steps.${a.name}.outputs.sidecars` }
      }
    }
    const draft: WorkflowDraft = { ...EMPTY_DRAFT, steps: [a, driftedC] }
    const repaired = repairBlockDefaults(draft, tools)
    expect(repaired.steps[1].inputs.mappings).toEqual({
      mode: 'ref',
      value: 'context.series_list'
    })
  })

  it('prunes form sections that would render blank (no fields, no custom component)', () => {
    const a = dropBlock('import-dicoms', [])
    const draft: WorkflowDraft = {
      ...EMPTY_DRAFT,
      steps: [a],
      sections: [
        { title: 'Empty', description: '', fields: [], component: '', buttonText: '' },
        { title: 'Has fields', description: '', fields: ['dicom_dir'], component: '', buttonText: '' },
        { title: 'Has component', description: '', fields: [], component: 'bids-preview', buttonText: '' }
      ],
      contextFields: { dicom_dir: { type: 'dicom-folder', label: '', description: '', heuristic: '', default: '' } }
    }
    const repaired = repairBlockDefaults(draft, tools)
    expect(repaired.sections.map((s) => s.title)).toEqual(['Has fields', 'Has component'])
  })
})

// ── 7. Required-input coverage sanity ────────────────────────────────

describe('drop coverage — the user can build a runnable pipeline by drag-and-drop alone', () => {
  it('dicom-to-bids equivalent: import-dicoms → classify-bids → write-bids has every required input wired', () => {
    const a = dropBlock('import-dicoms', [])
    const b = dropBlock('classify-bids', [a])
    const c = dropBlock('write-bids', [a, b])

    const stepsByTool = [a, b, c].map((s) => ({ step: s, tool: s.tool }))
    for (const { step, tool } of stepsByTool) {
      const required = requiredInputs(tool)
      for (const inputName of required) {
        const binding = step.inputs[inputName]
        expect(
          binding,
          `${tool}.${inputName} has no binding after drop`
        ).toBeDefined()
        // Either a constant or a non-empty ref counts as "wired"
        const isWired =
          (binding.mode === 'constant' && binding.value !== '') ||
          (binding.mode === 'ref' && binding.value !== '')
        expect(
          isWired,
          `${tool}.${inputName} ended up unbound after drag-and-drop alone`
        ).toBe(true)
      }
    }
  })
})
