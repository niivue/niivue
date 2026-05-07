import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Text } from '@radix-ui/themes'
import type {
  BidsSeriesMapping,
  BidsValidationResult,
  SidecarAutoFixRecord,
  SidecarFieldSuggestion,
  SidecarFixProposal
} from '../../../../common/bidsTypes.js'

const electron = window.electron

interface BidsSidecarFixFormProps {
  /** Absolute path to the written BIDS dataset directory */
  datasetDir: string
  /**
   * Pre-computed validation result used to derive fix proposals.
   * Required unless `autoFixOnMount` is set, in which case the form
   * invokes `bidsAutoFixSidecars` to produce its own result.
   */
  validationResult?: BidsValidationResult
  /** Mappings currently in the wizard — used for re-validation */
  mappings: BidsSeriesMapping[]
  /**
   * When true, the form runs `bidsAutoFixSidecars` on mount: it applies
   * unambiguous fixes (TaskName from filename) in place, re-runs the
   * external validator, and seeds the proposal list from the fresh result.
   * Used by the `bids-fix-sidecars` workflow block.
   */
  autoFixOnMount?: boolean
  /** Called after a successful save+revalidate so the parent can refresh its own result */
  onRevalidated?: (result: BidsValidationResult) => void
  /** Called once the auto-fix pass completes with the set of fixes applied */
  onAutoFixed?: (fixes: SidecarAutoFixRecord[], validation: BidsValidationResult) => void
}

type FormValue = string // always edit as string; parse on save

/**
 * Format a value pulled from a sidecar into the text the user will edit.
 * Arrays become comma-separated; objects become JSON; numbers/strings stringify directly.
 */
function formatForInput(value: unknown, kind: SidecarFieldSuggestion['kind']): FormValue {
  if (value === undefined || value === null) return ''
  if (kind === 'array-number' || kind === 'array-string') {
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
  }
  if (kind === 'number') {
    return typeof value === 'number' ? String(value) : String(value ?? '')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

interface ParseResult {
  ok: boolean
  value?: unknown
  error?: string
}

function parseFromInput(text: string, kind: SidecarFieldSuggestion['kind']): ParseResult {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: true, value: '' } // empty string signals "delete"

  switch (kind) {
    case 'number': {
      const n = Number(trimmed)
      if (Number.isFinite(n)) return { ok: true, value: n }
      return { ok: false, error: 'Must be a number' }
    }
    case 'array-number': {
      const parts = trimmed
        .split(/[,\s]+/)
        .map((p) => p.trim())
        .filter((p) => p !== '')
      const nums: number[] = []
      for (const p of parts) {
        const n = Number(p)
        if (!Number.isFinite(n)) return { ok: false, error: `"${p}" is not a number` }
        nums.push(n)
      }
      return { ok: true, value: nums }
    }
    case 'array-string': {
      const parts = trimmed
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p !== '')
      return { ok: true, value: parts }
    }
    case 'string':
    case 'enum':
    default:
      return { ok: true, value: trimmed }
  }
}

interface EditState {
  /** Keyed by `${sidecarPath}::${field}` */
  values: Record<string, FormValue>
  /** Parse errors keyed the same way */
  errors: Record<string, string>
}

export function BidsSidecarFixForm({
  datasetDir,
  validationResult,
  mappings,
  autoFixOnMount,
  onRevalidated,
  onAutoFixed
}: BidsSidecarFixFormProps): JSX.Element | null {
  const [loading, setLoading] = useState(false)
  const [proposals, setProposals] = useState<SidecarFixProposal[]>([])
  const [edits, setEdits] = useState<EditState>({ values: {}, errors: {} })
  const [savingPath, setSavingPath] = useState<string | null>(null)
  const [savedPaths, setSavedPaths] = useState<Set<string>>(new Set())
  const [banner, setBanner] = useState<string>('')
  const [bannerKind, setBannerKind] = useState<'info' | 'error' | 'success'>('info')
  const [autoFixSummary, setAutoFixSummary] = useState<SidecarAutoFixRecord[] | null>(null)

  // Stash unstable inputs in refs so loadProposals stays stable and its
  // auto-run effect only re-fires when datasetDir / autoFixOnMount change.
  // Without this, every call to onFieldChange triggers a parent re-render,
  // which hands us new callback/array refs, which re-fires the effect, which
  // kicks off another auto-fix pass — an infinite flashing loop.
  const mappingsRef = useRef(mappings)
  const validationResultRef = useRef(validationResult)
  const onRevalidatedRef = useRef(onRevalidated)
  const onAutoFixedRef = useRef(onAutoFixed)
  useEffect(() => {
    mappingsRef.current = mappings
    validationResultRef.current = validationResult
    onRevalidatedRef.current = onRevalidated
    onAutoFixedRef.current = onAutoFixed
  })

  const seedEdits = useCallback((list: SidecarFixProposal[]): void => {
    const values: Record<string, FormValue> = {}
    for (const p of list) {
      for (const s of p.suggestions) {
        values[`${p.sidecarPath}::${s.field}`] = formatForInput(s.suggestedValue, s.kind)
      }
    }
    setEdits({ values, errors: {} })
  }, [])

  const loadProposals = useCallback(async (): Promise<void> => {
    setLoading(true)
    setBanner('')
    try {
      if (autoFixOnMount) {
        const res = await electron.bidsAutoFixSidecars(datasetDir, mappingsRef.current)
        if (!res.success) {
          setBanner(res.error || 'Failed to run auto-fix pass')
          setBannerKind('error')
          setProposals([])
          return
        }
        const fixes = res.fixesApplied || []
        setAutoFixSummary(fixes)
        if (res.validation) {
          onRevalidatedRef.current?.(res.validation)
          onAutoFixedRef.current?.(fixes, res.validation)
        }
        const list = res.proposals || []
        setProposals(list)
        seedEdits(list)
        if (fixes.length > 0) {
          setBanner(`Auto-applied ${fixes.length} fix${fixes.length > 1 ? 'es' : ''}.`)
          setBannerKind('info')
        }
        return
      }

      const currentValidation = validationResultRef.current
      if (!currentValidation) {
        setProposals([])
        return
      }
      const res = await electron.bidsAnalyzeFixes(datasetDir, currentValidation)
      if (!res.success) {
        setBanner(res.error || 'Failed to analyze validator issues')
        setBannerKind('error')
        setProposals([])
        return
      }
      const list = res.proposals || []
      setProposals(list)
      seedEdits(list)
    } finally {
      setLoading(false)
    }
  }, [autoFixOnMount, datasetDir, seedEdits])

  useEffect(() => {
    void loadProposals()
  }, [loadProposals])

  const handleChange = (sidecarPath: string, field: string, text: string): void => {
    setEdits((prev) => ({
      values: { ...prev.values, [`${sidecarPath}::${field}`]: text },
      errors: { ...prev.errors, [`${sidecarPath}::${field}`]: '' }
    }))
    setSavedPaths((prev) => {
      if (!prev.has(sidecarPath)) return prev
      const next = new Set(prev)
      next.delete(sidecarPath)
      return next
    })
  }

  const buildUpdates = (
    proposal: SidecarFixProposal
  ): { updates: Record<string, unknown>; errors: Record<string, string> } => {
    const updates: Record<string, unknown> = {}
    const errors: Record<string, string> = {}
    for (const s of proposal.suggestions) {
      const key = `${proposal.sidecarPath}::${s.field}`
      const text = edits.values[key] ?? ''
      const parsed = parseFromInput(text, s.kind)
      if (!parsed.ok) {
        errors[key] = parsed.error || 'Invalid value'
        continue
      }
      updates[s.field] = parsed.value
    }
    return { updates, errors }
  }

  const handleSave = async (proposal: SidecarFixProposal): Promise<void> => {
    const { updates, errors } = buildUpdates(proposal)
    if (Object.keys(errors).length > 0) {
      setEdits((prev) => ({ values: prev.values, errors: { ...prev.errors, ...errors } }))
      setBanner('Fix the highlighted errors before saving.')
      setBannerKind('error')
      return
    }
    setSavingPath(proposal.sidecarPath)
    setBanner('')
    try {
      const res = await electron.bidsUpdateSidecar(proposal.sidecarPath, updates)
      if (!res.ok) {
        setBanner(res.error || 'Failed to save sidecar')
        setBannerKind('error')
        return
      }
      setSavedPaths((prev) => {
        const next = new Set(prev)
        next.add(proposal.sidecarPath)
        return next
      })
      setBanner(`Saved ${proposal.relativePath}`)
      setBannerKind('success')
    } finally {
      setSavingPath(null)
    }
  }

  const handleSaveAllAndRevalidate = async (): Promise<void> => {
    // Save every proposal that has at least one non-empty value
    setBanner('')
    let hadError = false
    for (const proposal of proposals) {
      if (savedPaths.has(proposal.sidecarPath)) continue
      const { updates, errors } = buildUpdates(proposal)
      if (Object.keys(errors).length > 0) {
        setEdits((prev) => ({ values: prev.values, errors: { ...prev.errors, ...errors } }))
        hadError = true
        continue
      }
      const res = await electron.bidsUpdateSidecar(proposal.sidecarPath, updates)
      if (!res.ok) {
        hadError = true
        setBanner(`Failed to save ${proposal.relativePath}: ${res.error || 'unknown error'}`)
        setBannerKind('error')
        continue
      }
      setSavedPaths((prev) => {
        const next = new Set(prev)
        next.add(proposal.sidecarPath)
        return next
      })
    }
    if (hadError) return

    // Re-run the written-directory validator and reload proposals
    setLoading(true)
    try {
      const newResult = await electron.bidsValidateWritten(datasetDir, mappingsRef.current)
      onRevalidatedRef.current?.(newResult)
      if (newResult.valid && newResult.errors.length === 0) {
        setBanner('All fixes applied — validator now reports no errors.')
        setBannerKind('success')
        setProposals([])
        return
      }
      setBanner('Fixes applied. Remaining issues shown below.')
      setBannerKind('info')
      const res = await electron.bidsAnalyzeFixes(datasetDir, newResult)
      if (res.success) {
        const list = res.proposals || []
        setProposals(list)
        const values: Record<string, FormValue> = {}
        for (const p of list) {
          for (const s of p.suggestions) {
            values[`${p.sidecarPath}::${s.field}`] = formatForInput(s.suggestedValue, s.kind)
          }
        }
        setEdits({ values, errors: {} })
        setSavedPaths(new Set())
      }
    } finally {
      setLoading(false)
    }
  }

  const totalSuggestions = useMemo(
    () => proposals.reduce((sum, p) => sum + p.suggestions.length, 0),
    [proposals]
  )

  if (loading && proposals.length === 0) {
    return (
      <div className="border rounded p-3">
        <Text size="1" color="gray">
          Analyzing validator issues…
        </Text>
      </div>
    )
  }

  // If the auto-fix pass cleared everything there's nothing to render except
  // a success note for the user. Show that when triggered via autoFixOnMount.
  if (proposals.length === 0) {
    if (autoFixOnMount && autoFixSummary && autoFixSummary.length > 0) {
      return (
        <div className="flex flex-col gap-2 border rounded p-3 bg-[var(--green-2)]">
          <Text size="2" weight="bold">
            Sidecar Fixes Applied
          </Text>
          <Text size="1" color="gray">
            Auto-applied {autoFixSummary.length} fix{autoFixSummary.length > 1 ? 'es' : ''} and
            re-validated — no remaining editable issues.
          </Text>
          <ul className="text-xs list-disc pl-4">
            {autoFixSummary.slice(0, 8).map((f, i) => (
              <li key={i}>
                <span className="font-mono opacity-70">{f.relativePath}</span> · {f.field} ={' '}
                <span className="font-mono">{JSON.stringify(f.newValue)}</span>
              </li>
            ))}
            {autoFixSummary.length > 8 && (
              <li className="opacity-70">…and {autoFixSummary.length - 8} more</li>
            )}
          </ul>
        </div>
      )
    }
    return null
  }

  const bannerClass =
    bannerKind === 'error'
      ? 'bg-[var(--red-3)] text-[var(--red-11)] border-[var(--red-6)]'
      : bannerKind === 'success'
        ? 'bg-[var(--green-3)] text-[var(--green-11)] border-[var(--green-6)]'
        : 'bg-[var(--blue-3)] text-[var(--blue-11)] border-[var(--blue-6)]'

  return (
    <div className="flex flex-col gap-3 border rounded p-3 bg-[var(--gray-2)]">
      <div className="flex items-center gap-2">
        <Text size="2" weight="bold">
          Fix Sidecar JSON
        </Text>
        <Text size="1" color="gray">
          {proposals.length} file{proposals.length > 1 ? 's' : ''}, {totalSuggestions} field
          {totalSuggestions > 1 ? 's' : ''}
        </Text>
        <div className="ml-auto flex gap-2">
          <Button size="1" variant="soft" onClick={() => void loadProposals()} disabled={loading}>
            Reload
          </Button>
          <Button size="1" onClick={() => void handleSaveAllAndRevalidate()} disabled={loading}>
            {loading ? 'Working…' : 'Save All & Re-validate'}
          </Button>
        </div>
      </div>

      <Text size="1" color="gray">
        The validator flagged these JSON fields. Edit the values below and save to fix each file in
        place, then re-run the validator.
      </Text>

      {banner && <div className={`text-xs rounded border px-2 py-1 ${bannerClass}`}>{banner}</div>}

      {autoFixSummary && autoFixSummary.length > 0 && (
        <div className="text-xs border rounded p-2 bg-[var(--green-2)] border-[var(--green-6)]">
          <div className="font-medium text-[var(--green-11)] mb-1">
            Auto-applied {autoFixSummary.length} fix{autoFixSummary.length > 1 ? 'es' : ''}
          </div>
          <ul className="list-disc pl-4">
            {autoFixSummary.slice(0, 5).map((f, i) => (
              <li key={i}>
                <span className="font-mono opacity-70">{f.relativePath}</span> · {f.field} ={' '}
                <span className="font-mono">{JSON.stringify(f.newValue)}</span>
              </li>
            ))}
            {autoFixSummary.length > 5 && (
              <li className="opacity-70">…and {autoFixSummary.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {proposals.map((proposal) => {
          const saved = savedPaths.has(proposal.sidecarPath)
          return (
            <div
              key={proposal.sidecarPath}
              className={`flex flex-col gap-2 border rounded p-3 ${
                saved ? 'border-[var(--green-6)]' : 'border-[var(--gray-6)]'
              } bg-[var(--color-background)]`}
            >
              <div className="flex items-center gap-2">
                <Text size="1" weight="bold" className="font-mono truncate">
                  {proposal.relativePath}
                </Text>
                {saved && (
                  <Text size="1" color="green">
                    saved
                  </Text>
                )}
                <Button
                  size="1"
                  variant="soft"
                  className="ml-auto"
                  disabled={savingPath === proposal.sidecarPath || loading}
                  onClick={() => void handleSave(proposal)}
                >
                  {savingPath === proposal.sidecarPath ? 'Saving…' : 'Save'}
                </Button>
              </div>

              {proposal.issues.length > 0 && (
                <ul className="text-xs text-[var(--red-11)] list-disc pl-4">
                  {proposal.issues.slice(0, 4).map((issue, i) => (
                    <li key={i}>
                      {issue.code ? (
                        <span className="font-mono opacity-70">[{issue.code}] </span>
                      ) : null}
                      {issue.message}
                    </li>
                  ))}
                  {proposal.issues.length > 4 && (
                    <li className="opacity-70">…and {proposal.issues.length - 4} more</li>
                  )}
                </ul>
              )}

              {proposal.suggestions.map((s) => {
                const key = `${proposal.sidecarPath}::${s.field}`
                const value = edits.values[key] ?? ''
                const error = edits.errors[key]
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                      <Text size="1" weight="medium">
                        {s.field}
                      </Text>
                      <Text size="1" color="gray">
                        {s.kind === 'array-number'
                          ? 'numbers, comma separated'
                          : s.kind === 'array-string'
                            ? 'strings, comma separated'
                            : s.kind}
                      </Text>
                    </div>
                    {s.kind === 'enum' && s.options ? (
                      <select
                        value={value}
                        onChange={(e) =>
                          handleChange(proposal.sidecarPath, s.field, e.target.value)
                        }
                        className="px-2 py-1 text-sm border border-[var(--gray-6)] rounded bg-[var(--color-background)]"
                      >
                        <option value="">(unset)</option>
                        {s.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : s.kind === 'array-number' || s.kind === 'array-string' ? (
                      <textarea
                        value={value}
                        onChange={(e) =>
                          handleChange(proposal.sidecarPath, s.field, e.target.value)
                        }
                        rows={2}
                        className={`px-2 py-1 text-sm border rounded font-mono resize-y ${
                          error ? 'border-[var(--red-7)]' : 'border-[var(--gray-6)]'
                        }`}
                      />
                    ) : (
                      <input
                        type={s.kind === 'number' ? 'number' : 'text'}
                        step="any"
                        value={value}
                        onChange={(e) =>
                          handleChange(proposal.sidecarPath, s.field, e.target.value)
                        }
                        className={`px-2 py-1 text-sm border rounded ${
                          error ? 'border-[var(--red-7)]' : 'border-[var(--gray-6)]'
                        }`}
                      />
                    )}
                    {error ? (
                      <Text size="1" color="red">
                        {error}
                      </Text>
                    ) : (
                      <Text size="1" color="gray">
                        {s.reason}
                      </Text>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
