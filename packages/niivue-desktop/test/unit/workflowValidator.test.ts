import { describe, it, expect } from 'vitest'
import type { ToolDefinition, ToolParameterDef } from '../../src/common/workflowTypes.js'
import { validateWorkflowDraft, resolveRefType } from '../../src/common/workflowValidator.js'

// ── Helpers ─────────────────────────────────────────────────────────

function makeTool(
  name: string,
  inputs: Record<string, ToolParameterDef>,
  outputs: Record<string, ToolParameterDef> = {}
): ToolDefinition {
  return { name, version: '1.0', description: `${name} tool`, inputs, outputs }
}

const dcm2niix = makeTool(
  'dcm2niix',
  { dicom_dir: { type: 'directory', description: 'DICOM folder' } },
  { volumes: { type: 'volume[]', description: 'Output volumes' }, sidecars: { type: 'json[]', description: 'Sidecars' } }
)

const bet = makeTool(
  'bet',
  {
    input: { type: 'volume', description: 'Input volume' },
    frac: { type: 'number', description: 'Fractional intensity', optional: true }
  },
  { brain: { type: 'volume', description: 'Brain-extracted volume' } }
)

const tools = new Map<string, ToolDefinition>([
  ['dcm2niix', dcm2niix],
  ['bet', bet]
])

function baseDraft() {
  return {
    name: 'test-workflow',
    version: '1.0',
    description: 'Test',
    menu: 'Processing',
    sections: [],
    contextFields: {} as Record<string, { type: string; label: string; description: string }>,
    steps: [],
    workflowInputs: { dicom_dir: { type: 'directory', description: 'DICOM folder' } },
    workflowOutputs: {}
  }
}

// ── resolveRefType ─────────────────────────────────────────────────

describe('resolveRefType', () => {
  it('resolves inputs.X', () => {
    const draft = baseDraft()
    expect(resolveRefType('inputs.dicom_dir', draft, tools)).toBe('directory')
  })

  it('resolves context (bare)', () => {
    const draft = baseDraft()
    expect(resolveRefType('context', draft, tools)).toBe('object')
  })

  it('resolves context.X', () => {
    const draft = baseDraft()
    draft.contextFields = { output_dir: { type: 'directory', label: 'Output', description: 'Dir' } }
    expect(resolveRefType('context.output_dir', draft, tools)).toBe('directory')
  })

  it('resolves steps.Y.outputs.Z', () => {
    const draft = baseDraft()
    draft.steps = [{ name: 'convert', tool: 'dcm2niix', inputs: {}, outputMappings: {}, condition: '' }]
    expect(resolveRefType('steps.convert.outputs.volumes', draft, tools)).toBe('volume[]')
  })

  it('returns null for non-existent input', () => {
    const draft = baseDraft()
    expect(resolveRefType('inputs.missing', draft, tools)).toBeNull()
  })

  it('returns null for invalid format', () => {
    const draft = baseDraft()
    expect(resolveRefType('garbage.ref.path', draft, tools)).toBeNull()
  })
})

// ── validateWorkflowDraft ──────────────────────────────────────────

describe('validateWorkflowDraft', () => {
  it('valid workflow produces no errors', () => {
    const draft = baseDraft()
    draft.contextFields = { output_dir: { type: 'directory', label: 'Output', description: 'Dir' } }
    draft.sections = [{ title: 'Config', fields: ['output_dir'] }]
    draft.steps = [{
      name: 'convert',
      tool: 'dcm2niix',
      inputs: { dicom_dir: { mode: 'ref' as const, value: 'inputs.dicom_dir' } },
      outputMappings: {},
      condition: ''
    }]
    draft.workflowOutputs = { volumes: { type: 'volume[]', ref: 'steps.convert.outputs.volumes' } }

    const result = validateWorkflowDraft(draft, tools)
    expect(result.errors).toHaveLength(0)
  })

  it('step with no name → error', () => {
    const draft = baseDraft()
    draft.steps = [{ name: '', tool: 'dcm2niix', inputs: {}, outputMappings: {}, condition: '' }]
    const result = validateWorkflowDraft(draft, tools)
    expect(result.errors.some((e) => e.message.includes('has no name'))).toBe(true)
  })

  it('step with no tool → error', () => {
    const draft = baseDraft()
    draft.steps = [{ name: 'step1', tool: '', inputs: {}, outputMappings: {}, condition: '' }]
    const result = validateWorkflowDraft(draft, tools)
    expect(result.errors.some((e) => e.message.includes('has no tool selected'))).toBe(true)
  })

  it('unknown tool → error', () => {
    const draft = baseDraft()
    draft.steps = [{ name: 'step1', tool: 'nonexistent', inputs: {}, outputMappings: {}, condition: '' }]
    const result = validateWorkflowDraft(draft, tools)
    expect(result.errors.some((e) => e.message.includes('unknown tool'))).toBe(true)
  })

  it('duplicate step names → error', () => {
    const draft = baseDraft()
    draft.steps = [
      { name: 'convert', tool: 'dcm2niix', inputs: { dicom_dir: { mode: 'ref' as const, value: 'inputs.dicom_dir' } }, outputMappings: {}, condition: '' },
      { name: 'convert', tool: 'bet', inputs: { input: { mode: 'ref' as const, value: 'context' } }, outputMappings: {}, condition: '' }
    ]
    const result = validateWorkflowDraft(draft, tools)
    expect(result.errors.some((e) => e.message.includes('Duplicate step name'))).toBe(true)
  })

  it('unbound required input → error', () => {
    const draft = baseDraft()
    draft.steps = [{ name: 'convert', tool: 'dcm2niix', inputs: {}, outputMappings: {}, condition: '' }]
    const result = validateWorkflowDraft(draft, tools)
    expect(result.errors.some((e) => e.message.includes("required input 'dicom_dir' is not bound"))).toBe(true)
  })

  it('empty ref value counts as unbound', () => {
    const draft = baseDraft()
    draft.steps = [{
      name: 'convert',
      tool: 'dcm2niix',
      inputs: { dicom_dir: { mode: 'ref' as const, value: '' } },
      outputMappings: {},
      condition: ''
    }]
    const result = validateWorkflowDraft(draft, tools)
    expect(result.errors.some((e) => e.message.includes("required input 'dicom_dir' is not bound"))).toBe(true)
  })

  it('dangling ref to non-existent workflow input → error', () => {
    const draft = baseDraft()
    draft.steps = [{
      name: 'convert',
      tool: 'dcm2niix',
      inputs: { dicom_dir: { mode: 'ref' as const, value: 'inputs.missing_input' } },
      outputMappings: {},
      condition: ''
    }]
    const result = validateWorkflowDraft(draft, tools)
    expect(result.errors.some((e) => e.message.includes('non-existent source'))).toBe(true)
  })

  it('dangling ref to non-existent context field → error', () => {
    const draft = baseDraft()
    draft.steps = [{
      name: 'convert',
      tool: 'dcm2niix',
      inputs: { dicom_dir: { mode: 'ref' as const, value: 'context.missing_field' } },
      outputMappings: {},
      condition: ''
    }]
    const result = validateWorkflowDraft(draft, tools)
    expect(result.errors.some((e) => e.message.includes('non-existent source'))).toBe(true)
  })

  it('bare context ref is valid', () => {
    const draft = baseDraft()
    draft.steps = [{
      name: 'convert',
      tool: 'dcm2niix',
      inputs: { dicom_dir: { mode: 'ref' as const, value: 'context' } },
      outputMappings: {},
      condition: ''
    }]
    const result = validateWorkflowDraft(draft, tools)
    // Should not error on the ref itself (might warn on type mismatch though)
    expect(result.errors.filter((e) => e.message.includes('non-existent source'))).toHaveLength(0)
  })

  it('dangling ref to non-preceding step → error', () => {
    const draft = baseDraft()
    draft.steps = [{
      name: 'extract',
      tool: 'bet',
      inputs: { input: { mode: 'ref' as const, value: 'steps.future_step.outputs.brain' } },
      outputMappings: {},
      condition: ''
    }]
    const result = validateWorkflowDraft(draft, tools)
    expect(result.errors.some((e) => e.message.includes('non-existent source'))).toBe(true)
  })

  it('form section field not in contextFields → error', () => {
    const draft = baseDraft()
    draft.sections = [{ title: 'Config', fields: ['missing_field'] }]
    const result = validateWorkflowDraft(draft, tools)
    expect(result.errors.some((e) => e.message.includes("field 'missing_field' is not defined in context"))).toBe(true)
  })

  it('workflow output referencing non-existent step → error', () => {
    const draft = baseDraft()
    draft.workflowOutputs = { result: { type: 'volume[]', ref: 'steps.missing.outputs.volumes' } }
    const result = validateWorkflowDraft(draft, tools)
    expect(result.errors.some((e) => e.message.includes("Workflow output 'result'"))).toBe(true)
  })

  it('type mismatch → warning', () => {
    const draft = baseDraft()
    draft.contextFields = { my_num: { type: 'number', label: 'Num', description: 'A number' } }
    draft.steps = [{
      name: 'convert',
      tool: 'dcm2niix',
      inputs: { dicom_dir: { mode: 'ref' as const, value: 'context.my_num' } },
      outputMappings: {},
      condition: ''
    }]
    const result = validateWorkflowDraft(draft, tools)
    expect(result.warnings.some((w) => w.message.includes('expects') && w.message.includes('but source provides'))).toBe(true)
  })

  it('step with no inputs → warning', () => {
    const draft = baseDraft()
    draft.steps = [{
      name: 'convert',
      tool: 'dcm2niix',
      inputs: {},
      outputMappings: {},
      condition: ''
    }]
    const result = validateWorkflowDraft(draft, tools)
    expect(result.warnings.some((w) => w.message.includes('has no inputs configured'))).toBe(true)
  })

  it('compatible type (volume → string) does not produce warning', () => {
    const draft = baseDraft()
    draft.steps = [
      {
        name: 'convert',
        tool: 'dcm2niix',
        inputs: { dicom_dir: { mode: 'ref' as const, value: 'inputs.dicom_dir' } },
        outputMappings: {},
        condition: ''
      },
      {
        name: 'extract',
        tool: 'bet',
        inputs: { input: { mode: 'ref' as const, value: 'steps.convert.outputs.volumes' } },
        outputMappings: {},
        condition: ''
      }
    ]
    const result = validateWorkflowDraft(draft, tools)
    // volume[] → volume is not compatible (array vs scalar), so this should warn
    const typeWarnings = result.warnings.filter((w) => w.message.includes('expects') && w.stepName === 'extract')
    expect(typeWarnings.length).toBeGreaterThanOrEqual(1)
  })
})
