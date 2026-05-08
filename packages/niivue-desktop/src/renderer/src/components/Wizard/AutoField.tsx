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

interface AutoFieldProps {
  fieldName: string
  fieldDef: ContextFieldDef
  value: unknown
  onChange: (value: unknown) => void
  loading?: boolean
  datasetName?: string
  stepOutputs?: Record<string, Record<string, unknown>>
  context?: Record<string, unknown>
}

export function AutoField({
  fieldName,
  fieldDef,
  value,
  onChange,
  loading,
  datasetName,
  stepOutputs,
  context
}: AutoFieldProps): React.ReactElement {
  const label = fieldDef.label || fieldDef.description || fieldName
  const tooltip = fieldDef.label ? fieldDef.description : undefined

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
    />
  )
}
