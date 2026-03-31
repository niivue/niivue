import { TextField, Text, Button } from '@radix-ui/themes'

const electron = window.electron

interface DirectoryFieldProps {
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function DirectoryField({
  label,
  description,
  value,
  onChange,
  disabled
}: DirectoryFieldProps): React.ReactElement {
  const handleBrowse = async (): Promise<void> => {
    const dir = await electron.ipcRenderer.invoke('workflow:select-directory', {
      title: label
    })
    if (dir) onChange(dir as string)
  }

  return (
    <div className="flex flex-col gap-1.5 py-1">
      <Text as="label" size="2" weight="medium" className="text-neutral-12">
        {label}
      </Text>
      <div className="flex gap-2">
        <div className="flex-1">
          <TextField.Root
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Select or type a directory path..."
            disabled={disabled}
            size="2"
          />
        </div>
        <Button variant="soft" size="2" onClick={handleBrowse} disabled={disabled}>
          Browse...
        </Button>
      </div>
      {description && (
        <Text size="1" className="text-neutral-9">
          {description}
        </Text>
      )}
    </div>
  )
}
