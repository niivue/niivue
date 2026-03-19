import { dialog, ipcMain } from 'electron'
import { getWorkflowDefinitions } from './workflowLoader.js'
import {
  startWorkflow,
  getRunState,
  getDefinitionForRun,
  getAutoRunnableSteps,
  runHeuristic,
  updateContext,
  executeStep,
  executeAllSteps,
  runAutoSteps,
  cancelRun
} from './workflowEngine.js'
import type { WorkflowListItem } from '../../common/workflowTypes.js'

export function registerWorkflowIpcHandlers(): void {
  ipcMain.handle('workflow:list', async () => {
    const workflows = getWorkflowDefinitions()
    const items: WorkflowListItem[] = []
    for (const wf of workflows.values()) {
      items.push({
        name: wf.name,
        description: wf.description,
        menu: wf.menu
      })
    }
    return items
  })

  ipcMain.handle('workflow:get-definition', async (_evt, name: string) => {
    const wf = getWorkflowDefinitions().get(name)
    if (!wf) throw new Error(`Unknown workflow: ${name}`)
    return wf
  })

  ipcMain.handle(
    'workflow:start',
    async (_evt, payload: { name: string; inputs: Record<string, unknown> }) => {
      const { runId, runState, definition } = startWorkflow(
        payload.name,
        payload.inputs
      )
      const autoSteps = getAutoRunnableSteps(definition)
      return { runId, runState, definition, autoSteps }
    }
  )

  ipcMain.handle(
    'workflow:run-auto-steps',
    async (_evt, payload: { runId: string }) => {
      const executed = await runAutoSteps(payload.runId)
      const state = getRunState(payload.runId)
      return { executed, runState: state }
    }
  )

  ipcMain.handle(
    'workflow:run-heuristic',
    async (_evt, payload: { runId: string; fieldName: string }) => {
      const value = await runHeuristic(payload.runId, payload.fieldName)
      const state = getRunState(payload.runId)
      return { value, context: state?.context }
    }
  )

  ipcMain.handle(
    'workflow:update-context',
    async (
      _evt,
      payload: { runId: string; fieldName: string; value: unknown }
    ) => {
      updateContext(payload.runId, payload.fieldName, payload.value)
      const state = getRunState(payload.runId)
      return { context: state?.context }
    }
  )

  ipcMain.handle(
    'workflow:execute-step',
    async (_evt, payload: { runId: string; stepName: string }) => {
      const outputs = await executeStep(payload.runId, payload.stepName)
      const state = getRunState(payload.runId)
      return { outputs, runState: state }
    }
  )

  ipcMain.handle('workflow:execute-all', async (_evt, payload: { runId: string }) => {
    const outputs = await executeAllSteps(payload.runId)
    const state = getRunState(payload.runId)
    return { outputs, runState: state }
  })

  ipcMain.handle('workflow:cancel', async (_evt, payload: { runId: string }) => {
    cancelRun(payload.runId)
    return { success: true }
  })

  ipcMain.handle('workflow:get-state', async (_evt, payload: { runId: string }) => {
    const state = getRunState(payload.runId)
    const definition = getDefinitionForRun(payload.runId)
    return { runState: state, definition }
  })

  ipcMain.handle('workflow:select-directory', async (_evt, payload: { title?: string }) => {
    const result = await dialog.showOpenDialog({
      title: payload?.title || 'Select Directory',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })
}
