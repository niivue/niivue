import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type { ToolDefinition, WorkflowDefinition } from '../../common/workflowTypes.js'

const isDev = !app.isPackaged

const toolDefinitions = new Map<string, ToolDefinition>()
const workflowDefinitions = new Map<string, WorkflowDefinition>()

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

export function loadAllDefinitions(): void {
  const root = getWorkflowsRoot()

  const tools = loadJsonFiles<ToolDefinition>(path.join(root, 'tools'))
  for (const tool of tools) {
    toolDefinitions.set(tool.name, tool)
  }

  const workflows = loadJsonFiles<WorkflowDefinition>(path.join(root, 'workflows'))
  for (const wf of workflows) {
    workflowDefinitions.set(wf.name, wf)
  }

  console.log(
    `[workflow] Loaded ${toolDefinitions.size} tools, ${workflowDefinitions.size} workflows`
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

  const workflows = loadJsonFiles<WorkflowDefinition>(path.join(rootDir, 'workflows'))
  for (const wf of workflows) {
    workflowDefinitions.set(wf.name, wf)
  }

  console.log(
    `[workflow] Loaded ${toolDefinitions.size} tools, ${workflowDefinitions.size} workflows from ${rootDir}`
  )
}

export function getToolDefinitions(): Map<string, ToolDefinition> {
  return toolDefinitions
}

export function getWorkflowDefinitions(): Map<string, WorkflowDefinition> {
  return workflowDefinitions
}
