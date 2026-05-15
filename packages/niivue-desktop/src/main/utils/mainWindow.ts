// Module-scoped accessor for the active BrowserWindow. Lives apart from
// `main/index.ts` so utilities that need the window (e.g. the renderer
// bridge) don't transitively import index.ts's top-level Electron app
// setup — which is unrunnable under vitest.

import type { BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
