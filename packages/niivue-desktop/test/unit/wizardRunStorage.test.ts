import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Minimal in-memory localStorage stand-in so the module can be exercised in
// the default node test environment without a DOM.
function installLocalStorage(): void {
  const store = new Map<string, string>()
  const stub: Storage = {
    get length(): number {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    key: (i) => Array.from(store.keys())[i] ?? null,
    removeItem: (k) => {
      store.delete(k)
    },
    setItem: (k, v) => {
      store.set(k, v)
    }
  }
  ;(globalThis as unknown as { window: { localStorage: Storage } }).window = {
    localStorage: stub
  }
}

beforeEach(() => {
  installLocalStorage()
  vi.resetModules()
})

afterEach(() => {
  vi.useRealTimers()
})

async function importModule(): Promise<
  typeof import('../../src/renderer/src/components/Wizard/wizardRunStorage')
> {
  return await import('../../src/renderer/src/components/Wizard/wizardRunStorage')
}

describe('wizardRunStorage', () => {
  it('round-trips a stored run that matches the workflow name', async () => {
    const { writeStoredRun, readStoredRun } = await importModule()
    writeStoredRun({ runId: 'abc-123', workflowName: 'dicom-to-bids', currentSection: 2 })
    const got = readStoredRun('dicom-to-bids')
    expect(got).not.toBeNull()
    expect(got!.runId).toBe('abc-123')
    expect(got!.currentSection).toBe(2)
    expect(got!.workflowName).toBe('dicom-to-bids')
    expect(typeof got!.timestamp).toBe('number')
  })

  it('returns null when the stored workflow name does not match', async () => {
    const { writeStoredRun, readStoredRun } = await importModule()
    writeStoredRun({ runId: 'abc-123', workflowName: 'dicom-to-bids', currentSection: 0 })
    expect(readStoredRun('other-workflow')).toBeNull()
  })

  it('returns null when nothing is stored', async () => {
    const { readStoredRun } = await importModule()
    expect(readStoredRun('dicom-to-bids')).toBeNull()
  })

  it('returns null when the stored entry is older than the TTL', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const { writeStoredRun, readStoredRun } = await importModule()
    writeStoredRun({ runId: 'abc-123', workflowName: 'dicom-to-bids', currentSection: 0 })
    // Advance 13 hours -- past the 12h TTL
    vi.setSystemTime(new Date('2026-01-01T13:00:00Z'))
    expect(readStoredRun('dicom-to-bids')).toBeNull()
  })

  it('still resolves entries within the TTL window', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const { writeStoredRun, readStoredRun } = await importModule()
    writeStoredRun({ runId: 'abc-123', workflowName: 'dicom-to-bids', currentSection: 0 })
    vi.setSystemTime(new Date('2026-01-01T11:00:00Z'))
    expect(readStoredRun('dicom-to-bids')).not.toBeNull()
  })

  it('clearStoredRun removes the entry', async () => {
    const { writeStoredRun, clearStoredRun, readStoredRun } = await importModule()
    writeStoredRun({ runId: 'abc-123', workflowName: 'dicom-to-bids', currentSection: 0 })
    clearStoredRun()
    expect(readStoredRun('dicom-to-bids')).toBeNull()
  })

  it('ignores malformed JSON', async () => {
    const { readStoredRun } = await importModule()
    window.localStorage.setItem('niivue.wizard.activeRun', '{not-json')
    expect(readStoredRun('dicom-to-bids')).toBeNull()
  })

  it('ignores entries missing required fields', async () => {
    const { readStoredRun } = await importModule()
    window.localStorage.setItem(
      'niivue.wizard.activeRun',
      JSON.stringify({ workflowName: 'dicom-to-bids', timestamp: Date.now() })
    )
    expect(readStoredRun('dicom-to-bids')).toBeNull()
  })
})
