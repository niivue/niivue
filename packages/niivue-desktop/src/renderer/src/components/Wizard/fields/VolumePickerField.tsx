// Multi-select picker for `volume[]` form fields. Reads upstream step
// volumes from the wizard's stepOutputs and lets the user toggle which
// ones flow into a downstream tool (e.g. atlas-parcellate). When nothing
// is selected it defaults to "all volumes" so the step still has work.

import { useEffect, useMemo } from 'react'
import { Heading, Text, Checkbox } from '@radix-ui/themes'
import type { ContextFieldDef } from '../../../../../common/workflowTypes.js'

interface VolumePickerFieldProps {
  context: Record<string, unknown>
  stepOutputs?: Record<string, Record<string, unknown>>
  fields?: string[]
  fieldDefs?: Record<string, ContextFieldDef>
  onFieldChange: (fieldName: string, value: unknown) => void
}

function basename(p: string): string {
  return p.split(/[\\/]/).pop() ?? p
}

interface UpstreamVolume {
  path: string
  source: string
}

function gatherUpstreamVolumes(
  stepOutputs?: Record<string, Record<string, unknown>>
): UpstreamVolume[] {
  if (!stepOutputs) return []
  const seen = new Set<string>()
  const out: UpstreamVolume[] = []
  for (const [stepName, stepOut] of Object.entries(stepOutputs)) {
    const candidates = Array.isArray(stepOut.volumes)
      ? (stepOut.volumes as unknown[])
      : []
    for (const item of candidates) {
      const p = String(item)
      if (seen.has(p)) continue
      seen.add(p)
      out.push({ path: p, source: stepName })
    }
  }
  return out
}

export function VolumePickerField({
  context,
  stepOutputs,
  fields = [],
  fieldDefs = {},
  onFieldChange
}: VolumePickerFieldProps): React.ReactElement {
  const volumeFieldName = fields.find((f) => fieldDefs[f]?.type === 'volume[]')
  const upstream = useMemo(() => gatherUpstreamVolumes(stepOutputs), [stepOutputs])
  const currentValue = (volumeFieldName ? context[volumeFieldName] : undefined) as
    | string[]
    | undefined

  // Reconcile the user's current selection against the latest upstream paths
  // every time upstream changes:
  //  - first render with no value → seed to "all upstream" so the step has
  //    work without forcing a click;
  //  - subsequent renders → drop selected paths that are no longer produced
  //    upstream (e.g. user tightened the DICOM filter, so the previous run's
  //    paths are gone). If the resulting set is empty, fall back to "all
  //    upstream" rather than passing nothing downstream.
  // Without this, context.nifti_paths sticks across upstream re-runs and
  // atlas-parcellate keeps processing the old (broader) volume set.
  useEffect(() => {
    if (!volumeFieldName) return
    if (upstream.length === 0) return
    const upstreamPaths = upstream.map((v) => v.path)
    if (currentValue === undefined) {
      onFieldChange(volumeFieldName, upstreamPaths)
      return
    }
    const upstreamSet = new Set(upstreamPaths)
    const reconciled = currentValue.filter((p) => upstreamSet.has(p))
    if (reconciled.length === currentValue.length) return // nothing stale
    onFieldChange(volumeFieldName, reconciled.length > 0 ? reconciled : upstreamPaths)
  }, [volumeFieldName, currentValue, upstream, onFieldChange])

  if (!volumeFieldName) {
    return (
      <Text size="2" className="text-neutral-9">
        No volume[] field declared in this section.
      </Text>
    )
  }

  if (upstream.length === 0) {
    return (
      <Text size="2" className="text-neutral-9">
        No upstream volumes to select from yet — earlier steps must run first.
      </Text>
    )
  }

  const selected = new Set(currentValue ?? upstream.map((v) => v.path))

  const toggle = (path: string): void => {
    const next = new Set(selected)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    onFieldChange(volumeFieldName, [...next])
  }

  const allSelected = selected.size === upstream.length
  const toggleAll = (): void => {
    onFieldChange(volumeFieldName, allSelected ? [] : upstream.map((v) => v.path))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Heading size="2" className="text-neutral-12">
          {fieldDefs[volumeFieldName]?.label ?? 'Volumes'}
        </Heading>
        <button
          type="button"
          className="text-xs text-accent-11 hover:underline"
          onClick={toggleAll}
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      <div className="flex flex-col gap-1 max-h-64 overflow-auto rounded-md border border-neutral-5 p-2 bg-neutral-1">
        {upstream.map((vol) => (
          <label
            key={vol.path}
            className="flex items-center gap-2 px-2 py-1 hover:bg-neutral-3 rounded cursor-pointer"
          >
            <Checkbox
              checked={selected.has(vol.path)}
              onCheckedChange={() => toggle(vol.path)}
            />
            <Text size="2" className="text-neutral-12 truncate">
              {basename(vol.path)}
            </Text>
            <Text size="1" className="text-neutral-9 ml-auto">
              {vol.source}
            </Text>
          </label>
        ))}
      </div>
      <Text size="1" className="text-neutral-9">
        {selected.size} of {upstream.length} selected
      </Text>
    </div>
  )
}
