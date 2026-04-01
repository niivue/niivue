/**
 * Engine for executing declarative tool definitions (.tool.json with an `exec` section).
 * Interprets the exec spec to resolve binaries, build CLI args, spawn processes,
 * and collect outputs — without requiring hand-coded TypeScript executors.
 *
 * Mirrors the pattern of declarativeHeuristic.ts for heuristics.
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { app } from 'electron'
import type { ToolDefinition, ToolExecutor, ToolExecDef, ArgDef, OutputCollectDef } from '../../common/workflowTypes.js'
import { spawnBinary } from './spawnBinary.js'
import { getStandardImagePath } from './inputResolver.js'
import { getPostProcessor } from './toolRegistry.js'

const isDev = !app.isPackaged

// ── Template interpolation ──────────────────────────────────────────

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, key) => {
    // Support dotted paths like "resources.templatePath"
    const parts = key.split('.')
    let current: Record<string, string> | string = vars
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return ''
      current = (current as Record<string, unknown>)[part] as Record<string, string> | string
    }
    return typeof current === 'string' ? current : ''
  })
}

// ── Binary resolution ───────────────────────────────────────────────

function resolveBinaryPath(exec: ToolExecDef): string {
  const platform = process.platform
  let binPath: string

  if (isDev) {
    const relativePath = exec.binary.paths[platform]
    if (!relativePath) {
      throw new Error(`${exec.binary.name}: no dev binary path for platform ${platform}`)
    }
    const devRoot = path.resolve(__dirname, '../../')
    binPath = path.resolve(devRoot, relativePath)
  } else {
    const relativePath = exec.binary.packagedPaths[platform]
    if (!relativePath) {
      throw new Error(`${exec.binary.name}: no packaged binary path for platform ${platform}`)
    }
    binPath = path.join(process.resourcesPath, relativePath)
  }

  if (!fs.existsSync(binPath)) {
    throw new Error(`${exec.binary.name} not found at ${binPath}`)
  }

  return binPath
}

// ── Resource resolution ─────────────────────────────────────────────

function resolveResources(exec: ToolExecDef): Record<string, string> {
  const resolved: Record<string, string> = {}
  if (!exec.resources) return resolved

  for (const [key, def] of Object.entries(exec.resources)) {
    const imgPath = getStandardImagePath(def.standardImage)
    if (!fs.existsSync(imgPath)) {
      throw new Error(`Standard image '${def.standardImage}' not found at ${imgPath}`)
    }
    resolved[key] = imgPath
  }

  return resolved
}

// ── Output directory ────────────────────────────────────────────────

function resolveOutputDir(
  exec: ToolExecDef,
  inputs: Record<string, unknown>
): string {
  if (!exec.outputDir) {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'wf-tool-'))
  }

  const fromInput = exec.outputDir.input
    ? (inputs[exec.outputDir.input] as string | undefined)
    : undefined

  // Resolve to absolute path to prevent path traversal
  const outDir = fromInput
    ? path.resolve(fromInput)
    : fs.mkdtempSync(path.join(os.tmpdir(), exec.outputDir.tempPrefix || 'wf-tool-'))

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  return outDir
}

// ── Arg building ────────────────────────────────────────────────────

function buildArgs(
  argDefs: ArgDef[],
  inputs: Record<string, unknown>,
  templateVars: Record<string, string>
): string[] {
  const args: string[] = []

  for (const def of argDefs) {
    if ('input' in def && !('value' in def)) {
      // Input-based arg
      let val = inputs[def.input]
      if (val == null && def.default != null) {
        val = def.default
      }
      if (val == null) continue // omit when absent

      if (def.flag) {
        args.push(def.flag, String(val))
      } else {
        args.push(String(val))
      }
    } else if ('value' in def) {
      // Literal or template value
      const resolved = interpolate((def as { value: string }).value, templateVars)
      if (def.flag) {
        args.push(def.flag, resolved)
      } else {
        args.push(resolved)
      }
    }
  }

  return args
}

// ── Output file naming ──────────────────────────────────────────────

function resolveOutputFile(
  exec: ToolExecDef,
  inputPath: string,
  outDir: string,
  templateVars: Record<string, string>
): string {
  if (!exec.outputFile) {
    // Default: same basename in output dir
    return path.join(outDir, path.basename(inputPath))
  }

  let basename = path.basename(inputPath)
  if (exec.outputFile.stripExtensions) {
    for (const ext of exec.outputFile.stripExtensions) {
      if (basename.endsWith(ext) && ext.length < basename.length) {
        basename = basename.slice(0, -ext.length)
        break
      }
    }
  }

  const vars = { ...templateVars, inputBasename: basename }
  const filename = interpolate(exec.outputFile.template, vars)
  return path.join(outDir, filename)
}

// ── Output collection ───────────────────────────────────────────────

function collectOutputs(
  outputDefs: Record<string, OutputCollectDef>,
  templateVars: Record<string, string>,
  outputFiles: string[],
  outDir: string,
  stdout: string,
  stderr: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, def] of Object.entries(outputDefs)) {
    if ('collect' in def) {
      if (def.collect === 'outputFiles') {
        result[key] = outputFiles
      } else if (def.collect === 'glob') {
        const pattern = def.pattern
        const files = fs.existsSync(outDir)
          ? fs.readdirSync(outDir).filter((f) => matchGlob(f, pattern))
          : []
        result[key] = files.map((f) => path.join(outDir, f))
      }
    } else if ('value' in def) {
      result[key] = interpolate(def.value, templateVars)
    } else if ('fromStdout' in def) {
      result[key] = stdout
    } else if ('fromStderr' in def) {
      result[key] = stderr
    }
  }

  return result
}

/**
 * Minimal glob matcher supporting * and {a,b} patterns.
 * Handles patterns like "*.nii.gz", "*.nii{,.gz}", "*.json".
 */
function matchGlob(filename: string, pattern: string): boolean {
  // Expand {a,b} alternatives into multiple patterns
  const braceMatch = /\{([^}]+)\}/.exec(pattern)
  if (braceMatch) {
    const alternatives = braceMatch[1].split(',')
    const prefix = pattern.slice(0, braceMatch.index)
    const suffix = pattern.slice(braceMatch.index + braceMatch[0].length)
    return alternatives.some((alt) => {
      // Escape the alternative to prevent regex injection (e.g. [0-9] in brace content)
      const safeAlt = alt.replace(/[.+^${}()|[\]\\]/g, '\\$&')
      // Rebuild as a flat pattern with the alternative already escaped, then match
      // We need to convert prefix/suffix globs separately
      const prefixRegex = prefix.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')
      const suffixRegex = suffix.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')
      return new RegExp('^' + prefixRegex + safeAlt + suffixRegex + '$').test(filename)
    })
  }

  // Convert glob to regex: * → [^/]*, escape everything else
  const regex = new RegExp(
    '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$'
  )
  return regex.test(filename)
}

// ── Main factory ────────────────────────────────────────────────────

/**
 * Create a ToolExecutor from a declarative ToolDefinition with an `exec` section.
 */
export function createDeclarativeToolExecutor(def: ToolDefinition): ToolExecutor {
  const exec = def.exec!

  return async (inputs: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const binPath = resolveBinaryPath(exec)
    const resources = resolveResources(exec)
    const outDir = resolveOutputDir(exec, inputs)

    // Base template variables available to all interpolations
    const baseVars: Record<string, string> = {
      outputDir: outDir,
      resources: resources as unknown as string // accessed via dotted path
    }
    // Flatten resources into dotted keys for interpolation
    for (const [k, v] of Object.entries(resources)) {
      baseVars[`resources.${k}`] = v
    }

    // Determine what to iterate over
    let items: unknown[]
    let iterVar: string

    if (exec.forEach) {
      const forEachInput = inputs[exec.forEach]
      if (Array.isArray(forEachInput)) {
        items = forEachInput
      } else if (forEachInput != null) {
        items = [forEachInput]
      } else {
        // forEach input is absent — run once without binding the iteration variable
        // This handles cases like dcm2niix where series=null means "convert all"
        items = [null]
      }
      iterVar = exec.iterationVar || exec.forEach
    } else {
      // Single execution, no iteration
      items = [null]
      iterVar = ''
    }

    const acceptedCodes = new Set(exec.exitCodes ?? [0])

    const runOne = async (item: unknown): Promise<{ outputFile: string; stdout: string; stderr: string }> => {
      // Build per-iteration inputs with the iteration variable bound
      const iterInputs = { ...inputs }
      if (iterVar && item != null) {
        iterInputs[iterVar] = item
      }

      // Resolve output file path if we have an input file path for this iteration
      const inputFilePath = typeof item === 'string' ? item : undefined
      let outputFile = ''
      if (inputFilePath && exec.outputFile) {
        outputFile = resolveOutputFile(exec, inputFilePath, outDir, baseVars)
      }

      const templateVars: Record<string, string> = {
        ...baseVars,
        outputFile
      }
      if (inputFilePath) {
        let basename = path.basename(inputFilePath)
        if (exec.outputFile?.stripExtensions) {
          for (const ext of exec.outputFile.stripExtensions) {
            if (basename.endsWith(ext) && ext.length < basename.length) {
              basename = basename.slice(0, -ext.length)
              break
            }
          }
        }
        templateVars.inputBasename = basename
      }

      const args = buildArgs(exec.args, iterInputs, templateVars)
      const { stdout, stderr, code } = await spawnBinary(binPath, args)

      if (!acceptedCodes.has(code)) {
        throw new Error(`${def.name} exited with code ${code}: ${stderr}`)
      }

      return { outputFile, stdout, stderr }
    }

    // Run iterations — collect results without shared mutation
    // Promise.all rejects on first failure, so no partial results are returned
    let results: { outputFile: string; stdout: string; stderr: string }[]
    if (exec.parallel && items.length > 1) {
      results = await Promise.all(items.map(runOne))
    } else {
      results = []
      for (const item of items) {
        results.push(await runOne(item))
      }
    }

    const allOutputFiles = results.map((r) => r.outputFile).filter(Boolean)
    const allStdout = results.map((r) => r.stdout).join('')
    const allStderr = results.map((r) => r.stderr).join('')

    const templateVars: Record<string, string> = { ...baseVars }
    let outputs = collectOutputs(exec.outputs, templateVars, allOutputFiles, outDir, allStdout, allStderr)

    // Apply post-processor if defined
    if (exec.postProcess) {
      const processor = getPostProcessor(exec.postProcess)
      if (processor) {
        outputs = processor(outputs)
      }
    }

    return outputs
  }
}
