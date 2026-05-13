import React from 'react'
import { Heading, Text, Separator } from '@radix-ui/themes'
import type { WorkflowDefinition, FormSectionDef } from '../../../../common/workflowTypes.js'
import { AutoField } from './AutoField.js'

interface CustomComponentProps {
  context: Record<string, unknown>
  stepOutputs?: Record<string, Record<string, unknown>>
  onFieldChange: (fieldName: string, value: unknown) => void
  onLoadFile?: (niftiPath: string) => Promise<void>
  fields?: string[]
  fieldDefs?: Record<string, import('../../../../common/workflowTypes.js').ContextFieldDef>
}

/** Field types that AutoField renders above a section's custom component.
 *  Arrays and opaque object types are handed off to the custom component to
 *  avoid double-rendering — when no custom component is configured, the
 *  no-custom-component branch below routes arrays through AutoField on its
 *  own. */
function isSimpleInputType(type: string): boolean {
  if (type.endsWith('[]')) return false
  return type !== 'volume' && type !== 'mask' && type !== 'object'
}

interface FormSectionProps {
  section: FormSectionDef
  definition: WorkflowDefinition
  context: Record<string, unknown>
  stepOutputs?: Record<string, Record<string, unknown>>
  onFieldChange: (fieldName: string, value: unknown) => void
  heuristicLoading: Set<string>
  onLoadFile?: (niftiPath: string) => Promise<void>
  componentRegistry: Record<string, React.FC<CustomComponentProps>>
  /** Per-field validation errors keyed by context field name. */
  fieldErrors?: Record<string, string>
}

export function FormSection({
  section,
  definition,
  context,
  stepOutputs,
  onFieldChange,
  heuristicLoading,
  onLoadFile,
  componentRegistry,
  fieldErrors
}: FormSectionProps): React.ReactElement {
  const fields = definition.context?.fields ?? {}

  // Custom component from registry
  if (section.component) {
    const CustomComponent = componentRegistry[section.component]
    if (CustomComponent) {
      // Only show the section-level spinner on initial load (when the loading
      // field has no value yet). Re-firing heuristics with values already
      // populated must not unmount the custom component — that would reset
      // its internal state (scroll, focus, in-progress lasso/click) and lose
      // user interactions mid-edit.
      const hasValue = (v: unknown): boolean => v != null && !(Array.isArray(v) && v.length === 0)
      const isInitialLoading = section.fields.some(
        (f) => heuristicLoading.has(f) && !hasValue(context[f])
      )
      if (isInitialLoading) {
        return (
          <div className="py-12 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-accent-9 border-t-transparent rounded-full mx-auto mb-3" />
            <Text size="2" className="text-neutral-9">
              Preparing data...
            </Text>
          </div>
        )
      }
      // Render simple-input fields above the component; complex array/object
      // fields (subject[], series-mapping[], etc.) are handled inside it.
      const inputFields = section.fields
        .map((name) => ({ name, def: fields[name] }))
        .filter((f) => f.def && isSimpleInputType(f.def.type))
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
          {inputFields.length > 0 && (
            <div className="flex flex-col gap-3">
              {inputFields.map(({ name, def }) => (
                <AutoField
                  key={name}
                  fieldName={name}
                  fieldDef={def!}
                  value={context[name]}
                  onChange={(v) => onFieldChange(name, v)}
                  loading={heuristicLoading.has(name)}
                  datasetName={context.dataset_name as string | undefined}
                  stepOutputs={stepOutputs}
                  context={context}
                  error={fieldErrors?.[name]}
                />
              ))}
            </div>
          )}
          <CustomComponent
            context={context}
            stepOutputs={stepOutputs}
            onFieldChange={onFieldChange}
            onLoadFile={onLoadFile}
            fields={section.fields}
            fieldDefs={fields}
          />
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
              stepOutputs={stepOutputs}
              context={context}
              error={fieldErrors?.[fieldName]}
            />
          )
        })}
      </div>
    </div>
  )
}
