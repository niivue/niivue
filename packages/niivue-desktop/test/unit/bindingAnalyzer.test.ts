import { describe, it, expect } from 'vitest'
import type { ToolDefinition, ToolParameterDef, WorkflowDefinition } from '../../src/common/workflowTypes.js'
import {
  getUnboundInputs,
  generateContextFieldFromParam,
  generateFormSections,
  inferFormSections
} from '../../src/common/bindingAnalyzer.js'

// ── Fixtures ────────────────────────────────────────────────────────

function makeTool(inputs: Record<string, ToolParameterDef>, name = 'TestTool'): ToolDefinition {
  return {
    name,
    version: '1.0.0',
    description: `${name} description`,
    inputs,
    outputs: {}
  }
}

// ── getUnboundInputs ────────────────────────────────────────────────

describe('getUnboundInputs', () => {
  it('returns required inputs that have no binding', () => {
    const tool = makeTool({
      input_file: { type: 'string', description: 'Input file' },
      output_dir: { type: 'string', description: 'Output directory' }
    })
    const result = getUnboundInputs({}, tool)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.name)).toEqual(['input_file', 'output_dir'])
  })

  it('skips optional inputs', () => {
    const tool = makeTool({
      input_file: { type: 'string', description: 'Required input' },
      verbose: { type: 'boolean', description: 'Optional flag', optional: true }
    })
    const result = getUnboundInputs({}, tool)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('input_file')
  })

  it('skips inputs that are already bound', () => {
    const tool = makeTool({
      input_file: { type: 'string', description: 'Input file' },
      output_dir: { type: 'string', description: 'Output directory' }
    })
    const result = getUnboundInputs({ input_file: 'some_value' }, tool)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('output_dir')
  })

  it('treats empty string as unbound', () => {
    const tool = makeTool({
      input_file: { type: 'string', description: 'Input file' }
    })
    const result = getUnboundInputs({ input_file: '' }, tool)
    expect(result).toHaveLength(1)
  })

  it('returns empty array when all required inputs are bound', () => {
    const tool = makeTool({
      input_file: { type: 'string', description: 'Input file' }
    })
    const result = getUnboundInputs({ input_file: '/path/to/file' }, tool)
    expect(result).toHaveLength(0)
  })
})

// ── generateContextFieldFromParam ───────────────────────────────────

describe('generateContextFieldFromParam', () => {
  it('maps dir-containing param names to directory type', () => {
    const param: ToolParameterDef = { type: 'string', description: 'Output directory' }
    const field = generateContextFieldFromParam('output_dir', param)
    expect(field.type).toBe('directory')
  })

  it('maps path-containing param names to directory type', () => {
    const param: ToolParameterDef = { type: 'string', description: 'A path' }
    const field = generateContextFieldFromParam('dicom_path', param)
    expect(field.type).toBe('directory')
  })

  it('does not override type for non-string dir params', () => {
    const param: ToolParameterDef = { type: 'number', description: 'Direction index' }
    const field = generateContextFieldFromParam('dir_index', param)
    expect(field.type).toBe('number')
  })

  it('converts snake_case to Title Case labels', () => {
    const param: ToolParameterDef = { type: 'string', description: 'desc' }
    expect(generateContextFieldFromParam('output_dir', param).label).toBe('Output Dir')
    expect(generateContextFieldFromParam('dicom_folder', param).label).toBe('Dicom Folder')
    expect(generateContextFieldFromParam('single', param).label).toBe('Single')
  })

  it('propagates default value', () => {
    const param: ToolParameterDef = { type: 'number', description: 'Threshold', default: 0.5 }
    const field = generateContextFieldFromParam('threshold', param)
    expect(field.default).toBe(0.5)
  })

  it('propagates enum', () => {
    const param: ToolParameterDef = { type: 'string', description: 'Mode', enum: ['fast', 'slow'] }
    const field = generateContextFieldFromParam('mode', param)
    expect(field.enum).toEqual(['fast', 'slow'])
  })

  it('propagates min and max', () => {
    const param: ToolParameterDef = { type: 'number', description: 'Level', min: 0, max: 100 }
    const field = generateContextFieldFromParam('level', param)
    expect(field.min).toBe(0)
    expect(field.max).toBe(100)
  })

  it('does not include optional keys when absent on param', () => {
    const param: ToolParameterDef = { type: 'string', description: 'Plain' }
    const field = generateContextFieldFromParam('name', param)
    expect(field).not.toHaveProperty('default')
    expect(field).not.toHaveProperty('enum')
    expect(field).not.toHaveProperty('min')
    expect(field).not.toHaveProperty('max')
  })
})

// ── generateFormSections ────────────────────────────────────────────

describe('generateFormSections', () => {
  const toolA = makeTool(
    {
      input_file: { type: 'string', description: 'Input' },
      output_dir: { type: 'string', description: 'Output dir' }
    },
    'ToolA'
  )

  const toolB = makeTool(
    {
      output_dir: { type: 'string', description: 'Output dir' },
      quality: { type: 'number', description: 'Quality', min: 1, max: 10 }
    },
    'ToolB'
  )

  const tools = new Map<string, ToolDefinition>([
    ['toolA', toolA],
    ['toolB', toolB]
  ])

  it('creates one section per step with unbound inputs', () => {
    const steps = [
      { name: 'step1', tool: 'toolA', inputs: {} },
      { name: 'step2', tool: 'toolB', inputs: {} }
    ]
    const { sections } = generateFormSections(steps, tools)
    expect(sections).toHaveLength(2)
    expect(sections[0].title).toBe('Configure ToolA')
    expect(sections[1].title).toBe('Configure ToolB')
  })

  it('deduplicates shared field names across steps', () => {
    const steps = [
      { name: 'step1', tool: 'toolA', inputs: {} },
      { name: 'step2', tool: 'toolB', inputs: {} }
    ]
    const { fields, sections } = generateFormSections(steps, tools)

    // output_dir appears in both tools, should only be in fields once
    expect(Object.keys(fields).filter((k) => k === 'output_dir')).toHaveLength(1)
    // and only in step1's section
    expect(sections[0].fields).toContain('output_dir')
    expect(sections[1].fields).not.toContain('output_dir')
    // step2 section only has quality
    expect(sections[1].fields).toEqual(['quality'])
  })

  it('skips steps where all inputs are already bound', () => {
    const steps = [
      { name: 'step1', tool: 'toolA', inputs: { input_file: '/a', output_dir: '/b' } },
      { name: 'step2', tool: 'toolB', inputs: {} }
    ]
    const { sections } = generateFormSections(steps, tools)
    expect(sections).toHaveLength(1)
    expect(sections[0].title).toBe('Configure ToolB')
  })

  it('returns empty when all steps are fully bound', () => {
    const steps = [
      { name: 'step1', tool: 'toolA', inputs: { input_file: '/a', output_dir: '/b' } },
      { name: 'step2', tool: 'toolB', inputs: { output_dir: '/b', quality: 5 } }
    ]
    const { fields, sections } = generateFormSections(steps, tools)
    expect(sections).toHaveLength(0)
    expect(Object.keys(fields)).toHaveLength(0)
  })

  it('skips steps whose tool is not found', () => {
    const steps = [{ name: 'step1', tool: 'unknownTool', inputs: {} }]
    const { sections } = generateFormSections(steps, tools)
    expect(sections).toHaveLength(0)
  })

  it('uses tool description for section description', () => {
    const steps = [{ name: 'step1', tool: 'toolA', inputs: {} }]
    const { sections } = generateFormSections(steps, tools)
    expect(sections[0].description).toBe('ToolA description')
  })
})

// ── inferFormSections ──────────────────────────────────────────────

describe('inferFormSections', () => {
  const allineateTool = makeTool(
    {
      nifti_paths: { type: 'volume[]', description: 'Input volumes', optional: true },
      output_dir: { type: 'string', description: 'Output directory', optional: true },
      cost: { type: 'string', description: 'Cost function', optional: true, default: 'ls', enum: ['ls', 'hel'] }
    },
    'allineate'
  )
  const tools = new Map<string, ToolDefinition>([['allineate', allineateTool]])

  function makeWorkflow(overrides: Partial<WorkflowDefinition> = {}): WorkflowDefinition {
    return {
      name: 'test-workflow',
      version: '1.0.0',
      description: 'Test workflow',
      menu: 'Processing',
      inputs: { dicom_dir: { type: 'dicom-folder', description: 'DICOM source' } },
      steps: {
        strip: {
          tool: 'allineate',
          inputs: {
            nifti_paths: { ref: 'inputs.volumes' },
            cost: { ref: 'context.cost' },
            output_dir: { ref: 'context.output_dir' }
          }
        }
      },
      outputs: {},
      ...overrides
    }
  }

  it('generates sections from context fields when no form is defined', () => {
    const wf = makeWorkflow({
      context: {
        fields: {
          output_dir: { type: 'directory', description: 'Output folder' },
          cost: { type: 'string', description: 'Cost function', default: 'ls', enum: ['ls', 'hel'] }
        }
      }
    })

    const { sections } = inferFormSections(wf, tools)
    expect(sections.length).toBeGreaterThan(0)

    // All context field names should appear in some section
    const allFields = sections.flatMap((s) => s.fields)
    expect(allFields).toContain('output_dir')
    expect(allFields).toContain('cost')
  })

  it('separates heuristic-driven fields into their own section', () => {
    const wf = makeWorkflow({
      context: {
        fields: {
          series_list: { type: 'json[]', description: 'Detected series', heuristic: 'list-series' },
          output_dir: { type: 'directory', description: 'Output folder' }
        }
      }
    })

    const { sections } = inferFormSections(wf, tools)
    const heuristicSection = sections.find((s) => s.fields.includes('series_list'))
    const pathSection = sections.find((s) => s.fields.includes('output_dir'))
    expect(heuristicSection).toBeDefined()
    expect(pathSection).toBeDefined()
    expect(heuristicSection).not.toBe(pathSection)
  })

  it('returns empty sections when there are no context fields and all inputs are bound', () => {
    const wf = makeWorkflow()
    const { sections } = inferFormSections(wf, tools)
    expect(sections).toHaveLength(0)
  })

  it('skips internal fields prefixed with _', () => {
    const wf = makeWorkflow({
      context: {
        fields: {
          _internal: { type: 'string', description: 'Internal state' },
          cost: { type: 'string', description: 'Cost function' }
        }
      }
    })

    const { sections } = inferFormSections(wf, tools)
    const allFields = sections.flatMap((s) => s.fields)
    expect(allFields).not.toContain('_internal')
    expect(allFields).toContain('cost')
  })

  it('uses single "Configure" title when all fields land in one section', () => {
    const wf = makeWorkflow({
      context: {
        fields: {
          cost: { type: 'string', description: 'Cost function', enum: ['ls', 'hel'] }
        }
      }
    })

    const { sections } = inferFormSections(wf, tools)
    expect(sections).toHaveLength(1)
    expect(sections[0].title).toBe('Configure')
  })

  it('discovers unbound required inputs and generates extra context fields', () => {
    const reqTool = makeTool(
      {
        input_file: { type: 'string', description: 'Required input' },
        quality: { type: 'number', description: 'Quality', min: 1, max: 10 }
      },
      'processor'
    )
    const toolsWithReq = new Map<string, ToolDefinition>([['processor', reqTool]])

    const wf = makeWorkflow({
      steps: {
        process: { tool: 'processor', inputs: {} }
      }
    })

    const { sections, extraContextFields } = inferFormSections(wf, toolsWithReq)
    expect(extraContextFields).toHaveProperty('input_file')
    expect(extraContextFields).toHaveProperty('quality')
    const allFields = sections.flatMap((s) => s.fields)
    expect(allFields).toContain('input_file')
    expect(allFields).toContain('quality')
  })
})
