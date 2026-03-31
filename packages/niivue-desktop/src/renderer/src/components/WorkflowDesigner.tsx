import React, { useState, useCallback, useEffect } from 'react'
import {
  Button,
  Heading,
  Text,
  TextField,
  TextArea,
  Select,
  IconButton,
  Card,
  Separator,
  Badge,
  Tabs,
  Box,
  Theme
} from '@radix-ui/themes'
import {
  Cross1Icon,
  PlusIcon,
  TrashIcon,
  DragHandleDots2Icon,
  ChevronUpIcon,
  ChevronDownIcon,
  CodeIcon,
  MixerHorizontalIcon
} from '@radix-ui/react-icons'

const electron = window.electron

interface FormSectionDraft {
  title: string
  description: string
  fields: string[]
  component: string
  buttonText: string
}

interface WorkflowDraft {
  name: string
  version: string
  description: string
  menu: string
  sections: FormSectionDraft[]
}

interface WorkflowDesignerProps {
  open: boolean
  onClose: () => void
  onSave?: (schema: Record<string, unknown>) => void
}

const EMPTY_SECTION: FormSectionDraft = {
  title: '',
  description: '',
  fields: [],
  component: '',
  buttonText: ''
}

const DEFAULT_DRAFT: WorkflowDraft = {
  name: '',
  version: '1.0.0',
  description: '',
  menu: 'Processing',
  sections: [{ ...EMPTY_SECTION, title: 'Configuration' }]
}

function SectionEditor({
  section,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown
}: {
  section: FormSectionDraft
  index: number
  total: number
  onUpdate: (section: FormSectionDraft) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}): React.ReactElement {
  const updateField = <K extends keyof FormSectionDraft>(
    key: K,
    value: FormSectionDraft[K]
  ): void => {
    onUpdate({ ...section, [key]: value })
  }

  const addField = (): void => {
    updateField('fields', [...section.fields, ''])
  }

  const updateFieldName = (fieldIndex: number, value: string): void => {
    const updated = [...section.fields]
    updated[fieldIndex] = value
    updateField('fields', updated)
  }

  const removeField = (fieldIndex: number): void => {
    updateField('fields', section.fields.filter((_, i) => i !== fieldIndex))
  }

  return (
    <Card size="2">
      <div className="flex flex-col gap-3">
        {/* Section header */}
        <div className="flex items-center gap-2">
          <DragHandleDots2Icon className="text-neutral-8 shrink-0 cursor-grab" />
          <Badge variant="soft" size="1">{index + 1}</Badge>
          <div className="flex-1">
            <TextField.Root
              value={section.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Section title"
              size="2"
            />
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              variant="ghost"
              color="gray"
              size="1"
              onClick={onMoveUp}
              disabled={index === 0}
            >
              <ChevronUpIcon />
            </IconButton>
            <IconButton
              variant="ghost"
              color="gray"
              size="1"
              onClick={onMoveDown}
              disabled={index === total - 1}
            >
              <ChevronDownIcon />
            </IconButton>
            <IconButton
              variant="ghost"
              color="red"
              size="1"
              onClick={onRemove}
              disabled={total <= 1}
            >
              <TrashIcon />
            </IconButton>
          </div>
        </div>

        {/* Description */}
        <TextField.Root
          value={section.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Optional description"
          size="1"
        />

        {/* Custom component */}
        <div className="flex items-center gap-2">
          <Text size="1" className="text-neutral-9 shrink-0">Component:</Text>
          <TextField.Root
            value={section.component}
            onChange={(e) => updateField('component', e.target.value)}
            placeholder="none (auto-generate fields)"
            size="1"
            className="flex-1"
          />
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-1.5">
          <Text size="1" weight="medium" className="text-neutral-11">Context fields:</Text>
          {section.fields.map((field, fi) => (
            <div key={fi} className="flex items-center gap-2">
              <TextField.Root
                value={field}
                onChange={(e) => updateFieldName(fi, e.target.value)}
                placeholder="field_name"
                size="1"
                className="flex-1 font-mono"
              />
              <IconButton
                variant="ghost"
                color="gray"
                size="1"
                onClick={() => removeField(fi)}
              >
                <Cross1Icon />
              </IconButton>
            </div>
          ))}
          <Button variant="ghost" size="1" onClick={addField} className="w-fit">
            <PlusIcon /> Add field
          </Button>
        </div>

        {/* Button text (for last section) */}
        {index === total - 1 && (
          <div className="flex items-center gap-2">
            <Text size="1" className="text-neutral-9 shrink-0">Button label:</Text>
            <TextField.Root
              value={section.buttonText}
              onChange={(e) => updateField('buttonText', e.target.value)}
              placeholder="Run"
              size="1"
              className="flex-1"
            />
          </div>
        )}
      </div>
    </Card>
  )
}

export function WorkflowDesigner({
  open,
  onClose,
  onSave
}: WorkflowDesignerProps): React.ReactElement | null {
  const [draft, setDraft] = useState<WorkflowDraft>({ ...DEFAULT_DRAFT })
  const [jsonSource, setJsonSource] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [tab, setTab] = useState<string>('visual')

  useEffect(() => {
    if (!open) {
      setDraft({ ...DEFAULT_DRAFT })
      setJsonSource('')
      setJsonError(null)
      setTab('visual')
    }
  }, [open])

  const buildSchema = useCallback((): Record<string, unknown> => {
    return {
      name: draft.name,
      version: draft.version,
      description: draft.description,
      menu: draft.menu,
      form: {
        sections: draft.sections
          .filter((s) => s.title.trim())
          .map((s) => {
            const section: Record<string, unknown> = {
              title: s.title,
              fields: s.fields.filter((f) => f.trim())
            }
            if (s.description.trim()) section.description = s.description
            if (s.component.trim()) section.component = s.component
            if (s.buttonText.trim()) section.buttonText = s.buttonText
            return section
          })
      }
    }
  }, [draft])

  const handleSave = (): void => {
    if (tab === 'json') {
      try {
        const parsed = JSON.parse(jsonSource)
        onSave?.(parsed)
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
        return
      }
    } else {
      onSave?.(buildSchema())
    }
  }

  const syncToJson = (): void => {
    setJsonSource(JSON.stringify(buildSchema(), null, 2))
    setJsonError(null)
  }

  const syncFromJson = (): void => {
    try {
      const parsed = JSON.parse(jsonSource)
      setDraft({
        name: parsed.name || '',
        version: parsed.version || '1.0.0',
        description: parsed.description || '',
        menu: parsed.menu || 'Processing',
        sections: (parsed.form?.sections || []).map((s: Record<string, unknown>) => ({
          title: (s.title as string) || '',
          description: (s.description as string) || '',
          fields: (s.fields as string[]) || [],
          component: (s.component as string) || '',
          buttonText: (s.buttonText as string) || ''
        }))
      })
      setJsonError(null)
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }

  const updateSection = (index: number, section: FormSectionDraft): void => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === index ? section : s))
    }))
  }

  const removeSection = (index: number): void => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }))
  }

  const moveSection = (index: number, direction: -1 | 1): void => {
    const target = index + direction
    setDraft((prev) => {
      const sections = [...prev.sections]
      ;[sections[index], sections[target]] = [sections[target], sections[index]]
      return { ...prev, sections }
    })
  }

  const addSection = (): void => {
    setDraft((prev) => ({
      ...prev,
      sections: [...prev.sections, { ...EMPTY_SECTION }]
    }))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      <Theme style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-5 shrink-0 bg-panel">
          <div className="flex items-center gap-3">
            <Heading size="4" weight="bold" className="text-neutral-12">
              Workflow Designer
            </Heading>
            <Text size="2" className="text-neutral-9">
              Design your workflow form layout
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="soft" size="2" onClick={handleSave}>
              Save
            </Button>
            <Button variant="soft" color="gray" size="2" onClick={onClose}>
              Close
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6">
            <Tabs.Root value={tab} onValueChange={(t) => {
              if (t === 'json') syncToJson()
              setTab(t)
            }}>
              <Tabs.List size="2">
                <Tabs.Trigger value="visual">
                  <MixerHorizontalIcon className="mr-1.5" /> Visual
                </Tabs.Trigger>
                <Tabs.Trigger value="json">
                  <CodeIcon className="mr-1.5" /> JSON
                </Tabs.Trigger>
              </Tabs.List>

              <Box pt="4">
                <Tabs.Content value="visual">
                  <div className="flex flex-col gap-6">
                    {/* Workflow metadata */}
                    <div className="flex flex-col gap-3">
                      <Heading size="3" className="text-neutral-12">Metadata</Heading>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <Text size="1" weight="medium" className="text-neutral-11">Name</Text>
                          <TextField.Root
                            value={draft.name}
                            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                            placeholder="my-workflow"
                            size="2"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Text size="1" weight="medium" className="text-neutral-11">Version</Text>
                          <TextField.Root
                            value={draft.version}
                            onChange={(e) => setDraft((d) => ({ ...d, version: e.target.value }))}
                            placeholder="1.0.0"
                            size="2"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Text size="1" weight="medium" className="text-neutral-11">Description</Text>
                        <TextField.Root
                          value={draft.description}
                          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                          placeholder="Human-readable description"
                          size="2"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Text size="1" weight="medium" className="text-neutral-11">Menu</Text>
                        <Select.Root
                          value={draft.menu}
                          onValueChange={(v) => setDraft((d) => ({ ...d, menu: v }))}
                          size="2"
                        >
                          <Select.Trigger />
                          <Select.Content>
                            <Select.Item value="Import">Import</Select.Item>
                            <Select.Item value="Processing">Processing</Select.Item>
                            <Select.Item value="Export">Export</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      </div>
                    </div>

                    <Separator size="4" />

                    {/* Form sections */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <Heading size="3" className="text-neutral-12">Form Sections</Heading>
                        <Button variant="soft" size="1" onClick={addSection}>
                          <PlusIcon /> Add Section
                        </Button>
                      </div>

                      {draft.sections.map((section, i) => (
                        <SectionEditor
                          key={i}
                          section={section}
                          index={i}
                          total={draft.sections.length}
                          onUpdate={(s) => updateSection(i, s)}
                          onRemove={() => removeSection(i)}
                          onMoveUp={() => moveSection(i, -1)}
                          onMoveDown={() => moveSection(i, 1)}
                        />
                      ))}
                    </div>
                  </div>
                </Tabs.Content>

                <Tabs.Content value="json">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Button variant="soft" size="1" onClick={syncFromJson}>
                        Apply JSON to Visual
                      </Button>
                      {jsonError && (
                        <Text size="1" color="red">{jsonError}</Text>
                      )}
                    </div>
                    <TextArea
                      value={jsonSource}
                      onChange={(e) => {
                        setJsonSource(e.target.value)
                        setJsonError(null)
                      }}
                      rows={30}
                      size="2"
                      className="font-mono"
                      placeholder="Paste or edit workflow JSON here..."
                    />
                  </div>
                </Tabs.Content>
              </Box>
            </Tabs.Root>
          </div>
        </div>
      </Theme>
    </div>
  )
}
