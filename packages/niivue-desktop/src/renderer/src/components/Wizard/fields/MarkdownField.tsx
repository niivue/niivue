import { useState, useMemo } from 'react'
import { Text, TextArea, Tabs, Box, Tooltip } from '@radix-ui/themes'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { marked } from 'marked'

interface MarkdownFieldProps {
  label: string
  tooltip?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function MarkdownField({
  label,
  tooltip,
  value,
  onChange,
  placeholder,
  disabled
}: MarkdownFieldProps): React.ReactElement {
  const [tab, setTab] = useState<string>('edit')

  const renderedHtml = useMemo(
    () => marked.parse(value || placeholder || '', { async: false }) as string,
    [value, placeholder]
  )

  return (
    <div className="flex flex-col gap-1.5 py-1">
      <div className="flex items-center gap-1">
        <Text as="label" size="2" weight="medium" className="text-neutral-12">
          {label}
        </Text>
        {tooltip && (
          <Tooltip content={tooltip}>
            <InfoCircledIcon className="text-neutral-8 shrink-0" />
          </Tooltip>
        )}
      </div>

      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List size="1">
          <Tabs.Trigger value="edit">Edit</Tabs.Trigger>
          <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
        </Tabs.List>

        <Box pt="2">
          <Tabs.Content value="edit">
            <TextArea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              rows={8}
              size="2"
              className="font-mono"
            />
          </Tabs.Content>

          <Tabs.Content value="preview">
            <div
              className="px-3 py-2 text-sm border border-neutral-6 rounded-md bg-neutral-1 min-h-[192px] prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </div>
  )
}
