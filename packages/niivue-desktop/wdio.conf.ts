import type { Options } from '@wdio/types'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// IMPORTANT: Unset ELECTRON_RUN_AS_NODE to allow Electron to run as an app, not Node.js
// This can be set by VS Code or other Electron-based IDEs when running from the integrated terminal
delete process.env.ELECTRON_RUN_AS_NODE

export const config: Options.Testrunner & Record<string, unknown> = {
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
          '--enable-gpu-rasterization',
          // Force consistent DPI for visual regression (matches CI environment)
          '--force-device-scale-factor=1'
        ],
        // Fixed window size for consistent visual regression tests
        browserWindowOptions: {
          width: 1280,
          height: 800
        }
      }
    }
  ],

  logLevel: 'info',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  services: [
    'electron',
    [
      'visual',
      {
        baselineFolder: path.join(__dirname, 'test/baselines'),
        formatImageName: '{tag}',
        screenshotPath: path.join(__dirname, 'test/screenshots'),
        savePerInstance: true,
        autoSaveBaseline: true,
        blockOutStatusBar: true,
        blockOutToolBar: true,
        // Allow 10% pixel difference to account for GPU-specific WebGL rendering variations
        misMatchPercentage: 10
      }
    ]
  ],
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
  },

  // Kill orphaned niivue-desktop Electron and chromedriver processes after tests complete.
  // Without this, test runs can leave dozens of zombie processes behind.
  onComplete: function () {
    const appEntry = path.join(__dirname, 'out/main/index.js')
    try {
      if (process.platform === 'win32') {
        // wmic finds processes whose command line contains our app entry point
        execSync(`wmic process where "CommandLine like '%${appEntry.replace(/\\/g, '\\\\')}%'" call terminate 2>nul`, { stdio: 'ignore' })
      } else {
        execSync(`pkill -f "${appEntry}" 2>/dev/null; pkill -f "chromedriver.*mac_arm" 2>/dev/null`, { stdio: 'ignore' })
      }
      console.log('[wdio] Cleaned up orphaned test processes')
    } catch {
      // pkill exits non-zero when no processes matched — that's fine
    }
  }
}
