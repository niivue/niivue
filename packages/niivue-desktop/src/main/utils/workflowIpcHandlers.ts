import fs from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { getWorkflowDefinitions, getToolDefinitions, getHeuristicDefinitions, isBuiltInWorkflow, saveUserWorkflow, deleteUserWorkflow } from './workflowLoader.js'
import { refreshMenu } from './menu.js'
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
  runReadySteps,
  cancelRun
} from './workflowEngine.js'
import { getHeuristicNames, registerHeuristic } from './heuristicRegistry.js'
import { createDeclarativeHeuristic } from './declarativeHeuristic.js'
import type { WorkflowListItem, WorkflowDefinition, HeuristicDefinition } from '../../common/workflowTypes.js'

export function registerWorkflowIpcHandlers(): void {
  ipcMain.handle('workflow:list', async () => {
    const workflows = getWorkflowDefinitions()
    const items: WorkflowListItem[] = []
    for (const wf of workflows.values()) {
      items.push({
        name: wf.name,
        description: wf.description,
        menu: wf.menu,
        userCreated: !isBuiltInWorkflow(wf.name)
      })
    }
    return items
  })

  ipcMain.handle('workflow:save', async (_evt, definition: WorkflowDefinition) => {
    if (!definition.name || definition.name.trim() === '') {
      throw new Error('Workflow name is required')
    }
    if (isBuiltInWorkflow(definition.name)) {
      throw new Error(`Cannot overwrite built-in workflow "${definition.name}". Choose a different name.`)
    }
    const filePath = saveUserWorkflow(definition)
    refreshMenu()
    return { success: true, path: filePath }
  })

  ipcMain.handle('workflow:delete', async (_evt, name: string) => {
    const success = deleteUserWorkflow(name)
    if (!success) {
      throw new Error(`Cannot delete built-in workflow "${name}"`)
    }
    refreshMenu()
    return { success: true }
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

  ipcMain.handle('workflow:run-ready-steps', async (_evt, payload: { runId: string; maxStepIndex?: number }) => {
    const executed = await runReadySteps(payload.runId, payload.maxStepIndex ?? -1)
    const state = getRunState(payload.runId)
    return { executed, runState: state }
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

  ipcMain.handle('workflow:list-tools', async () => {
    const tools = getToolDefinitions()
    return Array.from(tools.values())
  })

  ipcMain.handle('workflow:list-heuristics', async () => {
    return getHeuristicNames()
  })

  ipcMain.handle('workflow:list-heuristic-definitions', async () => {
    const defs = getHeuristicDefinitions()
    return Array.from(defs.values())
  })

  ipcMain.handle('workflow:get-heuristic-definition', async (_evt, name: string) => {
    const defs = getHeuristicDefinitions()
    return defs.get(name) ?? null
  })

  ipcMain.handle('workflow:save-heuristic', async (_evt, definition: HeuristicDefinition) => {
    // Write to the heuristics directory
    const isDev = !app.isPackaged
    const root = isDev
      ? path.resolve(__dirname, '..', '..', 'workflows')
      : path.join(process.resourcesPath, 'workflows')
    const heuristicsDir = path.join(root, 'heuristics')
    if (!fs.existsSync(heuristicsDir)) {
      fs.mkdirSync(heuristicsDir, { recursive: true })
    }
    const filePath = path.join(heuristicsDir, `${definition.name}.heuristic.json`)
    fs.writeFileSync(filePath, JSON.stringify(definition, null, 2))

    // Register/update the heuristic in the runtime registry
    const defs = getHeuristicDefinitions()
    defs.set(definition.name, definition)
    registerHeuristic(definition.name, createDeclarativeHeuristic(definition))

    return { success: true, path: filePath }
  })

  ipcMain.handle('workflow:select-directory', async (evt, payload: { title?: string }) => {
    const win = BrowserWindow.fromWebContents(evt.sender)
    const title = payload?.title || 'Select Directory'

    // Select an existing directory only — no folder creation
    const options: Electron.OpenDialogOptions = {
      title,
      properties: ['openDirectory']
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })
}
