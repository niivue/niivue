import type { Options } from '@wdio/types'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// IMPORTANT: Unset ELECTRON_RUN_AS_NODE to allow Electron to run as an app, not Node.js
// This can be set by VS Code or other Electron-based IDEs when running from the integrated terminal
delete process.env.ELECTRON_RUN_AS_NODE

export const config: Options.Testrunner = {
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: './tsconfig.node.json',
      transpileOnly: true
    }
  },

  specs: ['./test/specs/**/*.spec.ts'],
  exclude: [],

  maxInstances: 1,

  capabilities: [
    {
      browserName: 'electron',
      'wdio:electronServiceOptions': {
        // Use appEntryPoint for non-packaged apps (built with electron-vite)
        appEntryPoint: path.join(__dirname, 'out/main/index.js'),
        appArgs: [
          '--no-sandbox',
          '--enable-webgl',
          '--ignore-gpu-blocklist',
          '--enable-gpu-rasterization'
        ]
      }
    }
  ],

  logLevel: 'info',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  services: ['electron'],
  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 60000
  },

  // Hooks to ensure ELECTRON_RUN_AS_NODE is unset in all worker processes
  onPrepare: function () {
    delete process.env.ELECTRON_RUN_AS_NODE
  },

  onWorkerStart: function () {
    delete process.env.ELECTRON_RUN_AS_NODE
  }
}
