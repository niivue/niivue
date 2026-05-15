#!/usr/bin/env node
// Workflow integrity audit — read tool/workflow JSON, run four audit
// dimensions, write `audit-report.md`, exit non-zero on BROKEN findings.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = path.resolve(__dirname, '..')
const WORKFLOWS_ROOT = path.join(PACKAGE_ROOT, 'workflows')
const TOOLS_DIR = path.join(WORKFLOWS_ROOT, 'tools')
const WF_DIR = path.join(WORKFLOWS_ROOT, 'workflows')
const HEUR_DIR = path.join(WORKFLOWS_ROOT, 'heuristics')
const COMPONENT_REGISTRY_FILE = path.join(
  PACKAGE_ROOT,
  'src/renderer/src/components/WorkflowDialog.tsx'
)
const HEURISTIC_REGISTRY_FILE = path.join(
  PACKAGE_ROOT,
  'src/main/utils/heuristicRegistry.ts'
)
const TOOL_REGISTRY_FILE = path.join(
  PACKAGE_ROOT,
  'src/main/utils/toolRegistry.ts'
)
const REPORT_FILE = path.join(PACKAGE_ROOT, 'audit-report.md')

// Mirrors typeCompatibility.ts — kept in sync manually to avoid TS bootstrap.
const COERCION_RULES = {
  volume: ['string'],
  'volume[]': ['string[]'],
  'json[]': ['string[]'],
  string: ['directory'],
  directory: ['string'],
  mask: ['volume', 'string']
}

function isTypeCompatible(outputType, inputType) {
  if (outputType === inputType) return true
  const allowed = COERCION_RULES[outputType]
  if (allowed && allowed.includes(inputType)) return true
  const outElem = outputType.endsWith('[]') ? outputType.slice(0, -2) : null
  const inElem = inputType.endsWith('[]') ? inputType.slice(0, -2) : null
  if (outElem && inElem) return isTypeCompatible(outElem, inElem)
  return false
}

function loadJsonDir(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({
      file: f,
      data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))
    }))
}

function blocksOf(tool) {
  if (!tool.block) return []
  return Array.isArray(tool.block) ? tool.block : [tool.block]
}

function readComponentRegistry() {
  if (!fs.existsSync(COMPONENT_REGISTRY_FILE)) return new Set()
  const src = fs.readFileSync(COMPONENT_REGISTRY_FILE, 'utf-8')
  const start = src.indexOf('COMPONENT_REGISTRY')
  if (start < 0) return new Set()
  const open = src.indexOf('{', start)
  const close = src.indexOf('}', open)
  if (open < 0 || close < 0) return new Set()
  const body = src.slice(open + 1, close)
  const ids = new Set()
  for (const m of body.matchAll(/['"]([a-z0-9-]+)['"]\s*:/g)) ids.add(m[1])
  return ids
}

function readCodeHeuristicNames() {
  if (!fs.existsSync(HEURISTIC_REGISTRY_FILE)) return new Set()
  const src = fs.readFileSync(HEURISTIC_REGISTRY_FILE, 'utf-8')
  const start = src.indexOf('new Map<string, HeuristicFn>')
  if (start < 0) return new Set()
  const open = src.indexOf('[', start)
  const close = src.indexOf('])', open)
  if (open < 0 || close < 0) return new Set()
  const body = src.slice(open, close)
  const names = new Set()
  for (const m of body.matchAll(/\[\s*['"]([a-z0-9-]+)['"]/g)) names.add(m[1])
  return names
}

/**
 * Names of tools with a hand-coded main-side executor (i.e. registered in
 * the initial `toolExecutors` Map of `toolRegistry.ts`). Found by regex —
 * we deliberately don't import the TS at audit time so the script stays
 * dependency-free.
 */
function readCodeToolExecutorNames() {
  if (!fs.existsSync(TOOL_REGISTRY_FILE)) return new Set()
  const src = fs.readFileSync(TOOL_REGISTRY_FILE, 'utf-8')
  const start = src.indexOf('new Map<string, ToolExecutor>')
  if (start < 0) return new Set()
  const open = src.indexOf('[', start)
  const close = src.indexOf('])', open)
  if (open < 0 || close < 0) return new Set()
  const body = src.slice(open, close)
  const names = new Set()
  for (const m of body.matchAll(/\[\s*['"]([a-z0-9-]+)['"]/g)) names.add(m[1])
  return names
}

// ── Audit dimensions ────────────────────────────────────────────────

function auditTools(tools) {
  const findings = []
  const seen = new Map()
  for (const { file, data } of tools) {
    if (!data.name) {
      findings.push({ severity: 'BROKEN', area: 'tool', file, msg: 'missing tool.name' })
      continue
    }
    if (seen.has(data.name)) {
      findings.push({
        severity: 'BROKEN',
        area: 'tool',
        file,
        msg: `duplicate tool name '${data.name}' (also in ${seen.get(data.name)})`
      })
    } else {
      seen.set(data.name, file)
    }
    if (!data.inputs || typeof data.inputs !== 'object') {
      findings.push({ severity: 'WARN', area: 'tool', file, msg: 'no inputs declared' })
    }
    if (!data.outputs || typeof data.outputs !== 'object') {
      findings.push({ severity: 'WARN', area: 'tool', file, msg: 'no outputs declared' })
    }
  }
  return findings
}

function auditBlocks(tools, componentIds) {
  const findings = []
  for (const { file, data } of tools) {
    const declaredInputs = new Set(Object.keys(data.inputs ?? {}))
    for (const block of blocksOf(data)) {
      if (!block.id) {
        findings.push({ severity: 'BROKEN', area: 'block', file, msg: `${data.name}: block missing id` })
        continue
      }
      const where = `${data.name}/${block.id}`
      for (const f of block.exposedFields ?? []) {
        if (!declaredInputs.has(f) && !(block.contextFields && f in block.contextFields)) {
          // Could be a context-only field (heuristic output etc.). WARN, not BROKEN.
          findings.push({
            severity: 'INFO',
            area: 'block',
            file,
            msg: `${where}: exposedFields '${f}' is not a declared tool input (likely a context field)`
          })
        }
      }
      for (const f of block.hiddenFields ?? []) {
        if (!declaredInputs.has(f)) {
          findings.push({
            severity: 'BROKEN',
            area: 'block',
            file,
            msg: `${where}: hiddenFields '${f}' is not a declared tool input`
          })
        }
      }
      if (block.formComponent && !componentIds.has(block.formComponent)) {
        findings.push({
          severity: 'BROKEN',
          area: 'block',
          file,
          msg: `${where}: formComponent '${block.formComponent}' not registered in COMPONENT_REGISTRY`
        })
      }
    }
  }
  return findings
}

/**
 * Every tool referenced by a step must have either an `exec` block in its
 * JSON (declarative executor created at load time) or be in the code-side
 * registry. Catches the class of bug where a renderer-only tool gets dropped
 * into a workflow step and fails at runtime with `No executor for tool: …`.
 */
function auditExecutors(workflows, toolMap, codeExecutorNames) {
  const findings = []
  const declarativeNames = new Set()
  for (const tool of toolMap.values()) {
    if (tool.exec) declarativeNames.add(tool.name)
  }
  for (const { file, data } of workflows) {
    const wfName = data.name || file
    for (const [stepName, step] of Object.entries(data.steps ?? {})) {
      const tool = toolMap.get(step.tool)
      if (!tool) continue // already flagged by auditWorkflows
      const hasExec = declarativeNames.has(tool.name) || codeExecutorNames.has(tool.name)
      if (!hasExec) {
        findings.push({
          severity: 'BROKEN',
          area: 'workflow',
          file,
          msg: `${wfName}/${stepName}: tool '${tool.name}' has no executor (no exec block, not in toolRegistry's initial map)`
        })
      }
    }
  }
  return findings
}

function auditWorkflows(workflows, toolMap, heuristicNames) {
  const findings = []
  for (const { file, data } of workflows) {
    const wf = data
    const wfName = wf.name || file
    const ctxFields = new Set(Object.keys(wf.context?.fields ?? {}))
    const stepOutputs = new Map() // stepName -> Set(outputName)

    if (!wf.steps || typeof wf.steps !== 'object') {
      findings.push({ severity: 'WARN', area: 'workflow', file, msg: `${wfName}: no steps` })
      continue
    }

    // First pass: collect step → outputs
    for (const [stepName, step] of Object.entries(wf.steps)) {
      const tool = toolMap.get(step.tool)
      if (!tool) continue
      stepOutputs.set(stepName, new Set(Object.keys(tool.outputs ?? {})))
    }

    for (const [stepName, step] of Object.entries(wf.steps)) {
      const where = `${wfName}/${stepName}`
      const tool = toolMap.get(step.tool)
      if (!tool) {
        findings.push({
          severity: 'BROKEN',
          area: 'workflow',
          file,
          msg: `${where}: tool '${step.tool}' not found`
        })
        continue
      }
      const declared = tool.inputs ?? {}

      // Required-input completeness
      for (const [name, def] of Object.entries(declared)) {
        if (def.optional) continue
        if (def.default !== undefined) continue
        if (step.inputs && step.inputs[name] != null) continue
        // forEach companion: if this is the singular companion and the array is bound, ok.
        const arrName = name + 's'
        if (declared[arrName] && step.inputs && step.inputs[arrName] != null) continue
        findings.push({
          severity: 'WARN',
          area: 'workflow',
          file,
          msg: `${where}: required input '${name}' (${def.type}) is not bound`
        })
      }

      // Step input keys must be declared inputs
      for (const [name, binding] of Object.entries(step.inputs ?? {})) {
        if (!(name in declared)) {
          findings.push({
            severity: 'BROKEN',
            area: 'workflow',
            file,
            msg: `${where}: input '${name}' is not a declared input on tool '${tool.name}'`
          })
          continue
        }
        // Resolve refs
        if (binding && typeof binding === 'object' && 'ref' in binding) {
          const ref = binding.ref
          if (typeof ref !== 'string') continue
          if (ref.startsWith('context.')) {
            const fieldName = ref.slice('context.'.length)
            if (fieldName === '') continue // bare 'context'
            if (!ctxFields.has(fieldName)) {
              findings.push({
                severity: 'BROKEN',
                area: 'workflow',
                file,
                msg: `${where}: input '${name}' references missing context field '${fieldName}'`
              })
            } else {
              // Type check (forEach inputs accept arrays at runtime)
              const ctxType = wf.context?.fields?.[fieldName]?.type
              const inputType = declared[name].type
              const isForEach = tool.exec?.forEach === name
              if (
                ctxType &&
                !isTypeCompatible(ctxType, inputType) &&
                !(isForEach && ctxType.endsWith('[]'))
              ) {
                findings.push({
                  severity: 'WARN',
                  area: 'workflow',
                  file,
                  msg: `${where}: input '${name}' (${inputType}) wired from context.${fieldName} (${ctxType}) — incompatible`
                })
              }
            }
          } else if (ref.startsWith('steps.')) {
            const m = ref.match(/^steps\.([^.]+)\.outputs\.([^.]+)$/)
            if (!m) continue
            const [, srcStep, srcOutput] = m
            const outs = stepOutputs.get(srcStep)
            if (!outs) {
              findings.push({
                severity: 'BROKEN',
                area: 'workflow',
                file,
                msg: `${where}: input '${name}' references unknown step '${srcStep}'`
              })
            } else if (!outs.has(srcOutput)) {
              findings.push({
                severity: 'BROKEN',
                area: 'workflow',
                file,
                msg: `${where}: input '${name}' references unknown output '${srcOutput}' on step '${srcStep}'`
              })
            } else {
              const srcTool = toolMap.get(wf.steps[srcStep].tool)
              const srcType = srcTool?.outputs?.[srcOutput]?.type
              const inputType = declared[name].type
              const isForEach = tool.exec?.forEach === name
              if (
                srcType &&
                !isTypeCompatible(srcType, inputType) &&
                !(isForEach && srcType.endsWith('[]'))
              ) {
                findings.push({
                  severity: 'WARN',
                  area: 'workflow',
                  file,
                  msg: `${where}: input '${name}' (${inputType}) wired from ${srcStep}.${srcOutput} (${srcType}) — incompatible`
                })
              }
            }
          }
        }
      }
    }

    // Heuristics referenced by context fields must exist
    for (const [fieldName, def] of Object.entries(wf.context?.fields ?? {})) {
      if (def.heuristic && !heuristicNames.has(def.heuristic)) {
        findings.push({
          severity: 'BROKEN',
          area: 'workflow',
          file,
          msg: `${wfName}: context field '${fieldName}' uses unknown heuristic '${def.heuristic}'`
        })
      }
    }
  }
  return findings
}

// ── Main ────────────────────────────────────────────────────────────

function main() {
  const tools = loadJsonDir(TOOLS_DIR)
  const workflows = loadJsonDir(WF_DIR)
  const heuristicJsons = loadJsonDir(HEUR_DIR)
  const toolMap = new Map(tools.map(({ data }) => [data.name, data]))

  const componentIds = readComponentRegistry()
  const codeHeur = readCodeHeuristicNames()
  const codeExecutors = readCodeToolExecutorNames()
  const heuristicNames = new Set([
    ...codeHeur,
    ...heuristicJsons.map(({ data }) => data.name)
  ])

  const findings = [
    ...auditTools(tools),
    ...auditBlocks(tools, componentIds),
    ...auditWorkflows(workflows, toolMap, heuristicNames),
    ...auditExecutors(workflows, toolMap, codeExecutors)
  ]

  const broken = findings.filter((f) => f.severity === 'BROKEN')
  const warn = findings.filter((f) => f.severity === 'WARN')
  const info = findings.filter((f) => f.severity === 'INFO')

  const lines = []
  lines.push('# Workflow Audit Report', '')
  lines.push(`- Tools loaded: **${tools.length}**`)
  lines.push(`- Workflows loaded: **${workflows.length}**`)
  lines.push(`- Component IDs in COMPONENT_REGISTRY: **${componentIds.size}**`)
  lines.push(`- Heuristics known: **${heuristicNames.size}** (code: ${codeHeur.size}, declarative: ${heuristicJsons.length})`)
  lines.push(`- Tool executors known: **${codeExecutors.size + tools.filter(({ data }) => data.exec).length}** (code: ${codeExecutors.size}, declarative: ${tools.filter(({ data }) => data.exec).length})`)
  lines.push('')
  lines.push(`- BROKEN: **${broken.length}**, WARN: **${warn.length}**, INFO: **${info.length}**`)
  lines.push('')

  for (const [label, group] of [
    ['BROKEN', broken],
    ['WARN', warn],
    ['INFO', info]
  ]) {
    if (group.length === 0) continue
    lines.push(`## ${label}`, '')
    for (const f of group) {
      lines.push(`- [${f.area}] ${f.file}: ${f.msg}`)
    }
    lines.push('')
  }
  if (broken.length === 0 && warn.length === 0) {
    lines.push('✅ No issues found.')
  }

  fs.writeFileSync(REPORT_FILE, lines.join('\n'))
  process.stdout.write(`\nWrote ${REPORT_FILE}\n`)
  process.stdout.write(
    `BROKEN: ${broken.length}, WARN: ${warn.length}, INFO: ${info.length}\n`
  )

  if (broken.length > 0) {
    for (const f of broken) {
      process.stderr.write(`BROKEN [${f.area}] ${f.file}: ${f.msg}\n`)
    }
    process.exit(1)
  }
}

main()
