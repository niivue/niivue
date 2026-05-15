/**
 * Persists the in-flight wizard run id to localStorage so the wizard can
 * reattach to a still-live main-process run after the panel is closed
 * (either explicitly via "Close, keep running" or unexpectedly via a
 * renderer reload / crash). Only one run is tracked at a time — opening
 * a different workflow clears any stored entry that isn't a match.
 */

const STORAGE_KEY = 'niivue.wizard.activeRun'

/**
 * Entries older than this expire silently. Tuned so a user who steps away
 * for an afternoon can resume, but a stale entry from days ago never
 * resurrects a long-dead runId.
 */
const TTL_MS = 12 * 60 * 60 * 1000

export interface StoredRun {
  runId: string
  workflowName: string
  currentSection: number
  timestamp: number
}

export function readStoredRun(workflowName: string): StoredRun | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredRun>
    if (
      typeof parsed.runId !== 'string' ||
      typeof parsed.workflowName !== 'string' ||
      typeof parsed.timestamp !== 'number'
    ) {
      return null
    }
    if (parsed.workflowName !== workflowName) return null
    if (Date.now() - parsed.timestamp > TTL_MS) return null
    return {
      runId: parsed.runId,
      workflowName: parsed.workflowName,
      currentSection: typeof parsed.currentSection === 'number' ? parsed.currentSection : 0,
      timestamp: parsed.timestamp
    }
  } catch {
    return null
  }
}

export function writeStoredRun(run: Omit<StoredRun, 'timestamp'>): void {
  try {
    const entry: StoredRun = { ...run, timestamp: Date.now() }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry))
  } catch {
    // ignore — storage may be full or disabled
  }
}

export function clearStoredRun(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
