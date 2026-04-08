import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type { ToolDefinition, WorkflowDefinition, HeuristicDefinition } from '../../common/workflowTypes.js'
import { registerHeuristic } from './heuristicRegistry.js'
import { createDeclarativeHeuristic } from './declarativeHeuristic.js'
import { registerToolExecutor } from './toolRegistry.js'
import { createDeclarativeToolExecutor } from './declarativeToolExecutor.js'

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
    workflowDefinitions.set(wf.name, wf)
    builtInWorkflowNames.add(wf.name)
  }

  // Load user workflows from app data directory
  const userDir = getUserWorkflowsDir()
  if (fs.existsSync(userDir)) {
    const userWorkflows = loadJsonFiles<WorkflowDefinition>(userDir)
    for (const wf of userWorkflows) {
      workflowDefinitions.set(wf.name, wf)
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
    workflowDefinitions.set(wf.name, wf)
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
  workflowDefinitions.set(definition.name, definition)
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
