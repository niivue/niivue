import { useEffect } from 'react'
import { Text } from '@radix-ui/themes'
import type { ContextFieldDef } from '../../../../common/workflowTypes.js'
import { TextField } from './fields/TextField.js'
import { NumberField } from './fields/NumberField.js'
import { SelectField } from './fields/SelectField.js'
import { CheckboxField } from './fields/CheckboxField.js'
import { DirectoryField } from './fields/DirectoryField.js'
import { MarkdownField } from './fields/MarkdownField.js'
import { SeriesListField } from './fields/SeriesListField.js'
import { ArraySelectField } from './fields/ArraySelectField.js'
import { VolumePickerField } from './fields/VolumePickerField.js'

/**
 * Turn an API-style key (output_dir, datasetName, dicom-folder) into a
 * sentence-cased label. Used as the last-resort label when a field def has
 * no `label` or `description` — without this we'd render the raw camelCase
 * or snake_case identifier straight to the user.
 */
function humanizeFieldName(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

interface AutoFieldProps {
  fieldName: string
  fieldDef: ContextFieldDef
  value: unknown
  onChange: (value: unknown) => void
  loading?: boolean
  datasetName?: string
  stepOutputs?: Record<string, Record<string, unknown>>
  context?: Record<string, unknown>
  /** Field-level validation error, surfaced below the input. */
  error?: string
}

export function AutoField({
  fieldName,
  fieldDef,
  value,
  onChange,
  loading,
  datasetName,
  stepOutputs,
  context,
  error
}: AutoFieldProps): React.ReactElement {
  // Prefer the explicit label, then humanize the field name. The description
  // is left out of this chain on purpose — descriptions are explanatory text
  // meant to sit *under* the input as helper text, not be promoted to the
  // label when the label is missing.
  const label = fieldDef.label || humanizeFieldName(fieldName)
  const tooltip = fieldDef.description && fieldDef.label ? fieldDef.description : undefined

  // Seed numeric fields whose value is still undefined. Without this the
  // input renders min (or 0) but the underlying context field stays
  // `undefined`, so a step that never gets touched runs with a different
  // value than the one the user sees. Fire this once when value is missing
  // so the displayed and stored values stay in sync.
  useEffect(() => {
    if (fieldDef.type !== 'number') return
    if (typeof value === 'number' && Number.isFinite(value)) return
    const seed = typeof fieldDef.min === 'number' ? fieldDef.min : 0
    onChange(seed)
    // We intentionally re-fire if the value drifts back to undefined later
    // (e.g. a parent reset); onChange is expected to be stable.
  }, [fieldDef.type, fieldDef.min, value, onChange])
  // Helper text is the description whenever it's present — descriptions are
  // longer-form explanations that belong under the input, not in the label
  // slot. The tooltip on the label icon now mirrors helper text only when an
  // explicit label is provided, so users on smaller viewports still get the
  // explanation without needing to hover.
  const helperText = fieldDef.description ? fieldDef.description : undefined

  // Stable IDs let the input announce its error/helper text to screen readers.
  // aria-describedby points at whichever is currently rendered.
  const errorId = `auto-field-${fieldName}-error`
  const helperId = `auto-field-${fieldName}-help`
  const ariaInvalid = !!error
  const ariaDescribedBy = error ? errorId : helperText ? helperId : undefined

  const inner = ((): React.ReactElement => {
    // Series list (from heuristic)
    if (fieldDef.heuristic === 'list-dicom-series') {
      return (
        <SeriesListField
          label={label}
          tooltip={tooltip}
          value={value}
          onChange={onChange}
          loading={loading}
        />
      )
    }

    // volume[] — picker that pulls candidate volumes from upstream step outputs
    // and lets the user toggle which to pass downstream. Falls through to the
    // generic array handler if no upstream volumes are available yet.
    if (fieldDef.type === 'volume[]') {
      return (
        <VolumePickerField
          context={context ?? {}}
          stepOutputs={stepOutputs}
          fields={[fieldName]}
          fieldDefs={{ [fieldName]: fieldDef }}
          onFieldChange={(_n, v) => onChange(v)}
        />
      )
    }

    // Generic array — render a checkbox list. For object items, toggling the
    // checkbox flips an `excluded` flag in place (matching the convention used
    // by DetectedSubject[] and BidsSeriesMapping[]). Primitive items are shown
    // read-only — exclusion of primitives requires runtime support that doesn't
    // exist yet.
    if (fieldDef.type.endsWith('[]')) {
      return (
        <ArraySelectField
          label={label}
          tooltip={tooltip}
          value={value}
          onChange={onChange}
          loading={loading}
        />
      )
    }

    // Markdown editor for readme
    if (fieldName === 'readme') {
      return (
        <MarkdownField
          label="README.md"
          tooltip="Supports Markdown formatting. A detailed README avoids validator warnings."
          value={String(value ?? '')}
          onChange={(v) => onChange(v)}
          placeholder={`# ${datasetName || 'My Dataset'}\n\n## Description\n\n## Funding\n\n## Ethics Approvals\n\n## References and Links\n\n## License\n`}
        />
      )
    }

    // Directory picker
    if (
      fieldName === 'output_dir' ||
      fieldDef.type === 'directory' ||
      fieldDef.type === 'dicom-folder'
    ) {
      return (
        <DirectoryField
          label={label}
          tooltip={
            tooltip ||
            'New folders will be created automatically. Leave empty to use a temporary directory.'
          }
          value={String(value ?? '')}
          onChange={(v) => onChange(v)}
          ariaInvalid={ariaInvalid}
          ariaDescribedBy={ariaDescribedBy}
        />
      )
    }

    // Boolean
    if (fieldDef.type === 'boolean') {
      return (
        <CheckboxField
          label={label}
          tooltip={tooltip}
          checked={!!value}
          onChange={(v) => onChange(v)}
        />
      )
    }

    // Enum select. Entries may be plain values or `{value, label}` objects so
    // tools can show friendly names (e.g. "Parcellation (104 regions)") without
    // exposing the raw model id to the user.
    if (fieldDef.type === 'string' && fieldDef.enum) {
      return (
        <SelectField
          label={label}
          tooltip={tooltip}
          value={String(value ?? '')}
          onChange={(v) => onChange(v)}
          options={fieldDef.enum.map((opt) => {
            if (opt && typeof opt === 'object' && 'value' in opt) {
              const entry = opt as { value: unknown; label?: unknown }
              return {
                value: String(entry.value),
                label: String(entry.label ?? entry.value)
              }
            }
            return { value: String(opt), label: String(opt) }
          })}
        />
      )
    }

    // Number with range
    if (fieldDef.type === 'number') {
      return (
        <NumberField
          label={label}
          tooltip={tooltip}
          value={Number(value ?? fieldDef.min ?? 0)}
          onChange={(v) => onChange(v)}
          min={fieldDef.min}
          max={fieldDef.max}
          ariaInvalid={ariaInvalid}
          ariaDescribedBy={ariaDescribedBy}
        />
      )
    }

    // Default: text input
    return (
      <TextField
        label={label}
        tooltip={tooltip}
        value={String(value ?? '')}
        onChange={(v) => onChange(v)}
        ariaInvalid={ariaInvalid}
        ariaDescribedBy={ariaDescribedBy}
      />
    )
  })()

  if (!helperText && !error) return inner

  return (
    <div className="flex flex-col gap-1">
      {inner}
      {helperText && !error && (
        <Text id={helperId} size="1" className="text-neutral-9 pl-0.5">
          {helperText}
        </Text>
      )}
      {error && (
        <Text id={errorId} size="1" className="text-[var(--red-11)] pl-0.5" role="alert">
          {error}
        </Text>
      )}
    </div>
  )
}
