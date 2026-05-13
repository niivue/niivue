import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Text, TextField, Button, Callout, Badge, Select } from '@radix-ui/themes'
import { InfoCircledIcon, ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import type {
  BidsApplyEditsResult,
  BidsDiskFile,
  BidsSeriesMapping,
  BidsValidationIssue,
  BidsValidationResult,
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
import {
  buildSidecarFieldRows,
  groupRowsByStatus,
  issuesForFile,
  normalizeIssuePath,
  type BidsMetadataDef,
  type SidecarFieldRow
} from './bidsViewSidecarModel.js'
import { TsvSpreadsheetEditor } from './TsvSpreadsheetEditor.js'

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
    mappings: mappings.map((m) => (m.subject === oldLabel ? { ...m, subject: newLabel } : m)),
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
      m.subject === subjectLabel && m.session === oldSession ? { ...m, session: newSession } : m
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
      <Text size="2" weight="medium">
        Subjects & sessions
      </Text>
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
                    <Text size="1" color="gray">
                      (no sessions)
                    </Text>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {sub.sessions.map((ses) => (
                        <div key={ses.label} className="flex items-center gap-0.5">
                          <Text size="1" color="gray">
                            ses-
                          </Text>
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
    <div
      className="border border-[var(--gray-5)] rounded p-2 overflow-y-auto"
      style={{ maxHeight: 480, minHeight: 240 }}
    >
      {groups.length === 0 && (
        <Text size="1" color="gray">
          No files yet — heuristics may still be running. If this stays empty, go back to Filter and
          confirm at least one series is selected.
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
              <Text size="2" weight="medium" className="font-mono">
                {g.subject ? `sub-${g.subject}` : '(dataset)'}
              </Text>
              <Badge size="1" variant="soft" color="gray">
                {subjectFileKeys.length}
              </Badge>
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
                        checked={
                          sessionFileKeys.length > 0 &&
                          sessionFileKeys.every((k) => selectedKeys.has(k))
                        }
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
                                checked={
                                  dtFileKeys.length > 0 &&
                                  dtFileKeys.every((k) => selectedKeys.has(k))
                                }
                                onChange={(e) => onSelectMany(dtFileKeys, e.target.checked)}
                                className="w-3 h-3"
                              />
                              <Text size="1" color="blue" className="font-mono">
                                {dt.datatype ? `${dt.datatype}/` : '(top-level files)'}
                              </Text>
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
                                      {f.kind === 'tsv' && (
                                        <Badge size="1" variant="soft" color="gray">
                                          tsv
                                        </Badge>
                                      )}
                                      <Text size="1" className="font-mono truncate">
                                        {f.filename}
                                      </Text>
                                    </div>
                                    {sidecarName && (
                                      <div
                                        className={`ml-10 flex items-center gap-1 hover:bg-[var(--gray-3)] rounded px-1 cursor-pointer ${
                                          selectedKeys.has(f.key) ? 'bg-[var(--accent-3)]' : ''
                                        }`}
                                        onClick={() => onToggle(f.key)}
                                        title={`Sidecar: ${f.sidecarPath}`}
                                      >
                                        <span className="text-[10px] text-[var(--gray-10)] w-3 inline-block">
                                          ↳
                                        </span>
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
      <div
        className="border border-[var(--gray-5)] rounded p-3 flex items-center justify-center"
        style={{ minHeight: 240 }}
      >
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
    <div
      className="border border-[var(--gray-5)] rounded p-3 flex flex-col gap-3"
      style={{ minHeight: 240 }}
    >
      <div className="flex items-center justify-between">
        <Text size="2" weight="medium">
          Sidecar editor — {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}{' '}
          selected
        </Text>
      </div>
      {distinctSidecarPaths.length > 0 && (
        <div className="flex flex-col gap-0.5 -mt-1">
          <Text size="1" color="gray">
            Source JSON{distinctSidecarPaths.length !== 1 ? 's' : ''}:
          </Text>
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
  const subjects = useMemo(() => (context.subjects as DetectedSubject[]) || [], [context.subjects])

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
    (nextMappings: BidsSeriesMapping[], nextSubjects: DetectedSubject[]): void => {
      void (async (): Promise<void> => {
        await onFieldChange('series_list', nextMappings)
        await onFieldChange('subjects', nextSubjects)
      })()
    },
    [onFieldChange]
  )

  return (
    <div className="flex flex-col gap-4">
      <SubjectRelabelForm mappings={mappings} subjects={subjects} onUpdate={handleRelabel} />
      <SelectByChips files={files} onSelectMany={selectMany} />
      <div className="grid grid-cols-2 gap-3">
        <FileTree
          files={files}
          selectedKeys={validSelected}
          onToggle={toggle}
          onSelectMany={selectMany}
        />
        <Inspector files={files} selectedKeys={validSelected} onApplyEdit={handleApplyEdit} />
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
      <Text size="1" color="gray">
        Select all:
      </Text>
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
      <Text size="2" weight="medium">
        Rename subject (on disk)
      </Text>
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
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [s]: e.target.value }))}
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

function diskToTreeFile(
  f: BidsDiskFile,
  stagedForFile: Map<string, unknown> | undefined
): TreeFile {
  const merged: Record<string, unknown> = { ...f.sidecar }
  if (stagedForFile) {
    for (const [k, v] of stagedForFile) {
      if (v === undefined) delete merged[k]
      else merged[k] = v
    }
  }
  return {
    key: f.niftiPath,
    kind: f.kind,
    subject: f.subject,
    session: f.session,
    datatype: f.datatype,
    filename: f.filename,
    bidsPath: f.bidsPath,
    sidecar: merged,
    sidecarPath: f.sidecarPath ?? undefined
  }
}

/** Process-level cache for the BIDS metadata catalog — ~160 KB; fetched once. */
let metadataDefsCache: Record<string, BidsMetadataDef> | null = null
let metadataDefsPromise: Promise<Record<string, BidsMetadataDef> | null> | null = null

async function fetchMetadataDefs(): Promise<Record<string, BidsMetadataDef> | null> {
  if (metadataDefsCache) return metadataDefsCache
  if (!metadataDefsPromise) {
    metadataDefsPromise = (async (): Promise<Record<string, BidsMetadataDef> | null> => {
      try {
        const res = await electron.ipcRenderer.invoke('bids:get-metadata-defs')
        if (res?.success) {
          metadataDefsCache = res.metadata as Record<string, BidsMetadataDef>
          return metadataDefsCache
        }
      } catch {
        /* swallow — inspector will fall back to label-only rendering */
      }
      return null
    })()
  }
  return metadataDefsPromise
}

export function BidsViewEditor({ context }: AdapterProps): React.ReactElement {
  const bidsDir = (context.bids_dir as string) || ''
  const [diskFiles, setDiskFiles] = useState<BidsDiskFile[]>([])
  const [validation, setValidation] = useState<BidsValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const [metadataDefs, setMetadataDefs] = useState<Record<string, BidsMetadataDef> | null>(
    metadataDefsCache
  )
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [staged, setStaged] = useState<Staged>(new Map())
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  // Focus mode is owned at this level so the dataset-wide errors panel and
  // the per-file inspector can both drive it. The inspector auto-clears it
  // when there are no remaining errors for the current selection.
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'saving' }
    | { kind: 'done'; result: BidsApplyEditsResult }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' })

  const reload = useCallback(async (): Promise<void> => {
    if (!bidsDir) return
    setLoading(true)
    setValidating(true)
    setLoadError(null)
    // Tree-read and validation are independent: a validator failure should
    // not blank the tree, so we settle them separately rather than via
    // Promise.all (which would reject the whole batch on a single failure).
    const [treeSettled, valSettled] = await Promise.allSettled([
      electron.ipcRenderer.invoke('bids:read-tree', bidsDir),
      electron.ipcRenderer.invoke('bids:validate-tree', bidsDir)
    ])
    if (treeSettled.status === 'fulfilled') {
      const treeRes = treeSettled.value
      if (treeRes?.success) setDiskFiles(treeRes.files as BidsDiskFile[])
      else setLoadError(treeRes?.error ?? 'Failed to read BIDS tree')
    } else {
      const reason = treeSettled.reason
      setLoadError(reason instanceof Error ? reason.message : String(reason))
    }
    if (valSettled.status === 'fulfilled') {
      const valRes = valSettled.value
      if (valRes?.success) setValidation(valRes.result as BidsValidationResult)
      else setValidation(null)
    } else {
      // Surface the validator failure to the console so devtools shows it,
      // but don't block the tree from rendering.
      console.warn('bids:validate-tree failed:', valSettled.reason)
      setValidation(null)
    }
    setLoading(false)
    setValidating(false)
  }, [bidsDir])

  useEffect(() => {
    void reload()
  }, [reload])

  // Fetch the schema metadata catalog once on first mount. Cached at module
  // scope so re-entering the View step doesn't re-pay the IPC.
  useEffect(() => {
    if (metadataDefs) return
    void fetchMetadataDefs().then((defs) => {
      if (defs) setMetadataDefs(defs)
    })
  }, [metadataDefs])

  // Build TreeFiles with staged overrides merged in so the inspector reads
  // what WILL be on disk after save.
  const files = useMemo(
    () =>
      diskFiles.map((f) =>
        diskToTreeFile(f, f.sidecarPath ? staged.get(f.sidecarPath) : undefined)
      ),
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

  const [pendingSimilarity, setPendingSimilarity] = useState<PendingSimilarity | null>(null)

  // Drop a stale prompt the moment the user changes their tree selection —
  // a banner pointing at the previous file's edit is more confusing than
  // helpful once the focus has moved.
  useEffect(() => {
    setPendingSimilarity(null)
  }, [selectedKeys])

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
      // After committing the edit, offer to broadcast the same value to other
      // files in the same (datatype + suffix) bucket whose current value
      // differs. We skip clears (`value === undefined`) — propagating a
      // delete is rarely what the user wants — and skip multi-group edits
      // (when the selected files span multiple buckets, "similar" is
      // ambiguous).
      if (value === undefined) {
        setPendingSimilarity(null)
        return
      }
      const similar = findSimilarCandidates(files, keys, field, value)
      setPendingSimilarity(similar ? { field, value, ...similar } : null)
    },
    [sidecarByKey, files]
  )

  const acceptSimilarity = useCallback(() => {
    if (!pendingSimilarity) return
    const { field, value, keys } = pendingSimilarity
    handleApplyEdit(keys, field, value)
    setPendingSimilarity(null)
  }, [pendingSimilarity, handleApplyEdit])

  const dismissSimilarity = useCallback(() => setPendingSimilarity(null), [])

  // Drive the inspector from the dataset-wide errors panel: pick the file
  // implicated by the issue, focus the offending field, and scroll the
  // field row into view once the inspector has mounted/rerendered. Two
  // animation frames give the new SchemaAwareInspector instance time to
  // render its row tree before we ask the DOM for the row element.
  //
  // TSV rows open the inline spreadsheet editor (via selection); they
  // don't have field-level focus.
  const fixErrorFromPanel = useCallback((file: TreeFile, field: string): void => {
    setSelectedKeys(new Set([file.key]))
    if (file.kind === 'tsv') {
      setFocusedField(null)
      return
    }
    // NIfTI row but no field to focus — just land on the file.
    if (!field) {
      setFocusedField(null)
      return
    }
    setFocusedField(field)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`bids-field-row-${field}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    })
  }, [])

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
          No BIDS directory in context yet — the Write BIDS step may have failed or been skipped. Go
          back to the previous section and run it.
        </Callout.Text>
      </Callout.Root>
    )
  }

  const stagedCount = countStagedEdits(staged)
  const errorCount = validation?.errors.length ?? 0
  const warningCount = validation?.warnings.length ?? 0
  const allIssues = useMemo(
    () => [...(validation?.errors ?? []), ...(validation?.warnings ?? [])],
    [validation]
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <Text size="2" weight="medium">
            BIDS dataset on disk
          </Text>
          <Text size="1" color="gray" className="font-mono">
            {bidsDir}
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Text size="1" color="gray">
            {files.length} file{files.length !== 1 ? 's' : ''} ·{' '}
            <span className={errorCount > 0 ? 'text-[var(--red-11)]' : ''}>
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>{' '}
            ·{' '}
            <span className={warningCount > 0 ? 'text-[var(--amber-11)]' : ''}>
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </span>
            {validating && ' · validating…'}
          </Text>
          {stagedCount > 0 && (
            <Badge color="amber" variant="soft">
              {stagedCount} pending
            </Badge>
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
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>{loadError}</Callout.Text>
        </Callout.Root>
      )}

      {saveStatus.kind === 'done' && saveStatus.result.failed.length === 0 && (
        <Callout.Root color="green" size="1">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Wrote {saveStatus.result.applied} edit{saveStatus.result.applied !== 1 ? 's' : ''} to
            disk.
          </Callout.Text>
        </Callout.Root>
      )}

      {saveStatus.kind === 'done' && saveStatus.result.failed.length > 0 && (
        <Callout.Root color="red" size="1">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            {saveStatus.result.applied} applied, {saveStatus.result.failed.length} failed. Failed
            edits remain staged so you can fix and retry.
          </Callout.Text>
        </Callout.Root>
      )}

      {saveStatus.kind === 'error' && (
        <Callout.Root color="red" size="1">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>{saveStatus.message}</Callout.Text>
        </Callout.Root>
      )}

      {loading && files.length === 0 ? (
        <Text size="1" color="gray">
          Loading dataset…
        </Text>
      ) : files.length === 0 ? (
        <Callout.Root color="amber" size="1">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            No NIfTI files found under <span className="font-mono">{bidsDir}</span>. The Write step
            may have failed to copy files into the dataset.
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
          <SelectionSummary
            files={files}
            selectedKeys={validSelected}
            onClearSelection={() => setSelectedKeys(new Set())}
          />
          <DatasetErrorsPanel
            errors={validation?.errors ?? []}
            files={files}
            onFix={fixErrorFromPanel}
          />
          {pendingSimilarity && (
            <SimilarFilesPrompt
              pending={pendingSimilarity}
              onApply={acceptSimilarity}
              onDismiss={dismissSimilarity}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <FileTree
              files={files}
              selectedKeys={validSelected}
              onToggle={toggle}
              onSelectMany={selectMany}
            />
            <SchemaAwareInspector
              files={files}
              selectedKeys={validSelected}
              allIssues={allIssues}
              metadataDefs={metadataDefs}
              focusedField={focusedField}
              onFocusField={setFocusedField}
              onApplyEdit={handleApplyEdit}
              onReload={reload}
            />
          </div>
        </>
      )}
    </div>
  )
}

// ── Schema-aware inspector (View step) ────────────────────────────────

interface SchemaAwareInspectorProps {
  files: TreeFile[]
  selectedKeys: Set<string>
  allIssues: BidsValidationIssue[]
  metadataDefs: Record<string, BidsMetadataDef> | null
  focusedField: string | null
  onFocusField: (field: string | null) => void
  onApplyEdit: (keys: string[], field: string, value: unknown) => void
  onReload: () => Promise<void>
}

function SchemaAwareInspector({
  files,
  selectedKeys,
  allIssues,
  metadataDefs,
  focusedField,
  onFocusField,
  onApplyEdit,
  onReload
}: SchemaAwareInspectorProps): React.ReactElement {
  const selectedFiles = useMemo(
    () => files.filter((f) => selectedKeys.has(f.key)),
    [files, selectedKeys]
  )
  // Per-file issues used for the validator messages panel — when one file
  // is selected we show its issues; with multi-select, intersect to issues
  // common to every selected file so the user isn't misled.
  const sharedIssues = useMemo(
    () => commonIssuesAcross(selectedFiles, allIssues),
    [selectedFiles, allIssues]
  )
  // Build inspector rows from the union of sidecar keys across the selection
  // plus all issues that touch any selected file. Values shared across files
  // are shown as-is; values that vary are marked `(varies)`.
  const rows = useMemo(
    () => buildMergedSidecarRows(selectedFiles, allIssues, metadataDefs),
    [selectedFiles, allIssues, metadataDefs]
  )
  const sections = useMemo(() => groupRowsByStatus(rows), [rows])

  // Focus mode is owned by BidsViewEditor (so the top-level errors panel can
  // open it cross-selection) but the auto-release condition lives here, where
  // we know the issues for the CURRENT selection. The moment the selection
  // has no remaining errors, drop focus so the inspector goes back to normal.
  const errorCount = useMemo(
    () => sharedIssues.filter((i) => i.severity === 'error').length,
    [sharedIssues]
  )
  useEffect(() => {
    if (focusedField && errorCount === 0) onFocusField(null)
  }, [focusedField, errorCount, onFocusField])

  const fixError = useCallback(
    (field: string): void => {
      onFocusField(field)
      // Defer scroll to the next frame so the row is rendered (and any
      // "dimmed" wrapper has settled) before we try to bring it into view.
      requestAnimationFrame(() => {
        const el = document.getElementById(`bids-field-row-${field}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    },
    [onFocusField]
  )

  if (selectedFiles.length === 0) {
    return (
      <div
        className="border border-[var(--gray-5)] rounded p-3 flex items-center justify-center"
        style={{ minHeight: 240 }}
      >
        <Text size="1" color="gray">
          Select one or more files in the tree to edit sidecar fields and see validator warnings.
        </Text>
      </div>
    )
  }

  // TSV rows: render an inline spreadsheet editor for single selections.
  // Multi-select TSVs fall back to a summary + validator messages, since
  // bulk editing arbitrary tabular files isn't well-defined.
  if (selectedFiles.every((f) => f.kind === 'tsv')) {
    const singleTsv = selectedFiles.length === 1 ? selectedFiles[0] : null
    if (singleTsv) {
      return (
        <div className="flex flex-col gap-3">
          <TsvSpreadsheetEditor
            tsvPath={singleTsv.key}
            bidsPath={singleTsv.bidsPath}
            filename={singleTsv.filename}
            onCloseAfterSave={() => void onReload()}
          />
          <ValidatorMessagesPanel issues={sharedIssues} onFixError={fixError} />
        </div>
      )
    }
    return (
      <div
        className="border border-[var(--gray-5)] rounded p-3 flex flex-col gap-3"
        style={{ minHeight: 240 }}
      >
        <Text size="2" weight="medium">
          {selectedFiles.length} TSV files selected
        </Text>
        <Callout.Root color="gray" size="1">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Select a single TSV row to edit it inline. Validator messages common to all selected
            TSVs are listed below.
          </Callout.Text>
        </Callout.Root>
        <ValidatorMessagesPanel issues={sharedIssues} onFixError={fixError} />
      </div>
    )
  }

  const singleFile = selectedFiles.length === 1 ? selectedFiles[0] : null
  const keys = [...selectedKeys]

  return (
    <div
      className="border border-[var(--gray-5)] rounded p-3 flex flex-col gap-3"
      style={{ minHeight: 240 }}
    >
      <div className="flex items-center justify-between">
        <Text size="2" weight="medium">
          Sidecar editor — {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}{' '}
          selected
        </Text>
        <Text size="1" color="gray">
          {errorCount} errors · {sharedIssues.filter((i) => i.severity === 'warning').length}{' '}
          warnings
        </Text>
      </div>

      {focusedField && (
        <Callout.Root size="1" color="red">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span>
                Fix the <span className="font-mono">{focusedField}</span> field — other rows are
                dimmed until errors are resolved.
              </span>
              <Button size="1" variant="soft" onClick={() => onFocusField(null)}>
                Exit focus
              </Button>
            </div>
          </Callout.Text>
        </Callout.Root>
      )}

      {singleFile && <SidecarPathHints file={singleFile} />}

      <div className="overflow-y-auto flex flex-col gap-3" style={{ maxHeight: 520 }}>
        {sections.map((section) => (
          <FieldSection
            key={section.label}
            label={section.label}
            rows={section.rows}
            focusedField={focusedField}
            onCommit={(field, value) => onApplyEdit(keys, field, value)}
            onClear={(field) => onApplyEdit(keys, field, undefined)}
          />
        ))}
        <NewFieldRowEditor
          onAdd={(field, value) => onApplyEdit(keys, field, value)}
          knownFields={new Set(rows.map((r) => r.field))}
        />
      </div>

      <ValidatorMessagesPanel issues={sharedIssues} onFixError={fixError} />

      {singleFile && <RawJsonView file={singleFile} />}
    </div>
  )
}

/**
 * Build inspector rows for a selection of files. For each known field, the
 * common value is preserved; varying values render as `(varies)` and writing
 * a new value applies to every selected file. Issues are matched against
 * each file's BIDS path / sidecar path and aggregated, so a recommendation
 * that fires for any selected file surfaces here.
 */
function buildMergedSidecarRows(
  selectedFiles: TreeFile[],
  allIssues: BidsValidationIssue[],
  defsByName: Record<string, BidsMetadataDef> | null
): (SidecarFieldRow & { varies: boolean })[] {
  if (selectedFiles.length === 0) return []
  // Union of sidecar fields across the selection.
  const fieldSet = new Set<string>()
  for (const f of selectedFiles) for (const k of Object.keys(f.sidecar)) fieldSet.add(k)
  // Plus any field a validator issue names against any selected file.
  const aggregatedIssues: BidsValidationIssue[] = []
  for (const f of selectedFiles) {
    const sidecarBidsPath = jsonSidecarPathFor(f.bidsPath)
    for (const i of issuesForFile(allIssues, f.bidsPath, sidecarBidsPath)) {
      aggregatedIssues.push(i)
      if (i.subCode) fieldSet.add(i.subCode)
    }
  }

  // Use the first file as the "shared" sidecar; per-row we compute `varies`
  // independently so we don't lie about commonality.
  const firstSidecar = selectedFiles[0].sidecar
  const baseRows = buildSidecarFieldRows(firstSidecar, aggregatedIssues, defsByName)

  // Annotate each row with `varies` across the selection.
  return baseRows.map((row) => {
    let varies = false
    if (selectedFiles.length > 1) {
      const first = selectedFiles[0].sidecar[row.field]
      for (let i = 1; i < selectedFiles.length; i++) {
        if (!sidecarEqual(first, selectedFiles[i].sidecar[row.field])) {
          varies = true
          break
        }
      }
    }
    return { ...row, varies }
  })
}

function sidecarEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === undefined || b === undefined) return false
  if (typeof a !== typeof b) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (!sidecarEqual(a[i], b[i])) return false
    return true
  }
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  return false
}

function commonIssuesAcross(
  selectedFiles: TreeFile[],
  allIssues: BidsValidationIssue[]
): BidsValidationIssue[] {
  if (selectedFiles.length === 0) return []
  if (selectedFiles.length === 1) {
    const f = selectedFiles[0]
    const sidecarBidsPath = jsonSidecarPathFor(f.bidsPath)
    return issuesForFile(allIssues, f.bidsPath, sidecarBidsPath)
  }
  // Multi-select: intersect by (code, subCode) tuples so we only show issues
  // every selected file has in common — anything else is per-file noise.
  const perFile = selectedFiles.map((f) => {
    const sidecarBidsPath = jsonSidecarPathFor(f.bidsPath)
    return issuesForFile(allIssues, f.bidsPath, sidecarBidsPath)
  })
  const keyOf = (i: BidsValidationIssue): string => `${i.code ?? ''}|${i.subCode ?? ''}`
  const sharedKeys = new Set(perFile[0].map(keyOf))
  for (let i = 1; i < perFile.length; i++) {
    const ks = new Set(perFile[i].map(keyOf))
    for (const k of [...sharedKeys]) if (!ks.has(k)) sharedKeys.delete(k)
  }
  const seen = new Set<string>()
  const out: BidsValidationIssue[] = []
  for (const i of perFile[0]) {
    const k = keyOf(i)
    if (!sharedKeys.has(k) || seen.has(k)) continue
    seen.add(k)
    out.push(i)
  }
  return out
}

/**
 * Pending state for the "apply to similar files" prompt the View step
 * surfaces after every edit. `keys` are the file keys (TreeFile.key) that
 * would receive the broadcast — typically the not-yet-matching files in
 * the same (datatype + suffix) bucket as the just-edited file(s).
 */
interface PendingSimilarity {
  field: string
  value: unknown
  keys: string[]
  datatype: string
  suffix: string
}

/** Extract the BIDS suffix from a NIfTI filename (`sub-01_T1w.nii.gz` → `T1w`). */
function suffixFromFilename(filename: string): string {
  const stem = filename.replace(/\.(nii\.gz|nii|json|tsv)$/, '')
  const parts = stem.split('_')
  return parts[parts.length - 1] ?? ''
}

/** Loose equality used to decide whether a sibling file already matches the
 *  value the user just committed. Strings/numbers/booleans use ===;
 *  objects/arrays compare via JSON to avoid spurious "different" prompts
 *  when arrays are deeply equal. */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === undefined || b === undefined) return false
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return false
  if (typeof a === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      return false
    }
  }
  return false
}

/**
 * Given a committed edit, return the set of OTHER files in the same
 * (datatype, suffix) bucket whose current value for that field differs.
 * Returns `null` when:
 *   - the just-edited files span multiple buckets (ambiguous similarity)
 *   - or no remaining candidate has a differing value
 * In both cases the caller skips the prompt rather than nag.
 */
function findSimilarCandidates(
  files: TreeFile[],
  affectedKeys: string[],
  field: string,
  value: unknown
): { keys: string[]; datatype: string; suffix: string } | null {
  const affected = new Set(affectedKeys)
  const buckets = new Set<string>()
  for (const f of files) {
    if (!affected.has(f.key)) continue
    buckets.add(`${f.datatype}|${suffixFromFilename(f.filename)}`)
  }
  if (buckets.size !== 1) return null
  const [groupId] = [...buckets]
  const [datatype, suffix] = groupId.split('|')
  const keys: string[] = []
  for (const f of files) {
    if (affected.has(f.key)) continue
    if (f.datatype !== datatype) continue
    if (suffixFromFilename(f.filename) !== suffix) continue
    if (valuesEqual(f.sidecar[field], value)) continue
    keys.push(f.key)
  }
  if (keys.length === 0) return null
  return { keys, datatype, suffix }
}

/**
 * Map a NIfTI or TSV BIDS path to the paired `.json` sidecar path. For
 * NIfTI this strips `.nii(.gz)`; for TSV it strips `.tsv`. Any other
 * extension is returned unchanged — callers treat the result as a
 * candidate, not a promise that the sidecar exists.
 */
function jsonSidecarPathFor(bidsPath: string): string {
  if (bidsPath.endsWith('.nii.gz')) return bidsPath.slice(0, -'.nii.gz'.length) + '.json'
  if (bidsPath.endsWith('.nii')) return bidsPath.slice(0, -'.nii'.length) + '.json'
  if (bidsPath.endsWith('.tsv')) return bidsPath.slice(0, -'.tsv'.length) + '.json'
  return bidsPath
}

/**
 * Find the TreeFile whose data path or paired sidecar path matches the
 * dataset-relative file path attached to a validator issue. Used by the
 * dataset-level errors panel to navigate the user to the right row.
 */
function findFileForIssuePath(files: TreeFile[], issueFile: string | undefined): TreeFile | null {
  if (!issueFile) return null
  const target = normalizeIssuePath(issueFile)
  for (const f of files) {
    const dataP = normalizeIssuePath(f.bidsPath)
    const sidecarP = normalizeIssuePath(jsonSidecarPathFor(f.bidsPath))
    if (target === dataP || target === sidecarP) return f
  }
  return null
}

/**
 * Dataset-wide errors panel rendered above the tree+inspector grid. Surfaces
 * every error-severity issue from the validator with a "Fix error" button
 * that selects the offending file and parks the inspector on the named
 * field — so the user doesn't have to first guess which file to click on
 * just to discover the actionable button is buried inside its inspector.
 *
 * Hidden entirely when there are zero errors to keep the View step quiet
 * once the dataset validates cleanly.
 */
function DatasetErrorsPanel({
  errors,
  files,
  onFix
}: {
  errors: BidsValidationIssue[]
  files: TreeFile[]
  onFix: (file: TreeFile, field: string) => void
}): React.ReactElement | null {
  // Anything pinned to a file gets a Fix button — for NIfTI rows we navigate
  // to the field; for TSV rows we just select the file so the read-only
  // inspector surfaces the validator messages. subCode is empty for many
  // TSV-level errors (e.g. TSV_HEADER_LENGTH_MISMATCH) but the per-file
  // jump is still useful.
  const fixable = errors.filter((e) => !!e.file)
  if (errors.length === 0) return null
  return (
    <Callout.Root color="red" size="1">
      <Callout.Icon>
        <InfoCircledIcon />
      </Callout.Icon>
      <Callout.Text>
        <div className="flex flex-col gap-1.5">
          <Text size="2" weight="medium">
            {errors.length} validator error{errors.length !== 1 ? 's' : ''}
          </Text>
          <div className="flex flex-col gap-1">
            {fixable.map((e, idx) => {
              const file = findFileForIssuePath(files, e.file)
              const shortPath = (e.file ?? '').replace(/^\//, '')
              return (
                <div
                  key={`${e.code ?? 'err'}:${e.subCode ?? ''}:${idx}`}
                  className="flex items-center justify-between gap-2 flex-wrap"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <Text size="1">
                      {e.subCode && <span className="font-mono">{e.subCode} — </span>}
                      {e.message}
                    </Text>
                    <Text size="1" color="gray" className="font-mono truncate">
                      {shortPath}
                    </Text>
                  </div>
                  <Button
                    size="1"
                    color="red"
                    disabled={!file}
                    onClick={() => file && onFix(file, e.subCode ?? '')}
                  >
                    {file?.kind === 'tsv' ? 'Edit file' : 'Fix error'}
                  </Button>
                </div>
              )
            })}
            {fixable.length < errors.length && (
              <Text size="1" color="gray">
                {errors.length - fixable.length} other error
                {errors.length - fixable.length !== 1 ? 's' : ''} aren&apos;t tied to a single file
                — see Validator messages after selecting a file.
              </Text>
            )}
          </div>
        </div>
      </Callout.Text>
    </Callout.Root>
  )
}

/**
 * Always-on header above the tree+inspector grid. Makes the selection model
 * legible: which files are currently being edited, and a one-click reset.
 * Without this banner the only cue is the row highlight in the tree, which
 * users have reported as easy to miss.
 */
function SelectionSummary({
  files,
  selectedKeys,
  onClearSelection
}: {
  files: TreeFile[]
  selectedKeys: Set<string>
  onClearSelection: () => void
}): React.ReactElement {
  const selected = files.filter((f) => selectedKeys.has(f.key))
  if (selected.length === 0) {
    return (
      <Callout.Root color="gray" size="1">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          Click a file in the tree to edit its sidecar. We&apos;ll offer to apply changes to similar
          files (same datatype + suffix) when relevant.
        </Callout.Text>
      </Callout.Root>
    )
  }
  const preview =
    selected.length === 1
      ? selected[0].filename
      : `${selected[0].filename} + ${selected.length - 1} other${selected.length > 2 ? 's' : ''}`
  return (
    <div className="flex items-center justify-between border border-[var(--gray-5)] rounded px-3 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <Badge size="1" color="blue">
          Editing {selected.length}
        </Badge>
        <Text
          size="1"
          className="font-mono truncate"
          title={selected.map((f) => f.filename).join('\n')}
        >
          {preview}
        </Text>
      </div>
      <Button size="1" variant="soft" onClick={onClearSelection}>
        Clear selection
      </Button>
    </div>
  )
}

/**
 * Inline prompt that fires after each edit: "Apply this same value to N
 * other similar files?" Keeps the user from having to multi-select the
 * tree manually when the same metadata applies across a whole acquisition
 * type. Auto-dismissed when the user changes selection or commits another
 * edit (handleApplyEdit recomputes).
 */
function SimilarFilesPrompt({
  pending,
  onApply,
  onDismiss
}: {
  pending: PendingSimilarity
  onApply: () => void
  onDismiss: () => void
}): React.ReactElement {
  const valuePreview = stringifyForEditor(pending.value) || '(empty)'
  return (
    <Callout.Root color="blue" size="1">
      <Callout.Icon>
        <InfoCircledIcon />
      </Callout.Icon>
      <Callout.Text>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span>
            Apply <span className="font-mono">{pending.field}</span> ={' '}
            <span className="font-mono">{valuePreview}</span> to {pending.keys.length} other{' '}
            <span className="font-mono">{pending.suffix}</span> file
            {pending.keys.length > 1 ? 's' : ''} in{' '}
            <span className="font-mono">{pending.datatype}</span>?
          </span>
          <div className="flex gap-2">
            <Button size="1" onClick={onApply}>
              Apply to all
            </Button>
            <Button size="1" variant="soft" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        </div>
      </Callout.Text>
    </Callout.Root>
  )
}

function SidecarPathHints({ file }: { file: TreeFile }): React.ReactElement | null {
  if (!file.sidecarPath) return null
  return (
    <div className="flex flex-col gap-0.5 -mt-1">
      <Text size="1" color="gray">
        Source JSON:
      </Text>
      <Text size="1" className="font-mono text-[var(--gray-11)] truncate" title={file.sidecarPath}>
        {file.sidecarPath}
      </Text>
    </div>
  )
}

// ── Sectioned field renderer ───────────────────────────────────────────

interface FieldSectionProps {
  label: string
  rows: (SidecarFieldRow & { varies: boolean })[]
  focusedField: string | null
  onCommit: (field: string, value: unknown) => void
  onClear: (field: string) => void
}

function FieldSection({
  label,
  rows,
  focusedField,
  onCommit,
  onClear
}: FieldSectionProps): React.ReactElement {
  // When focus mode is active, hide whole sections that don't contain the
  // focused field. Keeps the screen short instead of forcing the user to
  // scroll past pages of dimmed rows.
  if (focusedField && !rows.some((r) => r.field === focusedField)) return <></>
  return (
    <div className="flex flex-col gap-2">
      <Text size="1" weight="medium" color="gray" className="uppercase tracking-wide">
        · {label} <span className="opacity-60">{rows.length}</span>
      </Text>
      {rows.map((row) => (
        <SchemaFieldRow
          key={row.field}
          row={row}
          dimmed={focusedField !== null && focusedField !== row.field}
          onCommit={(v) => onCommit(row.field, v)}
          onClear={() => onClear(row.field)}
        />
      ))}
    </div>
  )
}

// ── Per-field row: label, badges, editor, inline validator callout ────

interface SchemaFieldRowProps {
  row: SidecarFieldRow & { varies: boolean }
  dimmed?: boolean
  onCommit: (value: unknown) => void
  onClear: () => void
}

function SchemaFieldRow({
  row,
  dimmed = false,
  onCommit,
  onClear
}: SchemaFieldRowProps): React.ReactElement {
  const [whyOpen, setWhyOpen] = useState(false)
  const label = row.def?.display_name ?? row.field
  const description = row.def?.description?.trim()

  return (
    <div
      id={`bids-field-row-${row.field}`}
      className={`flex flex-col gap-1${dimmed ? ' opacity-30 pointer-events-none' : ''}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Text size="2" weight="medium">
          {label}
        </Text>
        {row.unknownToSchema && (
          <Badge size="1" variant="soft" color="gray">
            may not apply
          </Badge>
        )}
        {row.status === 'required' && (
          <Badge size="1" variant="solid" color="red">
            required
          </Badge>
        )}
        {row.status === 'invalid' && (
          <Badge size="1" variant="solid" color="red">
            invalid value
          </Badge>
        )}
        {row.varies && (
          <Badge size="1" variant="soft" color="gray">
            varies
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1">
        <div className="flex-1">
          <FieldValueEditor row={row} onCommit={onCommit} />
        </div>
        {row.hasValue && (
          <Button
            size="1"
            variant="ghost"
            color="gray"
            onClick={onClear}
            title="Remove this key from the sidecar"
          >
            ✕
          </Button>
        )}
      </div>

      {row.issues.length > 0 && (
        <Callout.Root
          size="1"
          color={row.issues.some((i) => i.severity === 'error') ? 'red' : 'amber'}
        >
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <div className="flex flex-col gap-0.5">
              {row.issues.map((i, idx) => (
                <div
                  key={`${i.code ?? 'issue'}:${idx}`}
                  className="flex items-baseline justify-between gap-2"
                >
                  <Text size="1" className="flex-1">
                    {i.message}
                  </Text>
                  {i.code && (
                    <Text size="1" className="font-mono opacity-70 whitespace-nowrap">
                      {i.code}
                    </Text>
                  )}
                </div>
              ))}
              {description && (
                <button
                  type="button"
                  className="text-left text-[10px] underline opacity-70 hover:opacity-100 cursor-pointer mt-1 self-start"
                  onClick={() => setWhyOpen((o) => !o)}
                >
                  {whyOpen ? 'Hide details' : 'Why?'}
                </button>
              )}
              {whyOpen && description && (
                <Text size="1" className="opacity-80 whitespace-pre-line mt-1">
                  {description}
                </Text>
              )}
            </div>
          </Callout.Text>
        </Callout.Root>
      )}
    </div>
  )
}

// ── Editor input — picks a control type from the schema ───────────────

function FieldValueEditor({
  row,
  onCommit
}: {
  row: SidecarFieldRow & { varies: boolean }
  onCommit: (value: unknown) => void
}): React.ReactElement {
  const [draft, setDraft] = useState<string | null>(null)
  const def = row.def
  const placeholder = row.varies
    ? '(varies — type to set all)'
    : !row.hasValue
      ? row.status === 'recommended'
        ? 'Recommended — click to add'
        : 'Optional — click to add'
      : ''

  const enumOptions = extractEnumOptions(def)
  if (enumOptions) {
    const currentRaw = row.varies ? '' : stringifyForEditor(row.value)
    const current = enumOptions.values.includes(currentRaw) ? currentRaw : ''
    return (
      <Select.Root
        size="1"
        value={current || undefined}
        onValueChange={(v: string): void => onCommit(enumOptions.parse(v))}
      >
        <Select.Trigger placeholder={placeholder} className="w-full" />
        <Select.Content position="popper" style={{ zIndex: 9999 }}>
          {enumOptions.values.map((opt) => (
            <Select.Item key={opt} value={opt}>
              {opt}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    )
  }

  const stringValue = stringifyForEditor(row.varies ? undefined : row.value)
  return (
    <TextField.Root
      size="1"
      value={draft ?? stringValue}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft === null) return
        const parsed = parseForField(draft, def)
        onCommit(parsed)
        setDraft(null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    >
      {def?.unit && (
        <TextField.Slot side="right">
          <Text size="1" color="gray">
            {def.unit}
          </Text>
        </TextField.Slot>
      )}
    </TextField.Root>
  )
}

function stringifyForEditor(v: unknown): string {
  if (v === undefined || v === null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v)
}

function parseForField(raw: string, def?: BidsMetadataDef): unknown {
  const trimmed = raw.trim()
  if (trimmed === '') return undefined
  if (def?.type === 'number' || def?.type === 'integer') {
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : raw
  }
  if (def?.type === 'array') {
    // Accept JSON-style arrays AND comma/space-separated lists for convenience.
    if (trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed)
      } catch {
        /* fall through */
      }
    }
    const items = trimmed.split(/[\s,]+/).filter(Boolean)
    if (def.items?.type === 'number') {
      const nums = items.map(Number)
      return nums.every(Number.isFinite) ? nums : items
    }
    return items
  }
  if (def?.type === 'boolean') {
    if (/^(true|yes|1)$/i.test(trimmed)) return true
    if (/^(false|no|0)$/i.test(trimmed)) return false
    return trimmed
  }
  if (def?.type === 'string') return raw
  // Unknown / no def: fall back to the heuristic used by the Prep inspector.
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

/**
 * Pull an enum-style option list off a schema definition. Returns the
 * string-valued options the Select should render plus a `parse` function
 * that converts the chosen string back to the value the sidecar should
 * store (booleans/numbers/strings). Returns `null` when the field isn't
 * enum-shaped — caller falls back to a free-text input.
 *
 * Shapes recognised:
 *   - `def.enum`                — flat enum union
 *   - `def.anyOf[i].enum`       — union of literal values inside an anyOf
 *                                 (BIDS uses this for "value or 'n/a'")
 *   - `def.type === 'boolean'`  — fabricated ["true", "false"] dropdown
 */
function extractEnumOptions(def?: BidsMetadataDef): {
  values: string[]
  parse: (v: string) => unknown
} | null {
  if (!def) return null
  if (def.type === 'boolean' && !def.enum) {
    return {
      values: ['true', 'false'],
      parse: (v) => v === 'true'
    }
  }
  const collected = new Set<string>()
  if (Array.isArray(def.enum)) for (const opt of def.enum) collected.add(String(opt))
  if (Array.isArray(def.anyOf)) {
    for (const branch of def.anyOf) {
      const e = (branch as { enum?: unknown[] } | null)?.enum
      if (Array.isArray(e)) for (const opt of e) collected.add(String(opt))
    }
  }
  if (collected.size === 0) return null
  return {
    values: [...collected],
    parse: (v) => parseForField(v, def)
  }
}

// ── Free-form "add a key" row at the bottom of the inspector ──────────

function NewFieldRowEditor({
  onAdd,
  knownFields
}: {
  onAdd: (field: string, value: unknown) => void
  knownFields: Set<string>
}): React.ReactElement {
  const [field, setField] = useState('')
  const [value, setValue] = useState('')
  const disabled = !field || knownFields.has(field)
  return (
    <div className="flex flex-col gap-1 border-t border-[var(--gray-5)] pt-2">
      <Text size="1" color="gray">
        Add another field
      </Text>
      <div className="flex items-center gap-2">
        <TextField.Root
          size="1"
          placeholder="Field name"
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="flex-1"
        />
        <TextField.Root
          size="1"
          placeholder="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1"
        />
        <Button
          size="1"
          variant="soft"
          disabled={disabled}
          onClick={() => {
            onAdd(field, parseForField(value))
            setField('')
            setValue('')
          }}
        >
          Add
        </Button>
      </div>
    </div>
  )
}

// ── Validator messages summary panel ──────────────────────────────────

function ValidatorMessagesPanel({
  issues,
  onFixError
}: {
  issues: BidsValidationIssue[]
  onFixError: (field: string) => void
}): React.ReactElement | null {
  const [open, setOpen] = useState(true)
  if (issues.length === 0) return null
  return (
    <div className="border-t border-[var(--gray-5)] pt-2 flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 cursor-pointer self-start"
      >
        {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        <Badge color="orange" variant="soft">
          Validator messages
        </Badge>
        <Text size="1" color="gray">
          {issues.length}
        </Text>
      </button>
      {open && (
        <div className="flex flex-col gap-1">
          {issues.map((i, idx) => {
            const fixable = i.severity === 'error' && !!i.subCode
            return (
              <div
                key={`${i.code ?? 'issue'}:${i.subCode ?? ''}:${idx}`}
                className="border border-[var(--gray-5)] rounded p-2 flex flex-col gap-0.5 bg-[var(--gray-2)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge size="1" variant="soft" color={i.severity === 'error' ? 'red' : 'amber'}>
                      {i.severity}
                    </Badge>
                    {i.code && (
                      <Text size="1" className="font-mono opacity-70">
                        {i.code}
                      </Text>
                    )}
                  </div>
                  {fixable && (
                    <Button size="1" color="red" onClick={() => onFixError(i.subCode!)}>
                      Fix error
                    </Button>
                  )}
                </div>
                <Text size="1">{i.message}</Text>
                {i.rule && (
                  <Text size="1" className="font-mono opacity-60">
                    RULE {i.rule}
                  </Text>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
