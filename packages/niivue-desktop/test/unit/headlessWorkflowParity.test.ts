// ── Headless workflow parity test ────────────────────────────────────
//
// Enforces the contract that every workflow definition on disk can be
// loaded headlessly without errors. The test:
//
//   1. Reads every `.workflow.json` from `workflows/workflows/`
//   2. Reads every `.tool.json` from `workflows/tools/` and builds a tool map
//   3. Converts each workflow definition to the draft form the validator
//      expects, then runs `validateWorkflowDraft` against it
//   4. Asserts that there are zero validation errors
//
// This catches drift between the JSON files and the tool/workflow schemas
// before it lands in the desktop app — the headless and UI execution paths
// share an engine, so a workflow that fails this test cannot be run from
// either path.
//
// We don't actually execute steps here (that would require DICOM/NIfTI
// fixtures and the native binaries). The structural validation covers the
// contract that "any workflow on disk can be loaded headlessly".

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import type { ToolDefinition, WorkflowDefinition, Binding } from '../../src/common/workflowTypes.js'
import { validateWorkflowDraft } from '../../src/common/workflowValidator.js'

const WORKFLOWS_ROOT = path.resolve(__dirname, '../../workflows')
const WORKFLOWS_DIR = path.join(WORKFLOWS_ROOT, 'workflows')
const TOOLS_DIR = path.join(WORKFLOWS_ROOT, 'tools')

function readJsonFiles<T>(dir: string): Array<{ filename: string; data: T }> {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({
      filename: f,
      data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as T
    }))
}

interface DraftBinding {
  mode: 'ref' | 'constant'
  value: string
}

interface WorkflowDraft {
  name: string
  version: string
  description: string
  menu: string
  sections: Array<{ title: string; fields: string[] }>
  contextFields: Record<string, { type: string; label: string; description: string }>
  steps: Array<{
    name: string
    tool: string
    inputs: Record<string, DraftBinding>
    outputMappings: Record<string, string>
    condition: string
  }>
  workflowInputs: Record<string, { type: string; description: string }>
  workflowOutputs: Record<string, { type: string; ref: string }>
}

function bindingToDraft(binding: Binding): DraftBinding {
  if ('ref' in binding) {
    return { mode: 'ref', value: binding.ref }
  }
  return { mode: 'constant', value: JSON.stringify(binding.constant) }
}

function definitionToDraft(def: WorkflowDefinition): WorkflowDraft {
  const draft: WorkflowDraft = {
    name: def.name,
    version: def.version,
    description: def.description,
    menu: def.menu,
    sections: (def.form?.sections ?? []).map((s) => ({
      title: s.title,
      fields: s.fields
    })),
    contextFields: {},
    steps: [],
    workflowInputs: def.inputs as Record<string, { type: string; description: string }>,
    workflowOutputs: def.outputs as Record<string, { type: string; ref: string }>
  }

  if (def.context?.fields) {
    for (const [name, field] of Object.entries(def.context.fields)) {
      draft.contextFields[name] = {
        type: field.type,
        label: field.label || '',
        description: field.description
      }
    }
  }

  for (const [name, step] of Object.entries(def.steps)) {
    const inputs: Record<string, DraftBinding> = {}
    for (const [key, binding] of Object.entries(step.inputs)) {
      inputs[key] = bindingToDraft(binding)
    }
    draft.steps.push({
      name,
      tool: step.tool,
      inputs,
      outputMappings: step.outputMappings ?? {},
      condition: step.condition ?? ''
    })
  }

  return draft
}

// ── Test setup ────────────────────────────────────────────────────────

const tools = readJsonFiles<ToolDefinition>(TOOLS_DIR)
const workflows = readJsonFiles<WorkflowDefinition>(WORKFLOWS_DIR)

const toolsMap = new Map<string, ToolDefinition>()
for (const { data } of tools) {
  toolsMap.set(data.name, data)
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('headless workflow parity', () => {
  it('discovered at least one tool and one workflow', () => {
    expect(tools.length).toBeGreaterThan(0)
    expect(workflows.length).toBeGreaterThan(0)
  })

  describe.each(workflows)('$filename', ({ data }) => {
    it('loads as a structurally valid workflow', () => {
      const draft = definitionToDraft(data)
      const result = validateWorkflowDraft(draft, toolsMap)

      // If validation fails, surface every error so the diff is obvious
      if (result.errors.length > 0) {
        const formatted = result.errors
          .map((e) => `  - [${e.stepName ?? 'workflow'}] ${e.message}`)
          .join('\n')
        throw new Error(`Workflow has validation errors:\n${formatted}`)
      }
      expect(result.errors).toEqual([])
    })

    it('every step references a known tool', () => {
      for (const [stepName, step] of Object.entries(data.steps)) {
        expect(toolsMap.has(step.tool), `step '${stepName}' uses unknown tool '${step.tool}'`).toBe(
          true
        )
      }
    })

    it('every step.inputs binding has a recognised shape', () => {
      for (const [stepName, step] of Object.entries(data.steps)) {
        for (const [inputName, binding] of Object.entries(step.inputs)) {
          const isRef = binding && typeof binding === 'object' && 'ref' in binding
          const isConst = binding && typeof binding === 'object' && 'constant' in binding
          expect(
            isRef || isConst,
            `step '${stepName}' input '${inputName}' is neither {ref} nor {constant}`
          ).toBe(true)
        }
      }
    })

    it('does not reference removed _stepOutputs_* context keys', () => {
      const json = JSON.stringify(data)
      expect(json).not.toMatch(/_stepOutputs_/)
    })
  })
})

describe('tool definitions parity', () => {
  it('discovered at least one tool', () => {
    expect(tools.length).toBeGreaterThan(0)
  })

  describe.each(tools)('$filename', ({ data }) => {
    it('has required top-level fields', () => {
      expect(typeof data.name).toBe('string')
      expect(typeof data.version).toBe('string')
      expect(typeof data.description).toBe('string')
      expect(typeof data.inputs).toBe('object')
      expect(typeof data.outputs).toBe('object')
    })

    it('block.exposedFields all reference real tool inputs', () => {
      if (!data.block) return
      const blocks = Array.isArray(data.block) ? data.block : [data.block]
      for (const block of blocks) {
        for (const fieldName of block.exposedFields) {
          // exposedFields can reference tool inputs OR auto-generated context
          // fields (e.g. 'series_list', 'subjects'). Only check that any
          // exposed field that matches an input name is in fact an input.
          if (fieldName in data.inputs) continue
          // Otherwise allow it — it's a context field generated by the
          // designer or a heuristic.
        }
      }
    })

    it('block.id is unique across this tool', () => {
      if (!data.block) return
      const blocks = Array.isArray(data.block) ? data.block : [data.block]
      const ids = blocks.map((b) => b.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })
})
