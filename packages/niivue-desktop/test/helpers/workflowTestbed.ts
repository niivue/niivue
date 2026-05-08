// ── Workflow runtime testbed ─────────────────────────────────────────
//
// Loads every tool and workflow JSON from `workflows/` into the live
// registries, then swaps native-binary tools (dcm2niix, brainchop,
// atlas-parcellate, bids-fix-sidecars) and the code-registered heuristics
// for fixture stand-ins that record their inputs and return canned
// outputs. Returns a `spy` object that captures every executor/heuristic
// call made during a run, so tests can assert on wiring without booting
// Electron, spawning binaries, or touching real DICOM data.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  ToolExecutor,
  ToolDefinition,
  HeuristicFn
} from '../../src/common/workflowTypes.js'
import {
  loadDefinitionsFromPath,
  getToolDefinitions
} from '../../src/main/utils/workflowLoader.js'
import { registerToolExecutor } from '../../src/main/utils/toolRegistry.js'
import { registerHeuristic } from '../../src/main/utils/heuristicRegistry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const WORKFLOWS_ROOT = path.resolve(__dirname, '../../workflows')

export interface ExecutorCall {
  step: string
  inputs: Record<string, unknown>
  /** Inputs whose key is not declared on the tool. Should always be empty. */
  undeclared: string[]
}

export interface HeuristicCall {
  field: string
  inputs: Record<string, unknown>
}

export interface TestbedSpy {
  /** Tool executor calls, keyed by tool name → list of calls (forEach can yield N). */
  toolCalls: Map<string, ExecutorCall[]>
  /** Heuristic invocations, keyed by heuristic name. */
  heuristicCalls: Map<string, HeuristicCall[]>
  /** Reset between runs. */
  reset(): void
}

/** Canned outputs each fixture tool returns. Tests can override per-test. */
export interface FixtureOutputs {
  dcm2niix?: Record<string, unknown>
  brainchop?: Record<string, unknown>
  'atlas-parcellate'?: Record<string, unknown>
  'bids-fix-sidecars'?: Record<string, unknown>
  'bids-classify'?: Record<string, unknown>
  'bids-validate'?: Record<string, unknown>
  'bids-write'?: Record<string, unknown>
}

const DEFAULT_OUTPUTS: Required<FixtureOutputs> = {
  dcm2niix: {
    volumes: ['/tmp/fixture/sub-01_T1w.nii.gz'],
    sidecars: ['/tmp/fixture/sub-01_T1w.json'],
    outDir: '/tmp/fixture',
    detectedSubjects: [
      {
        rawId: 'SUB001',
        label: '01',
        demographics: { age: '30', sex: 'M' },
        sessions: [{ rawDate: '20260101', label: '', seriesIndices: [0] }]
      }
    ]
  },
  brainchop: {
    output_paths: ['/tmp/fixture/sub-01_T1w_brain.nii.gz']
  },
  'atlas-parcellate': {
    parcellation_paths: ['/tmp/fixture/sub-01_T1w_parcellation.nii.gz'],
    label_json: '/tmp/fixture/labels.json'
  },
  'bids-fix-sidecars': {
    bids_dir: '/tmp/fixture/bids',
    valid: true,
    fixes_applied: 0,
    remaining_errors: 0,
    remaining_warnings: 0
  },
  'bids-classify': {
    mappings: [
      {
        index: 0,
        rawId: 'SUB001',
        subject: '01',
        session: '',
        datatype: 'anat',
        suffix: 'T1w',
        task: '',
        acq: '',
        ce: '',
        rec: '',
        dir: '',
        echo: '',
        run: 0,
        confidence: 'high',
        sourcePath: '/tmp/fixture/sub-01_T1w.json',
        niftiPath: '/tmp/fixture/sub-01_T1w.nii.gz',
        excluded: false
      }
    ],
    subjects: []
  },
  'bids-validate': { valid: true, errors: [], warnings: [] },
  'bids-write': { bids_dir: '/tmp/fixture/bids', files_copied: 1 }
}

/** Build a fixture executor that records every call and returns canned output. */
function makeFixtureExecutor(
  toolName: string,
  toolDef: ToolDefinition,
  spy: TestbedSpy,
  outputs: Record<string, unknown>
): ToolExecutor {
  const declared = new Set(Object.keys(toolDef.inputs ?? {}))
  return async (inputs) => {
    const undeclared = Object.keys(inputs).filter((k) => !declared.has(k))
    const calls = spy.toolCalls.get(toolName) ?? []
    calls.push({ step: toolName, inputs: { ...inputs }, undeclared })
    spy.toolCalls.set(toolName, calls)
    return { ...outputs }
  }
}

/** Build a fixture heuristic that records and returns canned data. */
function makeFixtureHeuristic(
  heuristicName: string,
  spy: TestbedSpy,
  result: unknown
): HeuristicFn {
  return async (inputs, context, _stepOutputs) => {
    const calls = spy.heuristicCalls.get(heuristicName) ?? []
    calls.push({ field: heuristicName, inputs: { ...inputs, ...context } })
    spy.heuristicCalls.set(heuristicName, calls)
    return result
  }
}

/**
 * Load definitions from disk, swap in fixture executors for binary-backed
 * tools and code-registered heuristics, and return a spy. Call once per
 * test file in a `beforeAll`; call `spy.reset()` between tests.
 *
 * Tools whose executors are already pure-TS (bids-classify, bids-validate,
 * bids-write, bids-fix-sidecars) are *also* swapped here — the testbed's
 * goal is to assert wiring, not re-test those modules.
 */
export function setupWorkflowTestbed(overrides?: FixtureOutputs): TestbedSpy {
  loadDefinitionsFromPath(WORKFLOWS_ROOT)

  const spy: TestbedSpy = {
    toolCalls: new Map(),
    heuristicCalls: new Map(),
    reset() {
      this.toolCalls.clear()
      this.heuristicCalls.clear()
    }
  }

  const tools = getToolDefinitions()
  const merged = { ...DEFAULT_OUTPUTS, ...(overrides ?? {}) }

  for (const [toolName, canned] of Object.entries(merged)) {
    const def = tools.get(toolName)
    if (!def) continue // tool not present in this build; skip silently
    registerToolExecutor(
      toolName,
      makeFixtureExecutor(toolName, def, spy, canned as Record<string, unknown>)
    )
  }

  // Heuristics referenced by built-in workflows.
  registerHeuristic(
    'list-dicom-series',
    makeFixtureHeuristic('list-dicom-series', spy, [
      {
        seriesNumber: 1,
        seriesDescription: 'T1w',
        rawId: 'SUB001',
        modality: 'MR',
        instanceCount: 192
      }
    ])
  )
  registerHeuristic(
    'detect-subjects',
    makeFixtureHeuristic('detect-subjects', spy, DEFAULT_OUTPUTS.dcm2niix.detectedSubjects)
  )
  registerHeuristic(
    'bids-classify',
    makeFixtureHeuristic('bids-classify', spy, DEFAULT_OUTPUTS['bids-classify'].mappings)
  )

  return spy
}
