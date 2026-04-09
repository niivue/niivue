import {
  startWorkflow,
  runAutoSteps,
  runHeuristic,
  executeAllSteps,
  updateContext,
  getRunState,
  runReadySteps
} from './workflowEngine.js'
import { getWorkflowDefinitions, getToolDefinitions } from './workflowLoader.js'
import { validateRequiredInputs } from '../../common/workflowValidator.js'

export interface HeadlessWorkflowOptions {
  workflowName: string
  inputs: Record<string, unknown>
  contextOverrides?: Record<string, unknown>
  onProgress?: (step: string, status: string) => void
}

export async function runWorkflowHeadless(opts: HeadlessWorkflowOptions): Promise<{
  outputs: Record<string, unknown>
  context: Record<string, unknown>
}> {
  const definition = getWorkflowDefinitions().get(opts.workflowName)
  if (!definition) {
    throw new Error(`Unknown workflow: ${opts.workflowName}`)
  }

  opts.onProgress?.('init', 'starting')
  const { runId } = startWorkflow(opts.workflowName, opts.inputs)

  // Apply context overrides early so that steps depending on context values
  // (e.g. context.dicom_dir in user-created workflows) can be resolved.
  if (opts.contextOverrides) {
    for (const [key, value] of Object.entries(opts.contextOverrides)) {
      updateContext(runId, key, value)
    }
  }

  // Run auto steps (steps that don't depend on context/form)
  opts.onProgress?.('auto-steps', 'running')
  await runAutoSteps(runId)

  // Run any additional steps whose context dependencies are now satisfied
  // (e.g. convert step that depends on context.dicom_dir after overrides)
  opts.onProgress?.('ready-steps', 'running')
  let readySteps: string[] = []
  do {
    readySteps = await runReadySteps(runId)
  } while (readySteps.length > 0)

  // Run all heuristics to auto-populate context fields
  if (definition.context?.fields) {
    for (const [fieldName, fieldDef] of Object.entries(definition.context.fields)) {
      if (fieldDef.heuristic) {
        opts.onProgress?.(fieldName, 'running-heuristic')
        await runHeuristic(runId, fieldName)
      }
    }
  }

  // Re-apply context overrides after heuristics so caller values take precedence
  if (opts.contextOverrides) {
    for (const [key, value] of Object.entries(opts.contextOverrides)) {
      updateContext(runId, key, value)
    }
  }

  // Validate that all required inputs are satisfied
  const state = getRunState(runId)
  if (state) {
    const toolsMap = getToolDefinitions()
    const missing = validateRequiredInputs(
      definition,
      state.context,
      state.inputs,
      state.stepOutputs,
      toolsMap
    )
    if (missing.length > 0) {
      const details = missing.map(
        (m) => `  - Step "${m.stepName}", input "${m.inputName}" (${m.type}): ${m.description}`
      ).join('\n')
      throw new Error(`Missing required inputs:\n${details}`)
    }
  }

  // Execute all remaining steps
  opts.onProgress?.('steps', 'executing')
  const outputs = await executeAllSteps(runId)

  const finalState = getRunState(runId)
  return {
    outputs,
    context: finalState?.context ?? {}
  }
}
