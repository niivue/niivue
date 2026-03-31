// ── JSON schema mirrors ──────────────────────────────────────────────

export interface ToolParameterDef {
  type: string
  description: string
  optional?: boolean
  default?: unknown
  enum?: unknown[]
  min?: number
  max?: number
}

export interface ToolDefinition {
  name: string
  version: string
  description: string
  inputs: Record<string, ToolParameterDef>
  outputs: Record<string, ToolParameterDef>
  exec?: ToolExecDef
}

// ── Declarative tool executor definition ─────────────────────────────

export interface BinaryDef {
  /** Human-readable name for error messages */
  name: string
  /** Dev-mode paths relative to project root, keyed by process.platform */
  paths: Record<string, string>
  /** Packaged-app paths relative to process.resourcesPath */
  packagedPaths: Record<string, string>
}

export interface OutputDirDef {
  /** Input name that may supply the output directory */
  input?: string
  /** If the input is absent, create a temp dir with this prefix */
  tempPrefix?: string
}

export interface OutputFileDef {
  /** Template for the output filename, e.g. "{{inputBasename}}_brain.nii.gz" */
  template: string
  /** Extensions to strip from the input basename before applying the template */
  stripExtensions?: string[]
}

export type ArgDef =
  | { input: string; flag?: string; default?: unknown }
  | { value: string; flag?: string }

export type OutputCollectDef =
  | { collect: 'outputFiles' }
  | { collect: 'glob'; pattern: string }
  | { value: string }
  | { fromStdout: true }
  | { fromStderr: true }

export interface ToolExecDef {
  binary: BinaryDef
  outputDir?: OutputDirDef
  resources?: Record<string, { standardImage: string }>
  /** Input name containing an array to iterate over */
  forEach?: string
  /** Single-item input name bound on each iteration */
  iterationVar?: string
  /** Run iterations in parallel (default false) */
  parallel?: boolean
  outputFile?: OutputFileDef
  args: ArgDef[]
  /** Acceptable exit codes (default [0]) */
  exitCodes?: number[]
  outputs: Record<string, OutputCollectDef>
  /** Name of a registered post-processor function */
  postProcess?: string
}

export interface ContextFieldDef {
  type: string
  label?: string
  description: string
  heuristic?: string
  default?: unknown
  enum?: unknown[]
  min?: number
  max?: number
}

export interface FormSectionDef {
  title: string
  description?: string
  fields: string[]
  component?: string
  buttonText?: string
}

export type Binding = { ref: string } | { constant: unknown }

export interface StepDef {
  tool: string
  inputs: Record<string, Binding>
  outputMappings?: Record<string, string>
  condition?: string
}

export interface WorkflowDefinition {
  name: string
  version: string
  description: string
  menu: 'Import' | 'Processing' | 'Export'
  inputs: Record<string, { type: string; description: string }>
  context?: {
    description?: string
    fields: Record<string, ContextFieldDef>
  }
  form?: {
    sections: FormSectionDef[]
  }
  steps: Record<string, StepDef>
  outputs: Record<string, { type: string; ref: string }>
}

// ── Runtime types ────────────────────────────────────────────────────

export type WorkflowRunStatus =
  | 'idle'
  | 'running'
  | 'paused-for-form'
  | 'completed'
  | 'error'

export interface WorkflowRunState {
  workflowName: string
  inputs: Record<string, unknown>
  context: Record<string, unknown>
  stepOutputs: Record<string, Record<string, unknown>>
  status: WorkflowRunStatus
  error?: string
}

export type ToolExecutor = (
  inputs: Record<string, unknown>
) => Promise<Record<string, unknown>>

export type HeuristicFn = (
  inputs: Record<string, unknown>,
  context: Record<string, unknown>
) => Promise<unknown>

// ── Declarative heuristic definition ──────────────────────────────

export interface HeuristicOperation {
  op: string
  field?: string
  operator?: string
  value?: unknown
  fields?: string[]
  order?: 'asc' | 'desc'
  contextField?: string
  targetField?: string
  template?: string
  description?: string
}

export interface HeuristicDefinition {
  name: string
  version: string
  description: string
  preserveExisting?: boolean
  source: string
  operations: HeuristicOperation[]
  output: string
}

// ── Workflow list item (sent to renderer) ────────────────────────────

export interface WorkflowListItem {
  name: string
  description: string
  menu: string
}
