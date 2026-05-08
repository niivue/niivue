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
import {
  getWorkflowDefinitions,
  getToolDefinitions,
  finalizeWorkflow
} from '../../src/main/utils/workflowLoader.js'
import type { WorkflowDefinition } from '../../src/common/workflowTypes.js'

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

describe('selected_series filter reaches dcm2niix', () => {
  // Mirrors the user's saved "Workflow with series" shape: a filter-import
  // dcm2niix step whose series input is bound to context.selected_series.
  // When the user pares the selection down, the executor must be called
  // with only the kept series — not the full list.
  it('only converts the selected subset of dicom_series', async () => {
    const def: WorkflowDefinition = {
      name: 'series-filter-fixture',
      version: '1.0.0',
      description: '',
      inputs: {},
      outputs: {},
      context: {
        fields: {
          dicom_dir: { type: 'dicom-folder', label: 'Dicom Dir' },
          dicom_series: { type: 'dicom-series[]', label: 'DICOM Series' },
          selected_series: { type: 'dicom-series[]', label: 'Selected Series', default: [] }
        }
      },
      steps: {
        filter_import_dicoms_0: {
          tool: 'dcm2niix',
          inputs: {
            bids: { constant: 'y' },
            compress: { constant: 'y' },
            bids_anon: { constant: 'n' },
            series: { ref: 'context.selected_series' },
            dicom_dir: { ref: 'context.dicom_dir' }
          }
        }
      }
    }

    const finalized = finalizeWorkflow(def, getToolDefinitions())
    getWorkflowDefinitions().set(finalized.name, finalized)

    const { startWorkflow, updateContext, runReadySteps } = await import(
      '../../src/main/utils/workflowEngine.js'
    )

    const allSeries = [
      { seriesNumber: 1, seriesDescription: 'T1w', modality: 'MR' },
      { seriesNumber: 2, seriesDescription: 'T2w', modality: 'MR' },
      { seriesNumber: 3, seriesDescription: 'BOLD', modality: 'MR' }
    ]
    const subset = [allSeries[0], allSeries[2]]

    const { runId } = startWorkflow('series-filter-fixture', {})
    updateContext(runId, 'dicom_dir', '/tmp/fixture/source')
    updateContext(runId, 'dicom_series', allSeries)
    updateContext(runId, 'selected_series', subset)

    const executed = await runReadySteps(runId, 0)
    expect(executed, 'filter_import_dicoms_0 should have run').toContain(
      'filter_import_dicoms_0'
    )

    // The testbed replaces dcm2niix's declarative executor (which would
    // iterate via forEach) with a single-call fixture. We can't observe
    // per-iteration calls, but we can verify the resolved `series` input
    // is the subset, not the full list — which is what forEach would
    // iterate over.
    const dcm2niixCalls = spy.toolCalls.get('dcm2niix') ?? []
    expect(dcm2niixCalls.length, 'dcm2niix should have been called').toBeGreaterThan(0)

    const seriesArg = dcm2niixCalls[0].inputs.series as unknown[]
    expect(Array.isArray(seriesArg), '`series` input should be an array').toBe(true)
    expect(seriesArg.length, 'series input length should match the subset').toBe(subset.length)
    expect(seriesArg).toEqual(subset)
  })
})

describe('bids-classify reacts to filter changes', () => {
  const fs = require('node:fs') as typeof import('node:fs')
  const os = require('node:os') as typeof import('node:os')
  const path = require('node:path') as typeof import('node:path')

  function writeFakeSidecar(filePath: string): void {
    const sidecar = {
      SeriesDescription: 'T1w',
      ProtocolName: 'T1w',
      Modality: 'MR',
      PatientID: 'SUB001',
      AcquisitionDateTime: '20260101120000'
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(sidecar))
  }

  // The wizard's bids-classify heuristic preserves context.series_list to keep
  // user edits across section navigation. But when the user changes the DICOM
  // series filter, dcm2niix re-runs and produces a different set of sidecars
  // — the cached mappings now reference paths that no longer exist upstream,
  // and bids-write would write the *old* (broader) mapping set. Detect that
  // staleness via sidecarPath ↔ stepOutputs.sidecars mismatch and reclassify.
  it('reclassifies when cached mappings reference stale sidecar paths', async () => {
    const { bidsClassifyHeuristic } = await import(
      '../../src/main/utils/heuristicRegistry.js'
    )

    // Simulate a prior run that classified all 3 series.
    const stale = [1, 2, 3].map((n) => ({
      index: n - 1,
      sidecarPath: `/tmp/old-run/series-${n}.json`,
      niftiPath: `/tmp/old-run/series-${n}.nii.gz`,
      seriesDescription: `series ${n}`,
      datatype: 'anat',
      suffix: 'T1w',
      task: '',
      acq: '',
      ce: '',
      rec: '',
      dir: '',
      run: 0,
      echo: 0,
      subject: '01',
      session: '',
      confidence: 'high',
      heuristicReason: '',
      excluded: false
    }))

    // The user has now filtered down to a 1-series subset; dcm2niix re-ran
    // into a fresh tempdir, so sidecars are entirely different paths.
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'classify-test-'))
    const newSidecar = path.join(tmpRoot, 'series-2.json')
    writeFakeSidecar(newSidecar)
    const context = { series_list: stale, subjects: undefined } as Record<string, unknown>
    const stepOutputs = {
      filter_import_dicoms_0: {
        sidecars: [newSidecar]
      }
    }

    const result = (await bidsClassifyHeuristic({}, context, stepOutputs)) as Array<{
      sidecarPath: string
    }>

    expect(result.length, 'should reclassify down to subset').toBe(1)
    expect(result[0].sidecarPath).toBe(newSidecar)
    expect(context.subjects, 'subjects cache must be cleared so detect-subjects rebuilds').toBeUndefined()
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  })

  it('preserves cached mappings when sidecar paths still match', async () => {
    const { bidsClassifyHeuristic } = await import(
      '../../src/main/utils/heuristicRegistry.js'
    )
    const cached = [
      {
        index: 0,
        sidecarPath: '/tmp/run/series-1.json',
        niftiPath: '/tmp/run/series-1.nii.gz',
        seriesDescription: 'series 1',
        datatype: 'anat',
        suffix: 'T1w',
        task: '',
        acq: '',
        ce: '',
        rec: '',
        dir: '',
        run: 0,
        echo: 0,
        subject: '01',
        session: '',
        confidence: 'high',
        heuristicReason: '',
        excluded: false
      }
    ]
    const context = { series_list: cached } as Record<string, unknown>
    const stepOutputs = {
      filter_import_dicoms_0: { sidecars: ['/tmp/run/series-1.json'] }
    }

    const result = (await bidsClassifyHeuristic({}, context, stepOutputs)) as Array<{
      sidecarPath: string
    }>
    expect(result).toBe(cached) // identity preserved
  })
})

describe('repairOutputDirSelfRefs', () => {
  it('drops a step input bound to a previous step\'s outDir when the tool declares that input as its working directory', () => {
    // Two-dcm2niix workflow shape that the designer produced before
    // blockToStepDraft learned to skip auto-wiring the working-dir input.
    // The second step's `out_dir` is bound to the first step's `outDir`,
    // which makes both steps share one tempdir and accumulate files
    // across re-runs (every filter toggle invalidates the step).
    const broken: WorkflowDefinition = {
      name: 'test-shared-tempdir',
      version: '1.0.0',
      description: '',
      inputs: {},
      outputs: {},
      context: { fields: {} },
      steps: {
        step_a: {
          tool: 'dcm2niix',
          inputs: { dicom_dir: { ref: 'context.dicom_dir' } }
        },
        step_b: {
          tool: 'dcm2niix',
          inputs: {
            dicom_dir: { ref: 'context.dicom_dir' },
            out_dir: { ref: 'steps.step_a.outputs.outDir' }
          }
        }
      }
    }

    const repaired = finalizeWorkflow(broken, getToolDefinitions())
    expect(repaired.steps.step_b.inputs.out_dir).toBeUndefined()
    // Sanity: a non-self-ref binding is preserved.
    expect(repaired.steps.step_b.inputs.dicom_dir).toEqual({ ref: 'context.dicom_dir' })
  })
})
