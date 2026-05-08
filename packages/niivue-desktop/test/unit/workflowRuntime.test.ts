// ── Workflow runtime testbed ─────────────────────────────────────────
//
// Loads the live workflow/tool registries from disk and runs each
// built-in workflow end-to-end through `runWorkflowHeadless`, with
// native-binary tools and code-registered heuristics replaced by
// fixture stand-ins. Asserts that:
//
//   1. Every built-in workflow loads (repair passes terminate cleanly)
//   2. Running `dicom-to-bids` headlessly drives every step's executor
//      with no undeclared inputs (i.e. wiring matches the tool schema)
//   3. The same run produces a non-empty `bids_dir` in final context
//      (proves outputMappings + ref resolution work)

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: () => '/tmp/niivue-testbed' }
}))

import { setupWorkflowTestbed, type TestbedSpy } from '../helpers/workflowTestbed.js'
import { runWorkflowHeadless } from '../../src/main/utils/headlessWorkflowRunner.js'
import { getWorkflowDefinitions } from '../../src/main/utils/workflowLoader.js'

let spy: TestbedSpy

beforeAll(() => {
  spy = setupWorkflowTestbed()
})

beforeEach(() => {
  spy.reset()
})

describe('workflow load smoke', () => {
  it('loads every built-in workflow without throwing', () => {
    const defs = getWorkflowDefinitions()
    expect(defs.size).toBeGreaterThan(0)
    for (const [name, def] of defs) {
      expect(def.name, `definition.name mismatch for ${name}`).toBe(name)
      expect(def.steps, `${name} has no steps`).toBeTruthy()
    }
  })

  it('every step in every workflow references a known tool', async () => {
    const { getToolDefinitions } = await import('../../src/main/utils/workflowLoader.js')
    const tools = getToolDefinitions()
    for (const [wfName, def] of getWorkflowDefinitions()) {
      for (const [stepName, step] of Object.entries(def.steps)) {
        expect(
          tools.has(step.tool),
          `${wfName}/${stepName} → unknown tool '${step.tool}'`
        ).toBe(true)
      }
    }
  })

  it('every step\'s tool has an executor (declarative or code-registered)', async () => {
    const { getToolDefinitions } = await import('../../src/main/utils/workflowLoader.js')
    const { listRegisteredToolExecutors } = await import('../../src/main/utils/toolRegistry.js')
    const tools = getToolDefinitions()
    const executors = new Set(listRegisteredToolExecutors())
    for (const [wfName, def] of getWorkflowDefinitions()) {
      for (const [stepName, step] of Object.entries(def.steps)) {
        const tool = tools.get(step.tool)
        if (!tool) continue
        const hasExec = !!tool.exec || executors.has(tool.name)
        expect(
          hasExec,
          `${wfName}/${stepName}: tool '${tool.name}' has no executor — workflow will fail at runtime with "No executor for tool: ${tool.name}"`
        ).toBe(true)
      }
    }
  })
})

describe('dicom-to-bids runtime wiring', () => {
  it('drives every step with no undeclared inputs and produces bids_dir', async () => {
    const { context, outputs } = await runWorkflowHeadless({
      workflowName: 'dicom-to-bids',
      inputs: { dicom_dir: '/tmp/fixture/source' },
      contextOverrides: {
        output_dir: '/tmp/fixture/bids-out',
        selected_series: [{ seriesNumber: 1 }]
      }
    })

    // Every tool the engine called must have received only declared inputs.
    for (const [toolName, calls] of spy.toolCalls) {
      for (const call of calls) {
        expect(
          call.undeclared,
          `${toolName} got undeclared inputs: ${call.undeclared.join(', ')}`
        ).toEqual([])
      }
    }

    // The convert step must have run at least once (forEach over selected_series).
    expect(spy.toolCalls.has('dcm2niix'), 'dcm2niix never executed').toBe(true)

    // Write step propagates bids_dir into context via outputMappings.
    const writeRan = (spy.toolCalls.get('bids-write') ?? []).length > 0
    expect(writeRan, 'bids-write was never executed').toBe(true)
    expect(context.bids_dir, 'context.bids_dir was not populated').toBeTruthy()
    expect(outputs.bids_dir, 'workflow outputs.bids_dir missing').toBeTruthy()
  })

  it('passes a resolved series mapping into bids-write (not a stale ref)', async () => {
    await runWorkflowHeadless({
      workflowName: 'dicom-to-bids',
      inputs: { dicom_dir: '/tmp/fixture/source' },
      contextOverrides: {
        output_dir: '/tmp/fixture/bids-out',
        selected_series: [{ seriesNumber: 1 }]
      }
    })

    const writeCalls = spy.toolCalls.get('bids-write') ?? []
    expect(writeCalls.length, 'bids-write was never called').toBeGreaterThan(0)
    const lastCall = writeCalls[writeCalls.length - 1]
    expect(Array.isArray(lastCall.inputs.mappings), 'mappings was not an array').toBe(true)
    // config is a `ref: context` proxy; the resolver inlines the whole context.
    expect(typeof lastCall.inputs.config).toBe('object')
  })
})
