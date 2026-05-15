import React, { useState, useCallback } from 'react'
import { TutorialOverlay, type TutorialStep } from './TutorialOverlay.js'

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: null,
    title: 'Welcome to the Workflow Designer',
    body: 'This tutorial will walk you through creating a custom workflow — a reusable processing pipeline that appears in the application menu.\n\nWorkflows combine tools, user-facing forms, and step-by-step execution into a single, shareable package.',
    nextLabel: 'Get started'
  },
  {
    target: 'designer-metadata',
    title: 'Name your workflow',
    body: 'Start by giving your workflow a name, version, and description.\n\nThe name is used as a unique identifier (e.g. "skull-strip"). The description is shown to users when they launch the workflow. The menu controls where it appears — Import, Processing, or Export.',
    placement: 'bottom'
  },
  {
    target: 'designer-context-fields',
    title: 'Define context fields',
    body: 'Context fields are the variables your workflow uses. They can be filled by the user in a form, auto-populated by heuristics, or set by previous steps.\n\nCommon types include "volume" (a NIfTI file), "string", "number", "dicom-folder", and "boolean". Click "Add Field" to create one.',
    placement: 'top'
  },
  {
    target: 'designer-form-sections',
    title: 'Design the user form',
    body: 'Form sections define what the user sees when they run your workflow. Each section is a wizard step with a title, description, and one or more context fields.\n\nDrag fields into sections to build the form layout. The last section\'s button triggers execution.',
    placement: 'top'
  },
  {
    target: 'designer-tabs',
    title: 'Switch to the Steps tab',
    body: 'The Visual tab handles metadata and forms. Now switch to the Steps tab to define the processing pipeline — the tools that run when the user clicks "Run".',
    placement: 'bottom',
    nextLabel: 'Continue'
  },
  {
    target: 'designer-steps-tab',
    title: 'Add pipeline steps',
    body: 'Click "Add Step" to pick a tool from the registry. Each step runs a tool (like dcm2niix, fslbet, or a custom executable) with specific inputs.\n\nSteps execute in order. You can add conditions to skip steps based on context values.',
    placement: 'bottom'
  },
  {
    target: 'designer-auto-generate',
    title: 'Auto-generate forms',
    body: 'After adding steps, click "Auto-generate forms" to automatically create context fields and form sections for any unbound tool inputs.\n\nThis saves time by wiring up the form for you — you can always customize it afterward on the Visual tab.',
    placement: 'bottom'
  },
  {
    target: 'designer-tabs',
    title: 'Preview your form',
    body: 'Use the "Form Preview" tab to see exactly what users will experience. You can fill in test values and verify the layout before saving.\n\nThe "Pipeline" tab shows a visual diagram of how data flows between steps.',
    placement: 'bottom'
  },
  {
    target: 'designer-tabs',
    title: 'View the JSON',
    body: 'Every workflow is a JSON file under the hood. The JSON tab lets you view, edit, or paste a workflow definition directly.\n\nYou can export a workflow as JSON to share with colleagues or check it into version control.',
    placement: 'bottom'
  },
  {
    target: 'designer-save',
    title: 'Save your workflow',
    body: 'Click "Save" to write your workflow to disk. It will immediately appear in the application menu under the category you selected.\n\nSaved workflows live in the workflows/ directory and can be edited again anytime via the menu.',
    placement: 'bottom'
  },
  {
    target: null,
    title: 'You\'re ready to build workflows!',
    body: 'Here\'s a quick recap:\n\n1. Set metadata (name, description, menu)\n2. Define context fields for user inputs\n3. Arrange fields into form sections\n4. Add pipeline steps with tools\n5. Wire step inputs to context fields\n6. Preview, validate, and save\n\nTry creating a simple workflow now — start with one tool and one form field, then build from there.',
    nextLabel: 'Done'
  }
]

interface WorkflowTutorialProps {
  open: boolean
  onClose: () => void
}

export function WorkflowTutorial({ open, onClose }: WorkflowTutorialProps): React.ReactElement | null {
  const [step, setStep] = useState(0)

  const handleNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, TUTORIAL_STEPS.length - 1))
  }, [])

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0))
  }, [])

  const handleSkip = useCallback(() => {
    setStep(0)
    onClose()
  }, [onClose])

  const handleComplete = useCallback(() => {
    setStep(0)
    onClose()
  }, [onClose])

  if (!open) return null

  return (
    <TutorialOverlay
      steps={TUTORIAL_STEPS}
      currentStep={step}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkip}
      onComplete={handleComplete}
    />
  )
}
