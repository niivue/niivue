import React, { useCallback, useMemo } from 'react'
import { Text, TextField, Callout } from '@radix-ui/themes'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import type { BidsSeriesMapping, DetectedSubject } from '../../../../common/bidsTypes.js'
import { StepBidsPreview } from './StepBidsPreview.js'

interface AdapterProps {
  context: Record<string, unknown>
  stepOutputs?: Record<string, Record<string, unknown>>
  onFieldChange: (fieldName: string, value: unknown) => void | Promise<void>
  onLoadFile?: (niftiPath: string) => Promise<void>
}

/**
 * Apply a subject-label rename across every mapping that currently carries
 * `oldLabel`, and update the matching DetectedSubject entry. Returns the
 * new arrays untouched if no change occurred so the engine doesn't fire a
 * pointless re-render / heuristic refire.
 */
function renameSubject(
  oldLabel: string,
  newLabel: string,
  mappings: BidsSeriesMapping[],
  subjects: DetectedSubject[]
): { mappings: BidsSeriesMapping[]; subjects: DetectedSubject[] } {
  if (!newLabel || newLabel === oldLabel) return { mappings, subjects }
  const updatedMappings = mappings.map((m) =>
    m.subject === oldLabel ? { ...m, subject: newLabel } : m
  )
  const updatedSubjects = subjects.map((s) =>
    s.label === oldLabel ? { ...s, label: newLabel } : s
  )
  return { mappings: updatedMappings, subjects: updatedSubjects }
}

/**
 * Apply a session-label rename within a single subject. Sessions are scoped
 * per-subject (sub-01 ses-01 and sub-02 ses-01 are independent), so the
 * rename is gated on both subject label + old session label.
 */
function renameSession(
  subjectLabel: string,
  oldSession: string,
  newSession: string,
  mappings: BidsSeriesMapping[],
  subjects: DetectedSubject[]
): { mappings: BidsSeriesMapping[]; subjects: DetectedSubject[] } {
  if (newSession === oldSession) return { mappings, subjects }
  const updatedMappings = mappings.map((m) =>
    m.subject === subjectLabel && m.session === oldSession ? { ...m, session: newSession } : m
  )
  const updatedSubjects = subjects.map((s) => {
    if (s.label !== subjectLabel) return s
    return {
      ...s,
      sessions: s.sessions.map((ses) =>
        ses.label === oldSession ? { ...ses, label: newSession } : ses
      )
    }
  })
  return { mappings: updatedMappings, subjects: updatedSubjects }
}

/** Internal: relabel UI used by the prep editor above the thumbnail tree. */
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

  const handleSubjectChange = (oldLabel: string, raw: string): void => {
    const newLabel = raw.replace(/[^a-zA-Z0-9]/g, '')
    const next = renameSubject(oldLabel, newLabel, mappings, subjects)
    onUpdate(next.mappings, next.subjects)
  }

  const handleSessionChange = (
    subjectLabel: string,
    oldSession: string,
    raw: string
  ): void => {
    const newSession = raw.replace(/[^a-zA-Z0-9]/g, '')
    const next = renameSession(subjectLabel, oldSession, newSession, mappings, subjects)
    onUpdate(next.mappings, next.subjects)
  }

  return (
    <div className="flex flex-col gap-2">
      <Text size="2" weight="medium">Subjects & sessions</Text>
      <Text size="1" color="gray">
        Rename the subject label or session label and every file in the proposed BIDS
        tree updates to match. Changes apply on write.
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
                    onChange={(e) => handleSubjectChange(sub.label, e.target.value)}
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
                            onChange={(e) =>
                              handleSessionChange(sub.label, ses.label, e.target.value)
                            }
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

/**
 * BIDS Prep — pre-write editor. Surfaces the thumbnail tree the user already
 * knows from StepBidsPreview, and adds a subject/session relabel pane above
 * it. Edits mutate `series_list` and `subjects` in workflow context so the
 * downstream bids-write step picks them up automatically.
 *
 * Sidecar JSON edits and multi-file batch operations land in a follow-up
 * commit on top of a shared BidsTreeEditor — keeping this adapter small for
 * now lets the workflow's new shape ship without blocking on the full UX.
 */
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

/**
 * BIDS View — post-write editor. Renders after executeAllSteps has produced
 * `bids_dir`. This commit ships the section shell + path readout; the disk
 * tree walker + staged-edit applier (bids:read-tree, bids:apply-staged-edits)
 * land in a follow-up commit.
 */
export function BidsViewEditor({ context }: AdapterProps): React.ReactElement {
  const bidsDir = (context.bids_dir as string) || ''

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

  return (
    <div className="flex flex-col gap-3">
      <Text size="2" weight="medium">BIDS dataset written</Text>
      <div className="rounded border border-[var(--green-6)] bg-[var(--green-3)] p-3">
        <Text size="2" className="font-mono text-[var(--green-11)]">{bidsDir}</Text>
      </div>
      <Callout.Root color="blue" size="1">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          Disk tree editor is coming in a follow-up. For now, click Finish to close —
          your dataset is on disk at the path above and the post-pass (scans.tsv,
          B0Field*) has already run.
        </Callout.Text>
      </Callout.Root>
    </div>
  )
}

// Re-export the pure helpers so unit tests can exercise the rename logic
// without mounting React.
export { renameSubject, renameSession }
