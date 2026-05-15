// ── Headless workflow CLI runner ─────────────────────────────────────
//
// Minimal command-line wrapper around runWorkflowHeadless. Runs a single
// workflow against the JSON definitions on disk.
//
// Usage:
//   node out/main/cli/runWorkflow.js \
//     --workflows-dir packages/niivue-desktop/workflows \
//     --workflow dicom-to-bids \
//     --input dicom_dir=/path/to/dicoms \
//     --context output_dir=/path/to/output
//
// This is the canonical headless entry point. The desktop app uses the same
// runWorkflowHeadless underneath, so anything callable here is callable
// from the UI and vice-versa.

import path from 'node:path'
import { loadDefinitionsFromPath } from '../utils/workflowLoader.js'
import { runWorkflowHeadless } from '../utils/headlessWorkflowRunner.js'

interface ParsedArgs {
  workflowsDir: string
  workflowName: string
  inputs: Record<string, string>
  contextOverrides: Record<string, string>
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    workflowsDir: '',
    workflowName: '',
    inputs: {},
    contextOverrides: {}
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]
    switch (arg) {
      case '--workflows-dir':
        args.workflowsDir = next
        i++
        break
      case '--workflow':
        args.workflowName = next
        i++
        break
      case '--input': {
        const [k, ...rest] = next.split('=')
        args.inputs[k] = rest.join('=')
        i++
        break
      }
      case '--context': {
        const [k, ...rest] = next.split('=')
        args.contextOverrides[k] = rest.join('=')
        i++
        break
      }
      case '--help':
      case '-h':
        printUsage()
        process.exit(0)
        break
    }
  }

  if (!args.workflowsDir || !args.workflowName) {
    printUsage()
    process.exit(2)
  }

  return args
}

function printUsage(): void {
  console.error(
    [
      'Usage: runWorkflow --workflows-dir <dir> --workflow <name> [--input key=value ...] [--context key=value ...]',
      '',
      'Options:',
      '  --workflows-dir <dir>     Directory containing tools/, workflows/, heuristics/',
      '  --workflow <name>         Name of the workflow to run',
      '  --input key=value         Repeatable: a workflow input',
      '  --context key=value       Repeatable: a context-field override',
      '  -h, --help                Show this message'
    ].join('\n')
  )
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv)
  const root = path.resolve(args.workflowsDir)

  loadDefinitionsFromPath(root)

  console.error(`[runWorkflow] Running '${args.workflowName}' from ${root}`)
  try {
    const result = await runWorkflowHeadless({
      workflowName: args.workflowName,
      inputs: args.inputs,
      contextOverrides: args.contextOverrides,
      onProgress: (step, status) => {
        console.error(`[runWorkflow] ${step}: ${status}`)
      }
    })
    console.log(JSON.stringify(result, null, 2))
    return 0
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[runWorkflow] Failed: ${msg}`)
    return 1
  }
}

// When invoked directly from the command line, run main and exit with its
// status code. The check below works for both ESM and CJS entry points.
const isDirectInvocation =
  typeof require !== 'undefined'
    ? require.main === module
    : import.meta.url === `file://${process.argv[1]}`

if (isDirectInvocation) {
  main().then((code) => process.exit(code))
}
