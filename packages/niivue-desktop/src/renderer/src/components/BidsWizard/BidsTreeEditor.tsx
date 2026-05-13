import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Text, TextField, Button, Callout, Badge } from '@radix-ui/themes'
import { InfoCircledIcon, ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import type {
  BidsApplyEditsResult,
  BidsDiskFile,
  BidsSeriesMapping,
  DetectedSubject,
  SidecarStagedEdit
} from '../../../../common/bidsTypes.js'
import { StepBidsPreview } from './StepBidsPreview.js'
import {
  mappingsToTreeFiles,
  groupTreeFiles,
  applySidecarOverrideBatch,
  buildInspectorRows,
  buildSelectChips,
  type TreeFile
} from './bidsTreeEditorModel.js'

const electron = window.electron

interface AdapterProps {
  context: Record<string, unknown>
  stepOutputs?: Record<string, Record<string, unknown>>
  onFieldChange: (fieldName: string, value: unknown) => void | Promise<void>
  onLoadFile?: (niftiPath: string) => Promise<void>
}

// ── Subject/session relabel helpers (pure, exported for unit tests) ────

export function renameSubject(
  oldLabel: string,
  newLabel: string,
  mappings: BidsSeriesMapping[],
  subjects: DetectedSubject[]
): { mappings: BidsSeriesMapping[]; subjects: DetectedSubject[] } {
  if (!newLabel || newLabel === oldLabel) return { mappings, subjects }
  return {
    mappings: mappings.map((m) =>
      m.subject === oldLabel ? { ...m, subject: newLabel } : m
    ),
    subjects: subjects.map((s) => (s.label === oldLabel ? { ...s, label: newLabel } : s))
  }
}

export function renameSession(
  subjectLabel: string,
  oldSession: string,
  newSession: string,
  mappings: BidsSeriesMapping[],
  subjects: DetectedSubject[]
): { mappings: BidsSeriesMapping[]; subjects: DetectedSubject[] } {
  if (newSession === oldSession) return { mappings, subjects }
  return {
    mappings: mappings.map((m) =>
      m.subject === subjectLabel && m.session === oldSession
        ? { ...m, session: newSession }
        : m
    ),
    subjects: subjects.map((s) => {
      if (s.label !== subjectLabel) return s
      return {
        ...s,
        sessions: s.sessions.map((ses) =>
          ses.label === oldSession ? { ...ses, label: newSession } : ses
        )
      }
    })
  }
}

// ── Subject relabel form ───────────────────────────────────────────────

function SubjectRelabelForm({
  mappings,
  subjects,
  onUpdate
}: {
  mappings: BidsSeriesMapping[]
  subjects: DetectedSubject[]
  onUpdate: (mappings: BidsSeriesMapping[], subjects: DetectedSubject[]) => void
}): React.ReactElement | null {
  if (subjects.length === 0) return null

  const sanitize = (raw: string): string => raw.replace(/[^a-zA-Z0-9]/g, '')

  return (
    <div className="flex flex-col gap-2">
      <Text size="2" weight="medium">Subjects & sessions</Text>
      <Text size="1" color="gray">
        Rename a subject or session and every file in the tree below updates to match.
      </Text>
      <div className="border border-[var(--gray-5)] rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[var(--gray-3)]">
            <tr>
              <th className="text-left px-2 py-1 font-medium">Patient ID</th>
              <th className="text-left px-2 py-1 font-medium">sub-</th>
              <th className="text-left px-2 py-1 font-medium">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub) => (
              <tr key={sub.rawId} className="border-t border-[var(--gray-4)]">
                <td className="px-2 py-1 font-mono text-[var(--gray-11)]">{sub.rawId}</td>
                <td className="px-2 py-1">
                  <TextField.Root
                    size="1"
                    value={sub.label}
                    onChange={(e) => {
                      const next = renameSubject(
                        sub.label,
                        sanitize(e.target.value),
                        mappings,
                        subjects
                      )
                      onUpdate(next.mappings, next.subjects)
                    }}
                  />
                </td>
                <td className="px-2 py-1">
                  {sub.sessions.length === 0 ? (
                    <Text size="1" color="gray">(no sessions)</Text>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {sub.sessions.map((ses) => (
                        <div key={ses.label} className="flex items-center gap-0.5">
                          <Text size="1" color="gray">ses-</Text>
                          <TextField.Root
                            size="1"
                            value={ses.label}
                            onChange={(e) => {
                              const next = renameSession(
                                sub.label,
                                ses.label,
                                sanitize(e.target.value),
                                mappings,
                                subjects
                              )
                              onUpdate(next.mappings, next.subjects)
                            }}
                            style={{ width: 60 }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Hierarchical file tree (left pane) ─────────────────────────────────

interface TreeProps {
  files: TreeFile[]
  selectedKeys: Set<string>
  onToggle: (key: string) => void
  onSelectMany: (keys: string[], next: boolean) => void
}

function FileTree({ files, selectedKeys, onToggle, onSelectMany }: TreeProps): React.ReactElement {
  const groups = useMemo(() => groupTreeFiles(files), [files])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggleCollapsed = (key: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const subjectAllSelected = (subject: string): boolean => {
    const subjectKeys = files.filter((f) => f.subject === subject).map((f) => f.key)
    return subjectKeys.length > 0 && subjectKeys.every((k) => selectedKeys.has(k))
  }

  return (
    <div className="border border-[var(--gray-5)] rounded p-2 overflow-y-auto"
         style={{ maxHeight: 480, minHeight: 240 }}>
      {groups.length === 0 && (
        <Text size="1" color="gray">
          No files yet — heuristics may still be running. If this stays empty, go back to
          Filter and confirm at least one series is selected.
        </Text>
      )}
      {groups.map((g) => {
        const subjectKey = `sub:${g.subject}`
        const subjectCollapsed = collapsed.has(subjectKey)
        const subjectFileKeys = files.filter((f) => f.subject === g.subject).map((f) => f.key)
        return (
          <div key={subjectKey} className="mb-1">
            <div className="flex items-center gap-1 hover:bg-[var(--gray-3)] rounded px-1">
              <button
                type="button"
                onClick={() => toggleCollapsed(subjectKey)}
                className="cursor-pointer flex items-center"
                aria-label={subjectCollapsed ? 'Expand' : 'Collapse'}
              >
                {subjectCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
              </button>
              <input
                type="checkbox"
                checked={subjectAllSelected(g.subject)}
                onChange={(e) => onSelectMany(subjectFileKeys, e.target.checked)}
                className="w-3 h-3"
              />
              <Text size="2" weight="medium" className="font-mono">sub-{g.subject}</Text>
              <Badge size="1" variant="soft" color="gray">{subjectFileKeys.length}</Badge>
            </div>
            {!subjectCollapsed &&
              g.sessions.map((sess) => {
                const sessionKey = `${subjectKey}/ses:${sess.session || '_'}`
                const sessionCollapsed = collapsed.has(sessionKey)
                const sessionFileKeys = sess.datatypes.flatMap((dt) => dt.files.map((f) => f.key))
                return (
                  <div key={sessionKey} className="ml-4">
                    <div className="flex items-center gap-1 hover:bg-[var(--gray-3)] rounded px-1">
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(sessionKey)}
                        className="cursor-pointer flex items-center"
                      >
                        {sessionCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
                      </button>
                      <input
                        type="checkbox"
                        checked={sessionFileKeys.length > 0 && sessionFileKeys.every((k) => selectedKeys.has(k))}
                        onChange={(e) => onSelectMany(sessionFileKeys, e.target.checked)}
                        className="w-3 h-3"
                      />
                      <Text size="1" color="gray" className="font-mono">
                        {sess.session ? `ses-${sess.session}` : '(no session)'}
                      </Text>
                    </div>
                    {!sessionCollapsed &&
                      sess.datatypes.map((dt) => {
                        const dtKey = `${sessionKey}/dt:${dt.datatype}`
                        const dtCollapsed = collapsed.has(dtKey)
                        const dtFileKeys = dt.files.map((f) => f.key)
                        return (
                          <div key={dtKey} className="ml-4">
                            <div className="flex items-center gap-1 hover:bg-[var(--gray-3)] rounded px-1">
                              <button
                                type="button"
                                onClick={() => toggleCollapsed(dtKey)}
                                className="cursor-pointer flex items-center"
                              >
                                {dtCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
                              </button>
                              <input
                                type="checkbox"
                                checked={dtFileKeys.length > 0 && dtFileKeys.every((k) => selectedKeys.has(k))}
                                onChange={(e) => onSelectMany(dtFileKeys, e.target.checked)}
                                className="w-3 h-3"
                              />
                              <Text size="1" color="blue" className="font-mono">{dt.datatype}/</Text>
                            </div>
                            {!dtCollapsed &&
                              dt.files.map((f) => {
                                const sidecarName = f.sidecarPath
                                  ? f.sidecarPath.split('/').pop()
                                  : null
                                return (
                                  <div key={f.key}>
                                    <div
                                      className={`ml-6 flex items-center gap-1 hover:bg-[var(--gray-3)] rounded px-1 ${
                                        selectedKeys.has(f.key) ? 'bg-[var(--accent-3)]' : ''
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedKeys.has(f.key)}
                                        onChange={() => onToggle(f.key)}
                                        className="w-3 h-3"
                                      />
                                      <Text size="1" className="font-mono truncate">{f.filename}</Text>
                                    </div>
                                    {sidecarName && (
                                      <div
                                        className={`ml-10 flex items-center gap-1 hover:bg-[var(--gray-3)] rounded px-1 cursor-pointer ${
                                          selectedKeys.has(f.key) ? 'bg-[var(--accent-3)]' : ''
                                        }`}
                                        onClick={() => onToggle(f.key)}
                                        title={`Sidecar: ${f.sidecarPath}`}
                                      >
                                        <span className="text-[10px] text-[var(--gray-10)] w-3 inline-block">↳</span>
                                        <Text size="1" color="gray" className="font-mono truncate">
                                          {sidecarName}
                                        </Text>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                          </div>
                        )
                      })}
                  </div>
                )
              })}
          </div>
        )
      })}
    </div>
  )
}

// ── Inspector pane (right) ─────────────────────────────────────────────

interface InspectorProps {
  files: TreeFile[]
  selectedKeys: Set<string>
  onApplyEdit: (keys: string[], field: string, value: unknown) => void
}

function Inspector({ files, selectedKeys, onApplyEdit }: InspectorProps): React.ReactElement {
  const selectedFiles = useMemo(
    () => files.filter((f) => selectedKeys.has(f.key)),
    [files, selectedKeys]
  )
  const rows = useMemo(() => buildInspectorRows(selectedFiles), [selectedFiles])
  const [newField, setNewField] = useState('')
  const [newValue, setNewValue] = useState('')

  if (selectedFiles.length === 0) {
    return (
      <div className="border border-[var(--gray-5)] rounded p-3 flex items-center justify-center"
           style={{ minHeight: 240 }}>
        <Text size="1" color="gray">
          Select one or more files in the tree to edit their sidecar fields.
        </Text>
      </div>
    )
  }

  const keys = [...selectedKeys]

  // Sidecar values can be strings, numbers, arrays, or objects. The
  // inspector input is text, so we parse on commit: numeric-looking input
  // becomes a number, JSON-looking input is JSON.parse'd, everything else
  // stays as a string. This mirrors what dcm2niix sidecars hold.
  const parseValue = (raw: string): unknown => {
    const trimmed = raw.trim()
    if (trimmed === '') return undefined
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed)
      } catch {
        return raw
      }
    }
    return raw
  }

  const stringify = (v: unknown): string => {
    if (v === undefined || v === null) return ''
    if (typeof v === 'string') return v
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return JSON.stringify(v)
  }

  const singleFile = selectedFiles.length === 1 ? selectedFiles[0] : null
  const distinctSidecarPaths = Array.from(
    new Set(selectedFiles.map((f) => f.sidecarPath).filter((p): p is string => !!p))
  )

  return (
    <div className="border border-[var(--gray-5)] rounded p-3 flex flex-col gap-3"
         style={{ minHeight: 240 }}>
      <div className="flex items-center justify-between">
        <Text size="2" weight="medium">
          Sidecar editor — {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
        </Text>
      </div>
      {distinctSidecarPaths.length > 0 && (
        <div className="flex flex-col gap-0.5 -mt-1">
          <Text size="1" color="gray">Source JSON{distinctSidecarPaths.length !== 1 ? 's' : ''}:</Text>
          {distinctSidecarPaths.slice(0, 3).map((p) => (
            <Text key={p} size="1" className="font-mono text-[var(--gray-11)] truncate" title={p}>
              {p}
            </Text>
          ))}
          {distinctSidecarPaths.length > 3 && (
            <Text size="1" color="gray">
              +{distinctSidecarPaths.length - 3} more
            </Text>
          )}
        </div>
      )}
      <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--gray-5)]">
              <th className="text-left px-1 py-1 font-medium w-1/3">Field</th>
              <th className="text-left px-1 py-1 font-medium">Value</th>
              <th className="px-1 py-1 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <InspectorRowEditor
                key={row.field}
                field={row.field}
                varies={row.varies}
                value={row.value}
                stringify={stringify}
                onCommit={(v) => onApplyEdit(keys, row.field, parseValue(v))}
                onClear={() => onApplyEdit(keys, row.field, undefined)}
              />
            ))}
            <tr>
              <td className="px-1 py-1">
                <TextField.Root
                  size="1"
                  placeholder="New field"
                  value={newField}
                  onChange={(e) => setNewField(e.target.value)}
                />
              </td>
              <td className="px-1 py-1">
                <TextField.Root
                  size="1"
                  placeholder="Value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                />
              </td>
              <td className="px-1 py-1">
                <Button
                  size="1"
                  variant="soft"
                  disabled={!newField}
                  onClick={() => {
                    onApplyEdit(keys, newField, parseValue(newValue))
                    setNewField('')
                    setNewValue('')
                  }}
                >
                  Add
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {singleFile && <RawJsonView file={singleFile} />}
    </div>
  )
}

/** Read-only pretty-printed JSON view of a single file's merged sidecar,
 *  collapsed by default so it doesn't crowd the field editor. Lets the
 *  user see the complete dcm2niix sidecar in one place. */
function RawJsonView({ file }: { file: TreeFile }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const json = useMemo(() => JSON.stringify(file.sidecar, null, 2), [file.sidecar])
  return (
    <div className="border-t border-[var(--gray-5)] pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 cursor-pointer text-xs text-[var(--gray-11)] hover:text-[var(--gray-12)]"
      >
        {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        <span>Raw JSON ({Object.keys(file.sidecar).length} keys)</span>
      </button>
      {open && (
        <pre
          className="mt-1 text-[11px] font-mono bg-[var(--gray-2)] border border-[var(--gray-5)] rounded p-2 overflow-auto"
          style={{ maxHeight: 240 }}
        >
{json}
        </pre>
      )}
    </div>
  )
}

function InspectorRowEditor({
  field,
  varies,
  value,
  stringify,
  onCommit,
  onClear
}: {
  field: string
  varies: boolean
  value: unknown
  stringify: (v: unknown) => string
  onCommit: (raw: string) => void
  onClear: () => void
}): React.ReactElement {
  const [draft, setDraft] = useState<string | null>(null)
  const display = draft ?? (varies ? '' : stringify(value))

  return (
    <tr className="border-b border-[var(--gray-4)]">
      <td className="px-1 py-1 font-mono text-[var(--gray-11)]">{field}</td>
      <td className="px-1 py-1">
        <TextField.Root
          size="1"
          value={display}
          placeholder={varies ? '(varies — type to set all)' : ''}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft === null) return
            onCommit(draft)
            setDraft(null)
          }}
        />
      </td>
      <td className="px-1 py-1 text-right">
        <Button
          size="1"
          variant="ghost"
          color="gray"
          onClick={onClear}
          title="Remove override and fall back to the DICOM-origin value"
        >
          ✕
        </Button>
      </td>
    </tr>
  )
}

// ── Prep editor (composes relabel form + tree + inspector + preview) ───

export function BidsPrepEditor({
  context,
  onFieldChange,
  onLoadFile
}: AdapterProps): React.ReactElement {
  const mappings = useMemo(
    () => (context.series_list as BidsSeriesMapping[]) || [],
    [context.series_list]
  )
  const subjects = useMemo(
    () => (context.subjects as DetectedSubject[]) || [],
    [context.subjects]
  )

  const files = useMemo(() => mappingsToTreeFiles(mappings), [mappings])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  // Drop selections that no longer correspond to a file (e.g. user excluded a
  // series in the Filter step then came back here).
  const validSelected = useMemo(() => {
    const valid = new Set<string>()
    const fileKeys = new Set(files.map((f) => f.key))
    for (const k of selectedKeys) if (fileKeys.has(k)) valid.add(k)
    return valid
  }, [files, selectedKeys])

  const toggle = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectMany = useCallback((keys: string[], on: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      for (const k of keys) {
        if (on) next.add(k)
        else next.delete(k)
      }
      return next
    })
  }, [])

  const handleApplyEdit = useCallback(
    (keys: string[], field: string, value: unknown) => {
      const nextMappings = applySidecarOverrideBatch(mappings, keys, field, value)
      if (nextMappings === mappings) return
      void onFieldChange('series_list', nextMappings)
    },
    [mappings, onFieldChange]
  )

  const handleRelabel = useCallback(
    (nextMappings: BidsSeriesMapping[], nextSubjects: DetectedSubject[]) => {
      void (async () => {
        await onFieldChange('series_list', nextMappings)
        await onFieldChange('subjects', nextSubjects)
      })()
    },
    [onFieldChange]
  )

  return (
    <div className="flex flex-col gap-4">
      <SubjectRelabelForm
        mappings={mappings}
        subjects={subjects}
        onUpdate={handleRelabel}
      />
      <SelectByChips files={files} onSelectMany={selectMany} />
      <div className="grid grid-cols-2 gap-3">
        <FileTree
          files={files}
          selectedKeys={validSelected}
          onToggle={toggle}
          onSelectMany={selectMany}
        />
        <Inspector
          files={files}
          selectedKeys={validSelected}
          onApplyEdit={handleApplyEdit}
        />
      </div>
      <StepBidsPreview
        context={context}
        onFieldChange={(field, value) => {
          void onFieldChange(field, value)
        }}
        onLoadFile={onLoadFile}
      />
    </div>
  )
}

// ── "Select all similar" chip bar ──────────────────────────────────────

function SelectByChips({
  files,
  onSelectMany
}: {
  files: TreeFile[]
  onSelectMany: (keys: string[], on: boolean) => void
}): React.ReactElement | null {
  const { datatypes, suffixes } = useMemo(() => buildSelectChips(files), [files])
  if (datatypes.length === 0 && suffixes.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Text size="1" color="gray">Select all:</Text>
      {datatypes.map((c) => (
        <button
          key={`dt:${c.label}`}
          type="button"
          onClick={() => onSelectMany(c.keys, true)}
          className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--blue-6)] bg-[var(--blue-3)] text-[var(--blue-11)] hover:bg-[var(--blue-4)] cursor-pointer"
        >
          {c.label}/ ({c.count})
        </button>
      ))}
      {suffixes.map((c) => (
        <button
          key={`sfx:${c.label}`}
          type="button"
          onClick={() => onSelectMany(c.keys, true)}
          className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--gray-6)] bg-[var(--gray-3)] text-[var(--gray-11)] hover:bg-[var(--gray-4)] cursor-pointer"
        >
          _{c.label} ({c.count})
        </button>
      ))}
    </div>
  )
}

// ── On-disk subject rename form ────────────────────────────────────────

interface SubjectRenameDiskFormProps {
  files: TreeFile[]
  bidsDir: string
  onRenamed: () => Promise<void> | void
}

function SubjectRenameDiskForm({
  files,
  bidsDir,
  onRenamed
}: SubjectRenameDiskFormProps): React.ReactElement | null {
  // Use ALL subjects present in the tree (deduped). One draft per subject.
  const subjects = useMemo(
    () => [...new Set(files.map((f) => f.subject))].filter(Boolean).sort(),
    [files]
  )
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'ok'; subject: string; renamedFiles: number; participantsUpdated: boolean }
    | { kind: 'error'; subject: string; message: string }
  >({ kind: 'idle' })

  if (subjects.length === 0) return null

  const handleApply = async (oldLabel: string): Promise<void> => {
    const newLabel = (drafts[oldLabel] ?? '').replace(/[^a-zA-Z0-9]/g, '')
    if (!newLabel || newLabel === oldLabel) return
    setBusy(oldLabel)
    setStatus({ kind: 'idle' })
    try {
      const result = (await electron.ipcRenderer.invoke('bids:rename-subject', {
        bidsDir,
        oldLabel,
        newLabel
      })) as {
        success: boolean
        renamedFiles: number
        participantsUpdated: boolean
        error?: string
      }
      if (result.success) {
        setStatus({
          kind: 'ok',
          subject: newLabel,
          renamedFiles: result.renamedFiles,
          participantsUpdated: result.participantsUpdated
        })
        setDrafts((prev) => {
          const next = { ...prev }
          delete next[oldLabel]
          return next
        })
        await onRenamed()
      } else {
        setStatus({ kind: 'error', subject: oldLabel, message: result.error ?? 'Rename failed' })
      }
    } catch (err) {
      setStatus({
        kind: 'error',
        subject: oldLabel,
        message: err instanceof Error ? err.message : String(err)
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Text size="2" weight="medium">Rename subject (on disk)</Text>
      <Text size="1" color="gray">
        Moves <span className="font-mono">sub-&lt;old&gt;/</span> →{' '}
        <span className="font-mono">sub-&lt;new&gt;/</span>, rewrites every file basename, and
        updates participants.tsv. Applied immediately — not staged with sidecar edits.
      </Text>
      <div className="border border-[var(--gray-5)] rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[var(--gray-3)]">
            <tr>
              <th className="text-left px-2 py-1 font-medium">Current</th>
              <th className="text-left px-2 py-1 font-medium">New label</th>
              <th className="px-2 py-1 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s} className="border-t border-[var(--gray-4)]">
                <td className="px-2 py-1 font-mono">sub-{s}</td>
                <td className="px-2 py-1">
                  <TextField.Root
                    size="1"
                    placeholder={s}
                    value={drafts[s] ?? ''}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [s]: e.target.value }))
                    }
                  />
                </td>
                <td className="px-2 py-1">
                  <Button
                    size="1"
                    variant="soft"
                    disabled={busy !== null || !drafts[s] || drafts[s] === s}
                    onClick={() => void handleApply(s)}
                  >
                    {busy === s ? 'Renaming…' : 'Rename'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {status.kind === 'ok' && (
        <Text size="1" color="green">
          Renamed to sub-{status.subject} — {status.renamedFiles} file
          {status.renamedFiles !== 1 ? 's' : ''} rewritten
          {status.participantsUpdated ? ', participants.tsv updated' : ''}.
        </Text>
      )}
      {status.kind === 'error' && (
        <Text size="1" color="red">
          Rename failed for sub-{status.subject}: {status.message}
        </Text>
      )}
    </div>
  )
}

// ── View editor (post-write, on-disk; stages edits, applies on save) ───

/**
 * Staged-edit shape: outer key = absolute sidecar path, inner = field → value.
 * `undefined` is the sentinel for "delete this key from the JSON on save",
 * matching updateSidecar's semantics. Edits live entirely in renderer state
 * until the user clicks "Save edits", which calls bids:apply-staged-edits
 * and re-reads the tree.
 */
type Staged = Map<string, Map<string, unknown>>

function setStagedEdit(prev: Staged, sidecarPath: string, field: string, value: unknown): Staged {
  const next = new Map(prev)
  const inner = new Map(next.get(sidecarPath) ?? [])
  inner.set(field, value)
  next.set(sidecarPath, inner)
  return next
}

function countStagedEdits(staged: Staged): number {
  let n = 0
  for (const inner of staged.values()) n += inner.size
  return n
}

function flattenStaged(staged: Staged): SidecarStagedEdit[] {
  const out: SidecarStagedEdit[] = []
  for (const [sidecarPath, inner] of staged) {
    for (const [field, value] of inner) {
      out.push({ sidecarPath, field, value })
    }
  }
  return out
}

function diskToTreeFile(f: BidsDiskFile, stagedForFile: Map<string, unknown> | undefined): TreeFile {
  const merged: Record<string, unknown> = { ...f.sidecar }
  if (stagedForFile) {
    for (const [k, v] of stagedForFile) {
      if (v === undefined) delete merged[k]
      else merged[k] = v
    }
  }
  return {
    key: f.niftiPath,
    subject: f.subject,
    session: f.session,
    datatype: f.datatype,
    filename: f.filename,
    bidsPath: f.bidsPath,
    sidecar: merged,
    sidecarPath: f.sidecarPath ?? undefined
  }
}

export function BidsViewEditor({ context }: AdapterProps): React.ReactElement {
  const bidsDir = (context.bids_dir as string) || ''
  const [diskFiles, setDiskFiles] = useState<BidsDiskFile[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [staged, setStaged] = useState<Staged>(new Map())
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [saveStatus, setSaveStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'saving' }
    | { kind: 'done'; result: BidsApplyEditsResult }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' })

  const reload = useCallback(async (): Promise<void> => {
    if (!bidsDir) return
    setLoading(true)
    setLoadError(null)
    try {
      const result = await electron.ipcRenderer.invoke('bids:read-tree', bidsDir)
      if (result.success) {
        setDiskFiles(result.files as BidsDiskFile[])
      } else {
        setLoadError(result.error ?? 'Failed to read BIDS tree')
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [bidsDir])

  useEffect(() => {
    void reload()
  }, [reload])

  // Build TreeFiles with staged overrides merged in so the inspector reads
  // what WILL be on disk after save.
  const files = useMemo(
    () => diskFiles.map((f) => diskToTreeFile(f, f.sidecarPath ? staged.get(f.sidecarPath) : undefined)),
    [diskFiles, staged]
  )
  // Map TreeFile.key (niftiPath) → sidecarPath for edit routing.
  const sidecarByKey = useMemo(() => {
    const m = new Map<string, string>()
    for (const f of diskFiles) if (f.sidecarPath) m.set(f.niftiPath, f.sidecarPath)
    return m
  }, [diskFiles])

  const validSelected = useMemo(() => {
    const valid = new Set<string>()
    const fileKeys = new Set(files.map((f) => f.key))
    for (const k of selectedKeys) if (fileKeys.has(k)) valid.add(k)
    return valid
  }, [files, selectedKeys])

  const toggle = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectMany = useCallback((keys: string[], on: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      for (const k of keys) {
        if (on) next.add(k)
        else next.delete(k)
      }
      return next
    })
  }, [])

  const handleApplyEdit = useCallback(
    (keys: string[], field: string, value: unknown) => {
      setStaged((prev) => {
        let next = prev
        for (const key of keys) {
          const sidecarPath = sidecarByKey.get(key)
          if (!sidecarPath) continue
          next = setStagedEdit(next, sidecarPath, field, value)
        }
        return next
      })
      setSaveStatus({ kind: 'idle' })
    },
    [sidecarByKey]
  )

  const handleSave = useCallback(async () => {
    setSaveStatus({ kind: 'saving' })
    try {
      const edits = flattenStaged(staged)
      const result = (await electron.ipcRenderer.invoke('bids:apply-staged-edits', {
        edits
      })) as BidsApplyEditsResult
      setSaveStatus({ kind: 'done', result })
      if (result.failed.length === 0) {
        setStaged(new Map())
      }
      await reload()
    } catch (err) {
      setSaveStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }, [staged, reload])

  const handleDiscard = useCallback(() => {
    setStaged(new Map())
    setSaveStatus({ kind: 'idle' })
  }, [])

  if (!bidsDir) {
    return (
      <Callout.Root color="amber">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          No BIDS directory in context yet — the Write BIDS step may have failed or been
          skipped. Go back to the previous section and run it.
        </Callout.Text>
      </Callout.Root>
    )
  }

  const stagedCount = countStagedEdits(staged)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <Text size="2" weight="medium">BIDS dataset on disk</Text>
          <Text size="1" color="gray" className="font-mono">{bidsDir}</Text>
        </div>
        <div className="flex items-center gap-2">
          {stagedCount > 0 && (
            <Badge color="amber" variant="soft">{stagedCount} pending</Badge>
          )}
          <Button
            size="1"
            variant="soft"
            color="gray"
            disabled={stagedCount === 0 || saveStatus.kind === 'saving'}
            onClick={handleDiscard}
          >
            Discard
          </Button>
          <Button
            size="1"
            disabled={stagedCount === 0 || saveStatus.kind === 'saving'}
            onClick={() => void handleSave()}
          >
            {saveStatus.kind === 'saving' ? 'Saving…' : 'Save edits'}
          </Button>
        </div>
      </div>

      {loadError && (
        <Callout.Root color="red" size="1">
          <Callout.Icon><InfoCircledIcon /></Callout.Icon>
          <Callout.Text>{loadError}</Callout.Text>
        </Callout.Root>
      )}

      {saveStatus.kind === 'done' && saveStatus.result.failed.length === 0 && (
        <Callout.Root color="green" size="1">
          <Callout.Icon><InfoCircledIcon /></Callout.Icon>
          <Callout.Text>Wrote {saveStatus.result.applied} edit{saveStatus.result.applied !== 1 ? 's' : ''} to disk.</Callout.Text>
        </Callout.Root>
      )}

      {saveStatus.kind === 'done' && saveStatus.result.failed.length > 0 && (
        <Callout.Root color="red" size="1">
          <Callout.Icon><InfoCircledIcon /></Callout.Icon>
          <Callout.Text>
            {saveStatus.result.applied} applied, {saveStatus.result.failed.length} failed. Failed
            edits remain staged so you can fix and retry.
          </Callout.Text>
        </Callout.Root>
      )}

      {saveStatus.kind === 'error' && (
        <Callout.Root color="red" size="1">
          <Callout.Icon><InfoCircledIcon /></Callout.Icon>
          <Callout.Text>{saveStatus.message}</Callout.Text>
        </Callout.Root>
      )}

      {loading && files.length === 0 ? (
        <Text size="1" color="gray">Loading dataset…</Text>
      ) : files.length === 0 ? (
        <Callout.Root color="amber" size="1">
          <Callout.Icon><InfoCircledIcon /></Callout.Icon>
          <Callout.Text>
            No NIfTI files found under <span className="font-mono">{bidsDir}</span>. The Write
            step may have failed to copy files into the dataset.
          </Callout.Text>
        </Callout.Root>
      ) : (
        <>
          <SubjectRenameDiskForm
            files={files}
            bidsDir={bidsDir}
            onRenamed={async () => {
              setSelectedKeys(new Set())
              setStaged(new Map())
              await reload()
            }}
          />
          <SelectByChips files={files} onSelectMany={selectMany} />
          <div className="grid grid-cols-2 gap-3">
            <FileTree
              files={files}
              selectedKeys={validSelected}
              onToggle={toggle}
              onSelectMany={selectMany}
            />
            <Inspector
              files={files}
              selectedKeys={validSelected}
              onApplyEdit={handleApplyEdit}
            />
          </div>
        </>
      )}
    </div>
  )
}
