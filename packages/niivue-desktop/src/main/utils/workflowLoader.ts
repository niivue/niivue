import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type {
  ToolDefinition,
  WorkflowDefinition,
  HeuristicDefinition,
  Binding,
  BlockDef,
  FormSectionDef
} from '../../common/workflowTypes.js'
import { registerHeuristic } from './heuristicRegistry.js'
import { createDeclarativeHeuristic } from './declarativeHeuristic.js'
import { registerToolExecutor } from './toolRegistry.js'
import { createDeclarativeToolExecutor } from './declarativeToolExecutor.js'
import { inferFormSections } from '../../common/bindingAnalyzer.js'

const isDev = !app.isPackaged

const toolDefinitions = new Map<string, ToolDefinition>()
const workflowDefinitions = new Map<string, WorkflowDefinition>()
const heuristicDefinitions = new Map<string, HeuristicDefinition>()
/** Names of built-in (non-editable) workflows */
const builtInWorkflowNames = new Set<string>()

function getWorkflowsRoot(): string {
  if (isDev) {
    return path.resolve(__dirname, '..', '..', 'workflows')
  }
  return path.join(process.resourcesPath, 'workflows')
}

function loadJsonFiles<T>(dir: string): T[] {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as T)
}

function loadHeuristics(dir: string): void {
  const defs = loadJsonFiles<HeuristicDefinition>(dir)
  for (const def of defs) {
    heuristicDefinitions.set(def.name, def)
    // Register the declarative heuristic as a HeuristicFn so the engine can use it
    registerHeuristic(def.name, createDeclarativeHeuristic(def))
  }
}

function loadDeclarativeTools(tools: ToolDefinition[]): number {
  let count = 0
  for (const tool of tools) {
    if (tool.exec) {
      registerToolExecutor(tool.name, createDeclarativeToolExecutor(tool))
      count++
    }
  }
  return count
}

/**
 * Find the block (if any) that matches a given step. Steps written by the
 * designer use `${block.id.replace(/-/g, '_')}_${index}` as their name, so we
 * match on that prefix; otherwise fall back to first block declared by the
 * step's tool.
 */
function findBlockForStep(
  stepName: string,
  toolName: string,
  tools: Map<string, ToolDefinition>
): BlockDef | undefined {
  const tool = tools.get(toolName)
  if (!tool || !tool.block) return undefined
  const blocks = Array.isArray(tool.block) ? tool.block : [tool.block]
  for (const block of blocks) {
    const prefix = block.id.replace(/-/g, '_')
    if (stepName.startsWith(prefix)) return block
  }
  return blocks[0]
}

/**
 * Repair stale `hiddenFields` bindings whose block default is `{ ref: "context" }`.
 * Heals workflows saved before whole-context defaults existed (they often
 * auto-wired a tool's `config: object` input to a string-typed step output,
 * which then errors at runtime as "expected object, got string").
 */
function repairHiddenContextRefs(
  definition: WorkflowDefinition,
  tools: Map<string, ToolDefinition>
): WorkflowDefinition {
  if (!definition.steps) return definition
  let changed = false
  const repairedSteps: Record<string, typeof definition.steps[string]> = {}

  for (const [stepName, step] of Object.entries(definition.steps)) {
    const block = findBlockForStep(stepName, step.tool, tools)
    if (!block || !block.defaults || !block.hiddenFields) {
      repairedSteps[stepName] = step
      continue
    }
    const newInputs: Record<string, Binding> = { ...step.inputs }
    let stepChanged = false
    for (const inputName of block.hiddenFields) {
      const def = block.defaults[inputName]
      if (
        !def ||
        typeof def !== 'object' ||
        !('ref' in def) ||
        (def as { ref: unknown }).ref !== 'context'
      ) {
        continue
      }
      const existing = newInputs[inputName]
      if (existing && 'ref' in existing && existing.ref === 'context') continue
      newInputs[inputName] = { ref: 'context' }
      stepChanged = true
    }
    if (stepChanged) {
      changed = true
      repairedSteps[stepName] = { ...step, inputs: newInputs }
    } else {
      repairedSteps[stepName] = step
    }
  }

  if (!changed) return definition
  console.log(
    `[workflow] Repaired hidden-context bindings in '${definition.name}'`
  )
  return { ...definition, steps: repairedSteps }
}

/**
 * Repair stale exposed-field bindings whose value points to a step output
 * instead of `context.<fieldName>`. Heals workflows where the designer's
 * type-based auto-wire matched an input like `output_dir` to an upstream
 * step's same-typed output (e.g. dcm2niix's temp outDir), which makes the
 * user's form value silently ignored.
 */
function repairExposedFieldRefs(
  definition: WorkflowDefinition,
  tools: Map<string, ToolDefinition>
): WorkflowDefinition {
  if (!definition.steps) return definition
  let changed = false
  const repairedSteps: Record<string, typeof definition.steps[string]> = {}

  for (const [stepName, step] of Object.entries(definition.steps)) {
    const block = findBlockForStep(stepName, step.tool, tools)
    if (!block || !block.exposedFields || block.exposedFields.length === 0) {
      repairedSteps[stepName] = step
      continue
    }
    const newInputs: Record<string, Binding> = { ...step.inputs }
    let stepChanged = false
    for (const inputName of block.exposedFields) {
      // Skip inputs that the block explicitly defaults — the block author
      // chose that wiring intentionally.
      if (block.defaults && inputName in block.defaults) continue
      const expectedRef = `context.${inputName}`
      const existing = newInputs[inputName]
      if (existing && 'ref' in existing && existing.ref === expectedRef) continue
      newInputs[inputName] = { ref: expectedRef }
      stepChanged = true
    }
    if (stepChanged) {
      changed = true
      repairedSteps[stepName] = { ...step, inputs: newInputs }
    } else {
      repairedSteps[stepName] = step
    }
  }

  if (!changed) return definition
  console.log(
    `[workflow] Repaired exposed-field bindings in '${definition.name}'`
  )
  return { ...definition, steps: repairedSteps }
}

/**
 * Insert synthetic form sections for steps whose block has exposed fields
 * that no existing section surfaces. Heals workflows where the designer
 * dropped a step (e.g. Validate BIDS) but its corresponding form section
 * was lost or never created — without it, the user has no way to enter
 * fields like `dataset_name`.
 */
function repairMissingFormSections(
  definition: WorkflowDefinition,
  tools: Map<string, ToolDefinition>
): WorkflowDefinition {
  if (!definition.form?.sections || !definition.steps) return definition

  const newSections: FormSectionDef[] = [...definition.form.sections]
  const exposedInForm = new Set<string>()
  for (const sec of newSections) for (const f of sec.fields) exposedInForm.add(f)

  let inserted = false
  const stepEntries = Object.entries(definition.steps)
  for (let stepIdx = 0; stepIdx < stepEntries.length; stepIdx++) {
    const [stepName, step] = stepEntries[stepIdx]
    const block = findBlockForStep(stepName, step.tool, tools)
    if (!block?.exposedFields?.length) continue

    const uncovered = block.exposedFields.filter((f) => !exposedInForm.has(f))
    if (uncovered.length === 0) continue

    const section: FormSectionDef = {
      title: block.label,
      description: block.description,
      fields: uncovered,
      ...(block.formComponent ? { component: block.formComponent } : {})
    }
    const insertAt = Math.min(stepIdx, newSections.length)
    newSections.splice(insertAt, 0, section)
    for (const f of uncovered) exposedInForm.add(f)
    inserted = true
  }

  if (!inserted) return definition
  console.log(
    `[workflow] Synthesized missing form sections in '${definition.name}'`
  )
  return { ...definition, form: { ...definition.form, sections: newSections } }
}

/**
 * Apply form inference (if the workflow has no explicit form), repair any
 * stale block-default bindings, and freeze the definition so it can't be
 * mutated at runtime. Run once per workflow when loaded or saved — not on
 * every run.
 */
function finalizeWorkflow(
  definition: WorkflowDefinition,
  tools: Map<string, ToolDefinition>
): WorkflowDefinition {
  const hiddenRepaired = repairHiddenContextRefs(definition, tools)
  const exposedRepaired = repairExposedFieldRefs(hiddenRepaired, tools)
  const repaired = repairMissingFormSections(exposedRepaired, tools)

  if (repaired.form) {
    return Object.freeze(repaired)
  }

  const { sections, extraContextFields } = inferFormSections(repaired, tools)

  // Build a new definition object (no mutation of the raw JSON load)
  const finalized: WorkflowDefinition = {
    ...repaired,
    form: sections.length > 0 ? { sections } : repaired.form,
    context: {
      ...repaired.context,
      fields: {
        ...(repaired.context?.fields ?? {}),
        ...extraContextFields
      }
    }
  }

  return Object.freeze(finalized)
}

export function loadAllDefinitions(): void {
  const root = getWorkflowsRoot()

  const tools = loadJsonFiles<ToolDefinition>(path.join(root, 'tools'))
  for (const tool of tools) {
    toolDefinitions.set(tool.name, tool)
  }

  // Register declarative tool executors (tools with an `exec` section)
  const declToolCount = loadDeclarativeTools(tools)

  const workflows = loadJsonFiles<WorkflowDefinition>(path.join(root, 'workflows'))
  for (const wf of workflows) {
    workflowDefinitions.set(wf.name, finalizeWorkflow(wf, toolDefinitions))
    builtInWorkflowNames.add(wf.name)
  }

  // Load user workflows from app data directory
  const userDir = getUserWorkflowsDir()
  if (fs.existsSync(userDir)) {
    const userWorkflows = loadJsonFiles<WorkflowDefinition>(userDir)
    for (const wf of userWorkflows) {
      workflowDefinitions.set(wf.name, finalizeWorkflow(wf, toolDefinitions))
    }
  }

  // Load declarative heuristics (if directory exists)
  loadHeuristics(path.join(root, 'heuristics'))

  const userCount = workflowDefinitions.size - builtInWorkflowNames.size
  console.log(
    `[workflow] Loaded ${toolDefinitions.size} tools (${declToolCount} declarative), ${workflowDefinitions.size} workflows (${userCount} user), ${heuristicDefinitions.size} heuristics`
  )
}

/**
 * Load definitions from an explicit root directory.
 * Does not depend on Electron's app module — suitable for headless/non-Electron use.
 */
export function loadDefinitionsFromPath(rootDir: string): void {
  const tools = loadJsonFiles<ToolDefinition>(path.join(rootDir, 'tools'))
  for (const tool of tools) {
    toolDefinitions.set(tool.name, tool)
  }

  const declToolCount = loadDeclarativeTools(tools)

  const workflows = loadJsonFiles<WorkflowDefinition>(path.join(rootDir, 'workflows'))
  for (const wf of workflows) {
    workflowDefinitions.set(wf.name, finalizeWorkflow(wf, toolDefinitions))
  }

  loadHeuristics(path.join(rootDir, 'heuristics'))

  console.log(
    `[workflow] Loaded ${toolDefinitions.size} tools (${declToolCount} declarative), ${workflowDefinitions.size} workflows, ${heuristicDefinitions.size} heuristics from ${rootDir}`
  )
}

export function getToolDefinitions(): Map<string, ToolDefinition> {
  return toolDefinitions
}

export function getWorkflowDefinitions(): Map<string, WorkflowDefinition> {
  return workflowDefinitions
}

export function getHeuristicDefinitions(): Map<string, HeuristicDefinition> {
  return heuristicDefinitions
}

export function isBuiltInWorkflow(name: string): boolean {
  return builtInWorkflowNames.has(name)
}

export function getUserWorkflowsDir(): string {
  return path.join(app.getPath('userData'), 'workflows')
}

export function saveUserWorkflow(definition: WorkflowDefinition): string {
  const dir = getUserWorkflowsDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  const filePath = path.join(dir, `${definition.name}.workflow.json`)
  fs.writeFileSync(filePath, JSON.stringify(definition, null, 2))
  workflowDefinitions.set(definition.name, finalizeWorkflow(definition, toolDefinitions))
  return filePath
}

export function deleteUserWorkflow(name: string): boolean {
  if (builtInWorkflowNames.has(name)) return false
  const dir = getUserWorkflowsDir()
  const filePath = path.join(dir, `${name}.workflow.json`)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
  workflowDefinitions.delete(name)
  return true
}
