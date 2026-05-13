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
import { inferFormSections, generateContextFieldFromParam } from '../../common/bindingAnalyzer.js'

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
 * Repair stale `hiddenFields` bindings on a saved step. Hidden fields are not
 * user-editable, so the block's declared default is authoritative:
 *   - If the block declares a ref-typed default, force that ref (overwriting
 *     any stale type-based auto-wire from the designer).
 *   - If the block declares no default but the tool input itself has a
 *     default, strip any ref binding so the tool's input default applies.
 *     (Designer auto-wires can produce nonsensical results like binding
 *     dcm2niix's `pattern` filename-format string to an upstream `outDir`
 *     path.) When the tool input has no default, the ref is necessary
 *     plumbing (e.g. bids-write's `volumes` from the conversion step), so
 *     leave it alone.
 * Constant bindings are left alone — they're explicit intent.
 * Without this, the saved workflow silently passes the wrong data to
 * validate/write steps and the BIDS preview/validation appears empty.
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
    if (!block || !block.hiddenFields) {
      repairedSteps[stepName] = step
      continue
    }
    const tool = tools.get(step.tool)
    const newInputs: Record<string, Binding> = { ...step.inputs }
    let stepChanged = false
    for (const inputName of block.hiddenFields) {
      const def = block.defaults?.[inputName]
      const existing = newInputs[inputName]
      if (def && typeof def === 'object' && 'ref' in def && typeof (def as { ref: unknown }).ref === 'string') {
        const expected = (def as { ref: string }).ref
        if (existing && 'ref' in existing && existing.ref === expected) continue
        newInputs[inputName] = { ref: expected }
        stepChanged = true
      } else if (!def && existing && 'ref' in existing) {
        const toolInput = tool?.inputs?.[inputName]
        const toolHasDefault = toolInput && 'default' in toolInput && toolInput.default !== undefined
        if (toolHasDefault) {
          delete newInputs[inputName]
          stepChanged = true
        }
      }
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
    `[workflow] Repaired hidden-field bindings in '${definition.name}'`
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
    const wfInputs = definition.inputs ?? {}
    const tool = tools.get(step.tool)
    const declaredInputs = new Set(Object.keys(tool?.inputs ?? {}))
    let stepChanged = false
    for (const inputName of block.exposedFields) {
      // exposedFields can name tool inputs *or* context-only fields the form
      // component reads (e.g. bids-classify's `subjects`, which is a context
      // field, not an input on the tool). Only repair bindings for fields
      // that are actually tool inputs — otherwise we'd add nonsense bindings
      // that pass undeclared keys to the executor.
      if (!declaredInputs.has(inputName)) continue
      // Skip inputs that the block explicitly defaults — the block author
      // chose that wiring intentionally.
      if (block.defaults && inputName in block.defaults) continue
      const expectedRef = `context.${inputName}`
      const existing = newInputs[inputName]
      if (existing && 'ref' in existing && existing.ref === expectedRef) continue
      // Honor an intentional binding to a workflow-level input of the same
      // name — built-in workflows often wire e.g. dcm2niix's `dicom_dir`
      // directly from `inputs.dicom_dir` rather than going through context.
      if (
        existing &&
        'ref' in existing &&
        existing.ref === `inputs.${inputName}` &&
        inputName in wfInputs
      )
        continue
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

  // Workflow-level inputs are collected by the run-launcher (native dialogs in
  // the menu's handleWorkflowMenuClick) before the wizard mounts. Any block
  // exposedField that names one of those is already satisfied — synthesizing a
  // form section for it would surface a second, redundant prompt for the user
  // (e.g. dcm2niix's `dicom_dir` block-exposed → "asked twice for DICOM" with
  // a synthetic 'Import DICOMs' section sitting before the real Filter step).
  const workflowInputNames = new Set(Object.keys(definition.inputs ?? {}))

  // Context fields that some step populates via its outputMappings (e.g.
  // bids-write writes `bids_dir` into context). Surfacing these as form
  // fields asks the user to enter a value that the workflow itself
  // produces — typically empty when the form mounts, since the producing
  // step runs in the final execute-all phase. Skip them too.
  const stepProducedContextFields = new Set<string>()
  for (const step of Object.values(definition.steps)) {
    if (!step.outputMappings) continue
    for (const ctxField of Object.values(step.outputMappings)) {
      stepProducedContextFields.add(ctxField)
    }
  }

  let inserted = false
  const stepEntries = Object.entries(definition.steps)
  for (let stepIdx = 0; stepIdx < stepEntries.length; stepIdx++) {
    const [stepName, step] = stepEntries[stepIdx]
    const block = findBlockForStep(stepName, step.tool, tools)
    if (!block?.exposedFields?.length) continue

    const uncovered = block.exposedFields.filter(
      (f) =>
        !exposedInForm.has(f) &&
        !workflowInputNames.has(f) &&
        !stepProducedContextFields.has(f)
    )
    if (uncovered.length === 0) continue

    // If a section already carries the block's title, fold the missing
    // fields into it rather than spawning a duplicate section. This handles
    // the case where a tool's exposedFields evolved (e.g. nifti_path →
    // nifti_paths) and the saved form lost coverage of the new field but
    // still has its original title.
    const existingIdx = newSections.findIndex((s) => s.title === block.label)
    if (existingIdx >= 0) {
      const existing = newSections[existingIdx]
      newSections[existingIdx] = {
        ...existing,
        fields: [...existing.fields, ...uncovered],
        ...(block.formComponent && !existing.component
          ? { component: block.formComponent }
          : {})
      }
    } else {
      const section: FormSectionDef = {
        title: block.label,
        description: block.description,
        fields: uncovered,
        ...(block.formComponent ? { component: block.formComponent } : {})
      }
      const insertAt = Math.min(stepIdx, newSections.length)
      newSections.splice(insertAt, 0, section)
    }
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
 * Prune form-section fields that no longer correspond to any exposed field
 * of a step's block. Heals workflows saved before a tool input was renamed
 * or moved into hiddenFields — without this the wizard surfaces a stale
 * field (e.g. atlas-parcellate's `nifti_path` after rename to `nifti_paths`)
 * that has nowhere to be read from, asking the user to fill in a path that
 * the workflow ignores.
 *
 * Limited to auto-generated sections (no custom `component`). Custom-
 * component sections often surface context fields the component reads by
 * convention (e.g. skull-strip-editor reads `skull_strip_config` even
 * though brainchop's block declares `exposedFields: []`), so pruning there
 * would mistakenly drop fields the section needs.
 */
function repairOrphanedFormFields(
  definition: WorkflowDefinition,
  tools: Map<string, ToolDefinition>
): WorkflowDefinition {
  if (!definition.form?.sections || !definition.steps) return definition

  const stepBlocks: BlockDef[] = []
  for (const [stepName, step] of Object.entries(definition.steps)) {
    const block = findBlockForStep(stepName, step.tool, tools)
    if (block) stepBlocks.push(block)
  }
  if (stepBlocks.length === 0) return definition

  let changed = false
  const newSections = definition.form.sections.map((section) => {
    if (section.component) return section
    if (!section.title) return section
    const matched = stepBlocks.find((b) => b.label === section.title)
    if (!matched) return section

    const allowed = new Set<string>([
      ...matched.exposedFields,
      ...(matched.requiredContextFields ?? [])
    ])
    const filtered = section.fields.filter((f) => allowed.has(f))
    if (filtered.length === section.fields.length) return section
    changed = true
    return { ...section, fields: filtered }
  })

  if (!changed) return definition
  console.log(
    `[workflow] Pruned orphaned form fields in '${definition.name}'`
  )
  return { ...definition, form: { ...definition.form, sections: newSections } }
}

/**
 * Drop step input bindings whose key isn't declared on the tool. Heals
 * workflows saved before a tool input was renamed or removed (e.g. an old
 * step still referencing `dicom_series`/`selected_series` on dcm2niix when
 * those moved to context-only fields), where the stale binding would either
 * be silently ignored or — worse — collide with a same-named tool input
 * that's since taken on a different meaning. The forEach companion is
 * honored automatically: the companion key (e.g. `nifti_path` alongside
 * `nifti_paths`) is itself a declared tool input.
 */
function repairStepInputs(
  definition: WorkflowDefinition,
  tools: Map<string, ToolDefinition>
): WorkflowDefinition {
  if (!definition.steps) return definition
  let changed = false
  const repairedSteps: Record<string, typeof definition.steps[string]> = {}

  for (const [stepName, step] of Object.entries(definition.steps)) {
    const tool = tools.get(step.tool)
    if (!tool || !step.inputs) {
      repairedSteps[stepName] = step
      continue
    }
    const declaredInputs = new Set(Object.keys(tool.inputs ?? {}))
    const newInputs: Record<string, Binding> = {}
    let stepChanged = false
    for (const [inputName, binding] of Object.entries(step.inputs)) {
      if (declaredInputs.has(inputName)) {
        newInputs[inputName] = binding
      } else {
        stepChanged = true
      }
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
    `[workflow] Pruned undeclared step input bindings in '${definition.name}'`
  )
  return { ...definition, steps: repairedSteps }
}

/**
 * Drop step input bindings that wire a tool's working-directory input
 * (declared via `tool.exec.outputDir.input`) to an upstream step's output.
 * Heals workflows saved before `blockToStepDraft` learned to skip auto-wiring
 * this input — the designer's type-based matcher would happily bind e.g.
 * dcm2niix's `out_dir: string` to a previous dcm2niix step's `outDir: string`
 * output, making the two steps share a single tempdir. Glob-based output
 * collection then accumulates files across re-runs (every filter toggle
 * invalidates the step), so downstream sees more volumes than the user
 * selected. Dropping the binding lets the executor mkdtemp a fresh dir
 * per step.
 */
function repairOutputDirSelfRefs(
  definition: WorkflowDefinition,
  tools: Map<string, ToolDefinition>
): WorkflowDefinition {
  if (!definition.steps) return definition
  let changed = false
  const repairedSteps: Record<string, typeof definition.steps[string]> = {}

  for (const [stepName, step] of Object.entries(definition.steps)) {
    const tool = tools.get(step.tool)
    const workdirInput = tool?.exec?.outputDir?.input
    if (!workdirInput || !step.inputs || !(workdirInput in step.inputs)) {
      repairedSteps[stepName] = step
      continue
    }
    const binding = step.inputs[workdirInput]
    if (
      binding &&
      'ref' in binding &&
      typeof binding.ref === 'string' &&
      binding.ref.startsWith('steps.')
    ) {
      const newInputs = { ...step.inputs }
      delete newInputs[workdirInput]
      repairedSteps[stepName] = { ...step, inputs: newInputs }
      changed = true
    } else {
      repairedSteps[stepName] = step
    }
  }

  if (!changed) return definition
  console.log(
    `[workflow] Dropped self-referencing outputDir bindings in '${definition.name}'`
  )
  return { ...definition, steps: repairedSteps }
}

/**
 * Backfill enum/min/max metadata on context fields whose name matches a tool
 * input declared by some step's tool. Heals workflows saved by the designer
 * before `blockToContextFields` forwarded enum on the param path — without
 * this, fields like `atlas` (an enum tool input on atlas-parcellate) lose
 * their dropdown options and render as a freeform text box, forcing the user
 * to type the model id by hand.
 */
function repairContextFieldEnums(
  definition: WorkflowDefinition,
  tools: Map<string, ToolDefinition>
): WorkflowDefinition {
  if (!definition.context?.fields || !definition.steps) return definition

  const paramByField = new Map<string, { enum?: unknown[]; min?: number; max?: number }>()
  for (const step of Object.values(definition.steps)) {
    const tool = tools.get(step.tool)
    if (!tool?.inputs) continue
    for (const [inputName, param] of Object.entries(tool.inputs)) {
      if (paramByField.has(inputName)) continue
      if (param.enum === undefined && param.min === undefined && param.max === undefined) continue
      paramByField.set(inputName, {
        ...(param.enum !== undefined && { enum: param.enum }),
        ...(param.min !== undefined && { min: param.min }),
        ...(param.max !== undefined && { max: param.max })
      })
    }
  }
  if (paramByField.size === 0) return definition

  let changed = false
  const newFields = { ...definition.context.fields }
  for (const [name, existing] of Object.entries(newFields)) {
    const meta = paramByField.get(name)
    if (!meta) continue
    const wantsEnum = meta.enum !== undefined && existing.enum === undefined
    const wantsMin = meta.min !== undefined && existing.min === undefined
    const wantsMax = meta.max !== undefined && existing.max === undefined
    if (!wantsEnum && !wantsMin && !wantsMax) continue
    newFields[name] = {
      ...existing,
      ...(wantsEnum && { enum: meta.enum }),
      ...(wantsMin && { min: meta.min }),
      ...(wantsMax && { max: meta.max })
    }
    changed = true
  }
  if (!changed) return definition
  console.log(`[workflow] Backfilled context-field enum/min/max in '${definition.name}'`)
  return {
    ...definition,
    context: { ...definition.context, fields: newFields }
  }
}

/**
 * Propagate `dependsOn` from inline block contextField metadata onto matching
 * workflow context fields. Heals workflows saved before dependsOn existed so
 * heuristic refires (e.g. list-dicom-series) only run when their inputs change
 * — without it, every keystroke or selection click in a sibling field re-runs
 * the heuristic, producing visible spinner-flicker that unmounts custom form
 * components mid-interaction.
 */
function repairContextFieldDependsOn(
  definition: WorkflowDefinition,
  tools: Map<string, ToolDefinition>
): WorkflowDefinition {
  if (!definition.context?.fields || !definition.steps) return definition

  const inlineDeps = new Map<string, string[]>()
  for (const [stepName, step] of Object.entries(definition.steps)) {
    const block = findBlockForStep(stepName, step.tool, tools)
    if (!block?.contextFields) continue
    for (const [fieldName, inline] of Object.entries(block.contextFields)) {
      if (inline.dependsOn && !inlineDeps.has(fieldName)) {
        inlineDeps.set(fieldName, inline.dependsOn)
      }
    }
  }
  if (inlineDeps.size === 0) return definition

  let changed = false
  const newFields = { ...definition.context.fields }
  for (const [name, deps] of inlineDeps) {
    const existing = newFields[name]
    if (!existing || existing.dependsOn) continue
    newFields[name] = { ...existing, dependsOn: deps }
    changed = true
  }
  if (!changed) return definition
  return {
    ...definition,
    context: { ...definition.context, fields: newFields }
  }
}

/**
 * Upgrade existing context fields with the inline declarations from any
 * step's matching block. Heals workflows whose `series_list` (or similar
 * shared field) was first created via the generic `type: 'object'` fallback
 * in `blockToContextFields` — that fallback runs when no producer block had
 * yet declared inline `contextFields`. If a block now declares the field
 * with a real type/heuristic (e.g. `series-mapping[]` + `bids-classify`),
 * adopt that here so the wizard fires the heuristic when the user reaches
 * the section, and AutoField/custom components see the right type.
 *
 * Conservative: only overwrites fields whose existing type is the generic
 * `'object'` placeholder, or whose `heuristic` is missing. Anything an
 * author has hand-edited (real type already, explicit heuristic already)
 * is left alone.
 */
function repairBlockContextFieldDeclarations(
  definition: WorkflowDefinition,
  tools: Map<string, ToolDefinition>
): WorkflowDefinition {
  if (!definition.context?.fields || !definition.steps) return definition

  const inlineByName = new Map<string, NonNullable<BlockDef['contextFields']>[string]>()
  for (const [stepName, step] of Object.entries(definition.steps)) {
    const block = findBlockForStep(stepName, step.tool, tools)
    if (!block?.contextFields) continue
    for (const [fieldName, inline] of Object.entries(block.contextFields)) {
      if (!inlineByName.has(fieldName)) inlineByName.set(fieldName, inline)
    }
  }
  if (inlineByName.size === 0) return definition

  let changed = false
  const newFields = { ...definition.context.fields }
  for (const [name, inline] of inlineByName) {
    const existing = newFields[name]
    if (!existing) continue
    const wantsType = existing.type === 'object' && inline.type !== 'object'
    const wantsHeuristic = !existing.heuristic && !!inline.heuristic
    if (!wantsType && !wantsHeuristic) continue
    newFields[name] = {
      ...existing,
      ...(wantsType ? { type: inline.type } : {}),
      ...(wantsHeuristic ? { heuristic: inline.heuristic } : {}),
      ...(wantsType && inline.label ? { label: inline.label } : {}),
      ...(wantsType && inline.description ? { description: inline.description } : {}),
      ...(wantsType && inline.dependsOn && !existing.dependsOn
        ? { dependsOn: inline.dependsOn }
        : {})
    }
    changed = true
  }
  if (!changed) return definition
  console.log(`[workflow] Upgraded context-field declarations in '${definition.name}'`)
  return {
    ...definition,
    context: { ...definition.context, fields: newFields }
  }
}

/**
 * Backfill `context.fields` with entries for any block-exposed field that
 * has no existing context definition. Heals saved workflows that pre-date
 * a tool input rename (e.g. atlas-parcellate's nifti_path → nifti_paths)
 * — without this, the form section references a field with no type, and
 * AutoField receives undefined and falls back to a plain text input,
 * which (for `volume[]`) causes the volume picker to claim no eligible
 * field exists.
 */
function repairMissingContextFields(
  definition: WorkflowDefinition,
  tools: Map<string, ToolDefinition>
): WorkflowDefinition {
  if (!definition.steps) return definition
  const existingFields = definition.context?.fields ?? {}
  const newFields = { ...existingFields }
  let changed = false

  for (const [stepName, step] of Object.entries(definition.steps)) {
    const block = findBlockForStep(stepName, step.tool, tools)
    if (!block) continue
    const tool = tools.get(step.tool)
    if (!tool) continue

    const candidates = [
      ...(block.exposedFields ?? []),
      ...(block.requiredContextFields ?? [])
    ]
    for (const fieldName of candidates) {
      if (newFields[fieldName]) continue
      // Inline contextFields wins.
      const inline = block.contextFields?.[fieldName]
      if (inline) {
        newFields[fieldName] = {
          type: inline.type,
          label: inline.label || fieldName,
          description: inline.description || '',
          ...(inline.default !== undefined ? { default: inline.default } : {}),
          ...(inline.enum ? { enum: inline.enum } : {}),
          ...(inline.heuristic ? { heuristic: inline.heuristic } : {}),
          ...(inline.optional !== undefined ? { optional: inline.optional } : {}),
          ...(inline.min !== undefined ? { min: inline.min } : {}),
          ...(inline.max !== undefined ? { max: inline.max } : {}),
          ...(inline.dependsOn ? { dependsOn: inline.dependsOn } : {})
        }
        changed = true
        continue
      }
      const param = tool.inputs[fieldName] || tool.outputs[fieldName]
      if (!param) continue
      const generated = generateContextFieldFromParam(fieldName, param)
      newFields[fieldName] = {
        type: generated.type,
        label: generated.label,
        description: generated.description,
        ...(generated.default !== undefined ? { default: generated.default } : {}),
        ...(generated.enum !== undefined ? { enum: generated.enum } : {}),
        ...(generated.min !== undefined ? { min: generated.min } : {}),
        ...(generated.max !== undefined ? { max: generated.max } : {}),
        ...(block.heuristics?.[fieldName] ? { heuristic: block.heuristics[fieldName] } : {})
      }
      changed = true
    }
  }

  if (!changed) return definition
  console.log(`[workflow] Backfilled context fields in '${definition.name}'`)
  return {
    ...definition,
    context: { ...(definition.context ?? { description: '', fields: {} }), fields: newFields }
  }
}

/**
 * Apply form inference (if the workflow has no explicit form), repair any
 * stale block-default bindings, and freeze the definition so it can't be
 * mutated at runtime. Run once per workflow when loaded or saved — not on
 * every run.
 */
export function finalizeWorkflow(
  definition: WorkflowDefinition,
  tools: Map<string, ToolDefinition>
): WorkflowDefinition {
  const inputsRepaired = repairStepInputs(definition, tools)
  const workdirRepaired = repairOutputDirSelfRefs(inputsRepaired, tools)
  const hiddenRepaired = repairHiddenContextRefs(workdirRepaired, tools)
  const exposedRepaired = repairExposedFieldRefs(hiddenRepaired, tools)
  const sectionsRepaired = repairMissingFormSections(exposedRepaired, tools)
  const orphanRepaired = repairOrphanedFormFields(sectionsRepaired, tools)
  const ctxRepaired = repairMissingContextFields(orphanRepaired, tools)
  const ctxUpgraded = repairBlockContextFieldDeclarations(ctxRepaired, tools)
  const enumsRepaired = repairContextFieldEnums(ctxUpgraded, tools)
  const repaired = repairContextFieldDependsOn(enumsRepaired, tools)

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

  // Load user workflows from app data directory. If a repair pass changes
  // the definition (e.g. drops a stale `out_dir` self-ref), rewrite the
  // file so the heal is durable — otherwise the bad shape sits on disk
  // and any code path that reads the raw JSON (manual editing, future
  // tooling) would still see it.
  const userDir = getUserWorkflowsDir()
  if (fs.existsSync(userDir)) {
    for (const file of fs.readdirSync(userDir).filter((f) => f.endsWith('.json'))) {
      const filePath = path.join(userDir, file)
      const raw = fs.readFileSync(filePath, 'utf-8')
      const wf = JSON.parse(raw) as WorkflowDefinition
      const finalized = finalizeWorkflow(wf, toolDefinitions)
      workflowDefinitions.set(wf.name, finalized)
      // Write back if the repair changed anything. Strip the frozen
      // wrapper before serialization (JSON.stringify ignores Object.freeze
      // anyway, but the readability is the same).
      const normalized = JSON.stringify(finalized, null, 2)
      if (normalized !== JSON.stringify(wf, null, 2)) {
        try {
          fs.writeFileSync(filePath, normalized)
          console.log(`[workflow] Persisted repairs to ${filePath}`)
        } catch (err) {
          console.warn(`[workflow] Could not write repaired definition: ${err}`)
        }
      }
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
  // Run the repair passes BEFORE writing, not after. The designer can hand
  // us bindings the repair logic would have stripped (stale undeclared
  // inputs, self-referencing outDir, exposed-field auto-wires that point at
  // the wrong source). Writing the raw draft persists those bugs to disk;
  // finalizing first means the saved file matches what the engine actually
  // executes.
  const finalized = finalizeWorkflow(definition, toolDefinitions)
  fs.writeFileSync(filePath, JSON.stringify(finalized, null, 2))
  workflowDefinitions.set(definition.name, finalized)
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
