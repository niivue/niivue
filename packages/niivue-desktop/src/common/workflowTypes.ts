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
}

export interface ContextFieldDef {
  type: string
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

// ── Workflow list item (sent to renderer) ────────────────────────────

export interface WorkflowListItem {
  name: string
  description: string
  menu: string
}
