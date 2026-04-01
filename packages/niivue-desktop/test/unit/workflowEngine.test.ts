import { describe, it, expect, beforeEach, vi } from 'vitest'
import type {
  WorkflowDefinition,
  WorkflowRunState,
  Binding,
  StepDef
} from '../../src/common/workflowTypes.js'

// ── Mocks ────────────────────────────────────────────────────────────

const mockDefinitions = new Map<string, WorkflowDefinition>()

vi.mock('../../src/main/utils/workflowLoader.js', () => ({
  getWorkflowDefinitions: () => mockDefinitions
}))

vi.mock('../../src/main/utils/toolRegistry.js', () => ({
  getToolExecutor: vi.fn()
}))

vi.mock('../../src/main/utils/heuristicRegistry.js', () => ({
  getHeuristic: vi.fn()
}))

// ── Imports (must come after vi.mock) ────────────────────────────────

import {
  computeInputHash,
  getCachedOutput,
  setCachedOutput,
  invalidateDownstream,
  clearRunCache
} from '../../src/main/utils/workflowCache.js'

import {
  startWorkflow,
  getAutoRunnableSteps,
  resolveBinding,
  cancelRun
} from '../../src/main/utils/workflowEngine.js'

// ── Test fixture definitions ─────────────────────────────────────────

function makeTestWorkflow(overrides?: Partial<WorkflowDefinition>): WorkflowDefinition {
  return {
    name: 'test-workflow',
    version: '1.0.0',
    description: 'A test workflow',
    menu: 'Processing',
    inputs: {
      dicom_dir: { type: 'string', description: 'DICOM directory' },
      output_dir: { type: 'string', description: 'Output directory' }
    },
    context: {
      description: 'Test context',
      fields: {
        subject_id: {
          type: 'string',
          description: 'Subject ID',
          default: 'sub-001'
        },
        do_skull_strip: {
          type: 'boolean',
          description: 'Enable skull stripping',
          default: true
        },
        threshold: {
          type: 'number',
          description: 'Threshold value'
          // no default
        }
      }
    },
    form: {
      sections: [
        {
          title: 'Settings',
          fields: ['subject_id', 'do_skull_strip', 'threshold']
        }
      ]
    },
    steps: {
      convert: {
        tool: 'dcm2niix',
        inputs: {
          dicom_dir: { ref: 'inputs.dicom_dir' },
          output_dir: { ref: 'inputs.output_dir' }
        }
      },
      skull_strip: {
        tool: 'bet',
        inputs: {
          input_file: { ref: 'steps.convert.outputs.nifti_file' },
          threshold: { ref: 'context.threshold' }
        },
        condition: 'context.do_skull_strip'
      },
      normalize: {
        tool: 'normalize',
        inputs: {
          input_file: { ref: 'steps.skull_strip.outputs.stripped_file' },
          subject_id: { ref: 'context.subject_id' }
        }
      }
    },
    outputs: {
      result: { type: 'string', ref: 'steps.normalize.outputs.output_file' }
    },
    ...overrides
  }
}

function makeRunState(overrides?: Partial<WorkflowRunState>): WorkflowRunState {
  return {
    workflowName: 'test-workflow',
    inputs: {
      dicom_dir: '/data/dicom',
      output_dir: '/data/output'
    },
    context: {
      subject_id: 'sub-001',
      do_skull_strip: true,
      threshold: 0.5
    },
    stepOutputs: {},
    status: 'paused-for-form',
    ...overrides
  }
}

// ══════════════════════════════════════════════════════════════════════
// workflowCache tests
// ══════════════════════════════════════════════════════════════════════

describe('workflowCache', () => {
  beforeEach(() => {
    clearRunCache('test-run')
    clearRunCache('run-A')
    clearRunCache('run-B')
  })

  describe('computeInputHash', () => {
    const mockResolve: (b: Binding, s: WorkflowRunState) => unknown = (binding, state) => {
      if ('constant' in binding) return binding.constant
      return resolveBinding(binding, state)
    }

    it('produces a deterministic hash for the same inputs', () => {
      const step: StepDef = {
        tool: 'dcm2niix',
        inputs: {
          dicom_dir: { ref: 'inputs.dicom_dir' },
          output_dir: { constant: '/tmp/out' }
        }
      }
      const state = makeRunState()

      const hash1 = computeInputHash(step, state, mockResolve)
      const hash2 = computeInputHash(step, state, mockResolve)
      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex
    })

    it('produces a different hash when inputs differ', () => {
      const step: StepDef = {
        tool: 'dcm2niix',
        inputs: { dicom_dir: { ref: 'inputs.dicom_dir' } }
      }

      const state1 = makeRunState({ inputs: { dicom_dir: '/path/A' } })
      const state2 = makeRunState({ inputs: { dicom_dir: '/path/B' } })

      const hash1 = computeInputHash(step, state1, mockResolve)
      const hash2 = computeInputHash(step, state2, mockResolve)
      expect(hash1).not.toBe(hash2)
    })

    it('truncates large strings before hashing', () => {
      const longString = 'x'.repeat(20000)
      const step: StepDef = {
        tool: 'tool',
        inputs: { data: { constant: longString } }
      }
      const state = makeRunState()

      // Should not throw and should produce a valid hash
      const hash = computeInputHash(step, state, mockResolve)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('handles ArrayBuffer values via truncation path', () => {
      const resolver = (_b: Binding, _s: WorkflowRunState): unknown => {
        return new ArrayBuffer(16)
      }
      const step: StepDef = {
        tool: 'tool',
        inputs: { buf: { constant: null } }
      }
      const state = makeRunState()

      const hash = computeInputHash(step, state, resolver)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('getCachedOutput / setCachedOutput', () => {
    it('returns null when cache is empty', () => {
      const result = getCachedOutput('test-run', 'step1', 'hash-abc')
      expect(result).toBeNull()
    })

    it('round-trips cached outputs', () => {
      const outputs = { nifti_file: '/tmp/out.nii.gz', count: 42 }
      setCachedOutput('test-run', 'step1', 'hash-abc', outputs)

      const result = getCachedOutput('test-run', 'step1', 'hash-abc')
      expect(result).toEqual(outputs)
    })

    it('returns null when input hash does not match', () => {
      setCachedOutput('test-run', 'step1', 'hash-abc', { out: 1 })
      const result = getCachedOutput('test-run', 'step1', 'hash-different')
      expect(result).toBeNull()
    })

    it('isolates caches by runId', () => {
      setCachedOutput('run-A', 'step1', 'hash-abc', { a: 1 })
      setCachedOutput('run-B', 'step1', 'hash-abc', { b: 2 })

      expect(getCachedOutput('run-A', 'step1', 'hash-abc')).toEqual({ a: 1 })
      expect(getCachedOutput('run-B', 'step1', 'hash-abc')).toEqual({ b: 2 })
    })

    it('overwrites previous cache entry for the same step', () => {
      setCachedOutput('test-run', 'step1', 'hash-old', { v: 1 })
      setCachedOutput('test-run', 'step1', 'hash-new', { v: 2 })

      expect(getCachedOutput('test-run', 'step1', 'hash-old')).toBeNull()
      expect(getCachedOutput('test-run', 'step1', 'hash-new')).toEqual({ v: 2 })
    })
  })

  describe('invalidateDownstream', () => {
    it('invalidates steps that depend on the changed step', () => {
      const definition = makeTestWorkflow()
      const state = makeRunState({
        stepOutputs: {
          convert: { nifti_file: '/tmp/out.nii.gz' },
          skull_strip: { stripped_file: '/tmp/stripped.nii.gz' },
          normalize: { output_file: '/tmp/norm.nii.gz' }
        }
      })

      // Populate cache entries
      setCachedOutput('test-run', 'convert', 'h1', { nifti_file: '/tmp/out.nii.gz' })
      setCachedOutput('test-run', 'skull_strip', 'h2', { stripped_file: '/tmp/stripped.nii.gz' })
      setCachedOutput('test-run', 'normalize', 'h3', { output_file: '/tmp/norm.nii.gz' })

      const invalidated = invalidateDownstream('test-run', 'convert', definition, state)

      // skull_strip depends on convert, normalize depends on skull_strip
      expect(invalidated).toContain('skull_strip')
      expect(invalidated).toContain('normalize')

      // Their cache entries and stepOutputs should be gone
      expect(getCachedOutput('test-run', 'skull_strip', 'h2')).toBeNull()
      expect(getCachedOutput('test-run', 'normalize', 'h3')).toBeNull()
      expect(state.stepOutputs['skull_strip']).toBeUndefined()
      expect(state.stepOutputs['normalize']).toBeUndefined()

      // The changed step itself is also removed
      expect(getCachedOutput('test-run', 'convert', 'h1')).toBeNull()
      expect(state.stepOutputs['convert']).toBeUndefined()
    })

    it('does not invalidate independent steps', () => {
      const definition = makeTestWorkflow({
        steps: {
          step_a: {
            tool: 'tool_a',
            inputs: { x: { ref: 'inputs.dicom_dir' } }
          },
          step_b: {
            tool: 'tool_b',
            inputs: { y: { ref: 'inputs.output_dir' } }
          },
          step_c: {
            tool: 'tool_c',
            inputs: { z: { ref: 'steps.step_a.outputs.out' } }
          }
        }
      })
      const state = makeRunState({
        stepOutputs: {
          step_a: { out: 'a' },
          step_b: { out: 'b' },
          step_c: { out: 'c' }
        }
      })

      setCachedOutput('test-run', 'step_a', 'h1', { out: 'a' })
      setCachedOutput('test-run', 'step_b', 'h2', { out: 'b' })
      setCachedOutput('test-run', 'step_c', 'h3', { out: 'c' })

      const invalidated = invalidateDownstream('test-run', 'step_a', definition, state)

      // step_c depends on step_a, step_b is independent
      expect(invalidated).toContain('step_c')
      expect(invalidated).not.toContain('step_b')
      expect(getCachedOutput('test-run', 'step_b', 'h2')).toEqual({ out: 'b' })
      expect(state.stepOutputs['step_b']).toEqual({ out: 'b' })
    })

    it('returns empty array when no downstream steps exist', () => {
      const definition = makeTestWorkflow()
      const state = makeRunState({
        stepOutputs: {
          normalize: { output_file: '/tmp/norm.nii.gz' }
        }
      })

      const invalidated = invalidateDownstream('test-run', 'normalize', definition, state)
      expect(invalidated).toEqual([])
    })
  })

  describe('clearRunCache', () => {
    it('removes all cache entries for a run', () => {
      setCachedOutput('test-run', 'step1', 'h1', { a: 1 })
      setCachedOutput('test-run', 'step2', 'h2', { b: 2 })

      clearRunCache('test-run')

      expect(getCachedOutput('test-run', 'step1', 'h1')).toBeNull()
      expect(getCachedOutput('test-run', 'step2', 'h2')).toBeNull()
    })

    it('does not affect other runs', () => {
      setCachedOutput('run-A', 'step1', 'h1', { a: 1 })
      setCachedOutput('run-B', 'step1', 'h1', { b: 2 })

      clearRunCache('run-A')

      expect(getCachedOutput('run-A', 'step1', 'h1')).toBeNull()
      expect(getCachedOutput('run-B', 'step1', 'h1')).toEqual({ b: 2 })
    })

    it('is safe to call on a non-existent run', () => {
      expect(() => clearRunCache('nonexistent')).not.toThrow()
    })
  })
})

// ══════════════════════════════════════════════════════════════════════
// workflowEngine tests
// ══════════════════════════════════════════════════════════════════════

describe('workflowEngine', () => {
  beforeEach(() => {
    mockDefinitions.clear()
  })

  describe('resolveBinding', () => {
    const state = makeRunState({
      stepOutputs: {
        convert: { nifti_file: '/tmp/out.nii.gz' }
      }
    })

    it('resolves constant bindings', () => {
      expect(resolveBinding({ constant: 42 }, state)).toBe(42)
      expect(resolveBinding({ constant: 'hello' }, state)).toBe('hello')
      expect(resolveBinding({ constant: null }, state)).toBeNull()
      expect(resolveBinding({ constant: false }, state)).toBe(false)
    })

    it('resolves inputs.* bindings', () => {
      expect(resolveBinding({ ref: 'inputs.dicom_dir' }, state)).toBe('/data/dicom')
      expect(resolveBinding({ ref: 'inputs.output_dir' }, state)).toBe('/data/output')
    })

    it('returns undefined for missing input keys', () => {
      expect(resolveBinding({ ref: 'inputs.nonexistent' }, state)).toBeUndefined()
    })

    it('resolves context.* bindings', () => {
      expect(resolveBinding({ ref: 'context.subject_id' }, state)).toBe('sub-001')
      expect(resolveBinding({ ref: 'context.threshold' }, state)).toBe(0.5)
    })

    it('resolves context ref without subfield to full context object', () => {
      const result = resolveBinding({ ref: 'context' }, state)
      expect(result).toEqual(state.context)
      // Should be a copy, not the same reference
      expect(result).not.toBe(state.context)
    })

    it('resolves steps.*.outputs.* bindings', () => {
      expect(resolveBinding({ ref: 'steps.convert.outputs.nifti_file' }, state)).toBe(
        '/tmp/out.nii.gz'
      )
    })

    it('returns undefined for missing step output', () => {
      expect(resolveBinding({ ref: 'steps.missing.outputs.x' }, state)).toBeUndefined()
    })

    it('throws on invalid inputs ref (missing name)', () => {
      expect(() => resolveBinding({ ref: 'inputs' }, state)).toThrow('missing input name')
    })

    it('throws on invalid steps ref (too few parts)', () => {
      expect(() => resolveBinding({ ref: 'steps.convert' }, state)).toThrow(
        'expected steps.<name>.outputs.<key>'
      )
    })

    it('throws on unrecognized ref prefix', () => {
      expect(() => resolveBinding({ ref: 'unknown.field' }, state)).toThrow(
        'Cannot resolve binding ref'
      )
    })
  })

  describe('getAutoRunnableSteps', () => {
    it('returns steps whose inputs reference only inputs.* or constants', () => {
      const def = makeTestWorkflow()
      const result = getAutoRunnableSteps(def)

      // convert depends only on inputs.*, so it is auto-runnable
      expect(result).toContain('convert')
      // skull_strip depends on steps.convert and context.threshold
      // It depends on context, so NOT auto-runnable
      expect(result).not.toContain('skull_strip')
      // normalize depends on steps.skull_strip
      expect(result).not.toContain('normalize')
    })

    it('includes chained steps if all dependencies are also auto-runnable', () => {
      const def = makeTestWorkflow({
        steps: {
          step_a: {
            tool: 'tool_a',
            inputs: { x: { ref: 'inputs.dicom_dir' } }
          },
          step_b: {
            tool: 'tool_b',
            inputs: { y: { ref: 'steps.step_a.outputs.out' } }
          },
          step_c: {
            tool: 'tool_c',
            inputs: { z: { ref: 'context.subject_id' } }
          }
        }
      })

      const result = getAutoRunnableSteps(def)
      // step_a: inputs only -> auto
      // step_b: depends on step_a (auto) -> auto
      // step_c: depends on context -> NOT auto
      expect(result).toEqual(['step_a', 'step_b'])
    })

    it('returns empty array when all steps depend on context', () => {
      const def = makeTestWorkflow({
        steps: {
          only_step: {
            tool: 'tool',
            inputs: { x: { ref: 'context.subject_id' } }
          }
        }
      })

      expect(getAutoRunnableSteps(def)).toEqual([])
    })

    it('handles steps with only constant inputs', () => {
      const def = makeTestWorkflow({
        steps: {
          const_step: {
            tool: 'tool',
            inputs: { x: { constant: 'hello' }, y: { constant: 42 } }
          }
        }
      })

      expect(getAutoRunnableSteps(def)).toEqual(['const_step'])
    })

    it('handles a workflow with no steps', () => {
      const def = makeTestWorkflow({ steps: {} })
      expect(getAutoRunnableSteps(def)).toEqual([])
    })
  })

  describe('startWorkflow', () => {
    it('initializes run state with context defaults and paused-for-form status', () => {
      const def = makeTestWorkflow()
      mockDefinitions.set('test-workflow', def)

      const { runId, runState, definition } = startWorkflow('test-workflow', {
        dicom_dir: '/data/dicom'
      })

      expect(runId).toBeTruthy()
      expect(typeof runId).toBe('string')
      expect(runState.workflowName).toBe('test-workflow')
      expect(runState.inputs).toEqual({ dicom_dir: '/data/dicom' })
      expect(runState.status).toBe('paused-for-form')
      expect(runState.stepOutputs).toEqual({})

      // Context should have defaults populated
      expect(runState.context.subject_id).toBe('sub-001')
      expect(runState.context.do_skull_strip).toBe(true)
      // threshold has no default, should be absent
      expect(runState.context.threshold).toBeUndefined()

      expect(definition).toBe(def)
    })

    it('throws for an unknown workflow name', () => {
      expect(() => startWorkflow('nonexistent', {})).toThrow('Unknown workflow: nonexistent')
    })

    it('works when context has no fields defined', () => {
      const def = makeTestWorkflow({ context: undefined })
      mockDefinitions.set('no-context', def)

      const { runState } = startWorkflow('no-context', {})
      expect(runState.context).toEqual({})
    })

    it('generates unique run IDs', () => {
      const def = makeTestWorkflow()
      mockDefinitions.set('test-workflow', def)

      const ids = new Set<string>()
      for (let i = 0; i < 10; i++) {
        const { runId } = startWorkflow('test-workflow', {})
        ids.add(runId)
      }
      expect(ids.size).toBe(10)
    })
  })

  describe('cancelRun', () => {
    it('removes the run state and cache without throwing', () => {
      const def = makeTestWorkflow()
      mockDefinitions.set('test-workflow', def)

      const { runId } = startWorkflow('test-workflow', { dicom_dir: '/data' })

      // Populate some cache
      setCachedOutput(runId, 'convert', 'hash1', { out: 'test' })

      cancelRun(runId)

      // Cache should be cleared
      expect(getCachedOutput(runId, 'convert', 'hash1')).toBeNull()
    })

    it('is safe to call on a non-existent run', () => {
      expect(() => cancelRun('nonexistent-run-id')).not.toThrow()
    })
  })
})
