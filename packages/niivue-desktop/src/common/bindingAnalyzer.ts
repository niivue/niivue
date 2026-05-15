import type { ToolParameterDef, ToolDefinition, WorkflowDefinition, FormSectionDef, ContextFieldDef } from './workflowTypes.js'

// ── Interfaces ──────────────────────────────────────────────────────

/** A context field generated from an unbound tool parameter. */
export interface GeneratedContextField {
  type: string
  label: string
  description: string
  default?: unknown
  enum?: unknown[]
  min?: number
  max?: number
}

/** A form section generated for a single workflow step. */
export interface GeneratedFormSection {
  title: string
  description: string
  fields: string[]
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Convert a snake_case parameter name to Title Case.
 * e.g. "output_dir" → "Output Dir"
 */
function snakeToTitleCase(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Returns required tool inputs that have no binding (or an empty/falsy binding)
 * in the given step input map.
 */
export function getUnboundInputs(
  stepInputBindings: Record<string, unknown>,
  toolDef: ToolDefinition
): Array<{ name: string; param: ToolParameterDef }> {
  const result: Array<{ name: string; param: ToolParameterDef }> = []
  for (const [name, param] of Object.entries(toolDef.inputs)) {
    if (param.optional === true) continue
    if (!stepInputBindings[name]) {
      result.push({ name, param })
    }
  }
  return result
}

/**
 * Maps a ToolParameterDef to a GeneratedContextField suitable for use
 * in a workflow form.
 */
export function generateContextFieldFromParam(
  paramName: string,
  param: ToolParameterDef
): GeneratedContextField {
  const isDirOrPath = /dir|path/i.test(paramName)
  const type = isDirOrPath && param.type === 'string' ? 'directory' : param.type

  const field: GeneratedContextField = {
    type,
    label: snakeToTitleCase(paramName),
    description: param.description
  }

  if (param.default !== undefined) field.default = param.default
  if (param.enum !== undefined) field.enum = param.enum
  if (param.min !== undefined) field.min = param.min
  if (param.max !== undefined) field.max = param.max

  return field
}

/**
 * Analyses a list of workflow steps, identifies unbound required inputs,
 * and generates context fields and form sections for them.
 *
 * Fields are deduplicated: if the same parameter name appears in multiple
 * steps, it is only included in the first section that references it.
 */
export function generateFormSections(
  steps: Array<{ name: string; tool: string; inputs: Record<string, unknown> }>,
  tools: Map<string, ToolDefinition>
): { fields: Record<string, GeneratedContextField>; sections: GeneratedFormSection[] } {
  const fields: Record<string, GeneratedContextField> = {}
  const sections: GeneratedFormSection[] = []
  const seen = new Set<string>()

  for (const step of steps) {
    const toolDef = tools.get(step.tool)
    if (!toolDef) continue

    const unbound = getUnboundInputs(step.inputs, toolDef)
    const sectionFields: string[] = []

    for (const { name, param } of unbound) {
      if (seen.has(name)) continue
      seen.add(name)
      fields[name] = generateContextFieldFromParam(name, param)
      sectionFields.push(name)
    }

    if (sectionFields.length > 0) {
      sections.push({
        title: `Configure ${toolDef.name}`,
        description: toolDef.description,
        fields: sectionFields
      })
    }
  }

  return { fields, sections }
}

/**
 * Infer form sections for a workflow that has no explicit `form` definition.
 *
 * Strategy:
 * 1. Group context fields into sections by role (heuristic-driven fields,
 *    configuration/enum fields, path/directory fields).
 * 2. For any unbound required tool inputs not already covered by context,
 *    generate additional context fields and a section for them.
 *
 * Returns the inferred form sections and any additional context fields that
 * should be merged into the definition.
 */
export function inferFormSections(
  definition: WorkflowDefinition,
  tools: Map<string, ToolDefinition>
): {
  sections: FormSectionDef[]
  extraContextFields: Record<string, ContextFieldDef>
} {
  const contextFields = definition.context?.fields ?? {}
  const contextFieldNames = Object.keys(contextFields)

  // ── Discover unbound required tool inputs not already in context ──
  const extraContextFields: Record<string, ContextFieldDef> = {}
  const extraFieldNames: string[] = []

  for (const [, step] of Object.entries(definition.steps)) {
    const toolDef = tools.get(step.tool)
    if (!toolDef) continue

    const unbound = getUnboundInputs(step.inputs as Record<string, unknown>, toolDef)
    for (const { name, param } of unbound) {
      if (contextFields[name] || extraContextFields[name]) continue
      const generated = generateContextFieldFromParam(name, param)
      extraContextFields[name] = {
        type: generated.type,
        description: generated.description,
        label: generated.label,
        ...(generated.default !== undefined && { default: generated.default }),
        ...(generated.enum !== undefined && { enum: generated.enum }),
        ...(generated.min !== undefined && { min: generated.min }),
        ...(generated.max !== undefined && { max: generated.max })
      }
      extraFieldNames.push(name)
    }
  }

  // ── Partition context fields into logical groups ──
  const allFields = { ...contextFields, ...extraContextFields }
  const allNames = [...contextFieldNames, ...extraFieldNames]

  // Skip internal fields (prefixed with _)
  const visibleNames = allNames.filter((n) => !n.startsWith('_'))

  if (visibleNames.length === 0) {
    return { sections: [], extraContextFields }
  }

  // Classify fields
  const heuristicFields: string[] = []
  const configFields: string[] = []
  const pathFields: string[] = []

  for (const name of visibleNames) {
    const field = allFields[name]
    if (field.heuristic) {
      heuristicFields.push(name)
    } else if (field.type === 'directory' || /dir|path/i.test(name)) {
      pathFields.push(name)
    } else {
      configFields.push(name)
    }
  }

  const sections: FormSectionDef[] = []

  // Heuristic-driven fields get their own section (user reviews auto-detected values)
  if (heuristicFields.length > 0) {
    sections.push({
      title: 'Auto-Detected Settings',
      description: 'Review values detected from input data',
      fields: heuristicFields
    })
  }

  // Configuration fields (enums, numbers, booleans, strings)
  if (configFields.length > 0) {
    sections.push({
      title: 'Options',
      fields: configFields
    })
  }

  // Path/directory fields
  if (pathFields.length > 0) {
    sections.push({
      title: 'Output',
      description: 'Choose where to save results',
      fields: pathFields
    })
  }

  // If everything ended up in one section, simplify the title
  if (sections.length === 1) {
    sections[0].title = 'Configure'
    sections[0].description = definition.description
  }

  return { sections, extraContextFields }
}
