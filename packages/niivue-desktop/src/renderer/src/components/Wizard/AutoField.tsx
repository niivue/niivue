import type { ContextFieldDef } from '../../../../common/workflowTypes.js'
import { TextField } from './fields/TextField.js'
import { NumberField } from './fields/NumberField.js'
import { SelectField } from './fields/SelectField.js'
import { CheckboxField } from './fields/CheckboxField.js'
import { DirectoryField } from './fields/DirectoryField.js'
import { MarkdownField } from './fields/MarkdownField.js'
import { SeriesListField } from './fields/SeriesListField.js'

interface AutoFieldProps {
  fieldName: string
  fieldDef: ContextFieldDef
  value: unknown
  onChange: (value: unknown) => void
  loading?: boolean
  datasetName?: string
}

export function AutoField({
  fieldName,
  fieldDef,
  value,
  onChange,
  loading,
  datasetName
}: AutoFieldProps): React.ReactElement {
  const label = fieldDef.description || fieldName

  // Series list (from heuristic)
  if (fieldDef.heuristic === 'list-dicom-series') {
    return (
      <SeriesListField
        label={label}
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
        description="Supports Markdown formatting. A detailed README avoids validator warnings."
        value={String(value ?? '')}
        onChange={(v) => onChange(v)}
        placeholder={`# ${datasetName || 'My Dataset'}\n\n## Description\n\n## Funding\n\n## Ethics Approvals\n\n## References and Links\n\n## License\n`}
      />
    )
  }

  // Directory picker
  if (fieldName === 'output_dir' || fieldDef.type === 'directory') {
    return (
      <DirectoryField
        label={label}
        description="New folders will be created automatically. Leave empty to use a temporary directory."
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
        checked={!!value}
        onChange={(v) => onChange(v)}
      />
    )
  }

  // Enum select
  if (fieldDef.type === 'string' && fieldDef.enum) {
    return (
      <SelectField
        label={label}
        value={String(value ?? '')}
        onChange={(v) => onChange(v)}
        options={fieldDef.enum.map((opt) => ({
          value: String(opt),
          label: String(opt)
        }))}
      />
    )
  }

  // Number with range
  if (fieldDef.type === 'number') {
    return (
      <NumberField
        label={label}
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
      value={String(value ?? '')}
      onChange={(v) => onChange(v)}
    />
  )
}
