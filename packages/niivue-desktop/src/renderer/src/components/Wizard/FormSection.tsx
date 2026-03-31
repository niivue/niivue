import React from 'react'
import { Heading, Text, Separator } from '@radix-ui/themes'
import type { WorkflowDefinition, FormSectionDef } from '../../../../common/workflowTypes.js'
import { AutoField } from './AutoField.js'

interface CustomComponentProps {
  context: Record<string, unknown>
  onFieldChange: (fieldName: string, value: unknown) => void
  onLoadFile?: (niftiPath: string) => Promise<void>
}

interface FormSectionProps {
  section: FormSectionDef
  definition: WorkflowDefinition
  context: Record<string, unknown>
  onFieldChange: (fieldName: string, value: unknown) => void
  heuristicLoading: Set<string>
  onLoadFile?: (niftiPath: string) => Promise<void>
  componentRegistry: Record<string, React.FC<CustomComponentProps>>
}

export function FormSection({
  section,
  definition,
  context,
  onFieldChange,
  heuristicLoading,
  onLoadFile,
  componentRegistry
}: FormSectionProps): React.ReactElement {
  const fields = definition.context?.fields ?? {}

  // Custom component from registry
  if (section.component) {
    const CustomComponent = componentRegistry[section.component]
    if (CustomComponent) {
      const isLoading = section.fields.some((f) => heuristicLoading.has(f))
      if (isLoading) {
        return (
          <div className="py-12 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-accent-9 border-t-transparent rounded-full mx-auto mb-3" />
            <Text size="2" className="text-neutral-9">Preparing data...</Text>
          </div>
        )
      }
      return (
        <div className="flex flex-col gap-4">
          <div>
            <Heading size="3" weight="bold" className="text-neutral-12">
              {section.title}
            </Heading>
            {section.description && (
              <Text size="2" className="text-neutral-9 mt-1" as="p">
                {section.description}
              </Text>
            )}
          </div>
          <Separator size="4" />
          <CustomComponent context={context} onFieldChange={onFieldChange} onLoadFile={onLoadFile} />
        </div>
      )
    }
  }

  // Auto-generated fields
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Heading size="3" weight="bold" className="text-neutral-12">
          {section.title}
        </Heading>
        {section.description && (
          <Text size="2" className="text-neutral-9 mt-1" as="p">
            {section.description}
          </Text>
        )}
      </div>
      <Separator size="4" />
      <div className="flex flex-col gap-3">
        {section.fields.map((fieldName) => {
          const fieldDef = fields[fieldName]
          if (!fieldDef) return null
          return (
            <AutoField
              key={fieldName}
              fieldName={fieldName}
              fieldDef={fieldDef}
              value={context[fieldName]}
              onChange={(v) => onFieldChange(fieldName, v)}
              loading={heuristicLoading.has(fieldName)}
              datasetName={context.dataset_name as string | undefined}
            />
          )
        })}
      </div>
    </div>
  )
}
