import { useState, useCallback, useRef } from 'react'
import { Theme } from '@radix-ui/themes'
import { WizardProvider, type WizardStep } from './WizardContext.js'
import { WizardHeader } from './WizardHeader.js'
import { WizardStepIndicator } from './WizardStepIndicator.js'
import { WizardFooter } from './WizardFooter.js'
import { WizardTransition } from './WizardTransition.js'

interface WizardShellProps {
  open: boolean
  onClose: () => void
  title: string
  steps: WizardStep[]
  currentStep: number
  onStepChange: (step: number) => void
  canProceed?: boolean
  loading?: boolean
  lastStepLabel?: string
  onComplete?: () => void
  /** Called when the Next button is clicked (non-last step). Falls back to onStepChange(currentStep+1). */
  onNext?: () => void
  /** Override the footer entirely (e.g., for completion screen) */
  hideFooter?: boolean
  /** Allow clicking completed steps to navigate back */
  allowStepClick?: boolean
  children: React.ReactNode
}

export function WizardShell({
  open,
  onClose,
  title,
  steps,
  currentStep,
  onStepChange,
  canProceed = true,
  loading = false,
  lastStepLabel,
  onComplete,
  onNext: onNextProp,
  hideFooter = false,
  allowStepClick = true,
  children
}: WizardShellProps): React.ReactElement | null {
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const prevStep = useRef(currentStep)

  // Track direction when step changes
  if (currentStep !== prevStep.current) {
    setDirection(currentStep > prevStep.current ? 'forward' : 'backward')
    prevStep.current = currentStep
  }

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1

  const goNext = useCallback(() => {
    if (isLastStep) {
      onComplete?.()
    } else if (onNextProp) {
      onNextProp()
    } else {
      onStepChange(currentStep + 1)
    }
  }, [currentStep, isLastStep, onComplete, onNextProp, onStepChange])

  const goBack = useCallback(() => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1)
    }
  }, [currentStep, isFirstStep, onStepChange])

  const handleStepClick = useCallback(
    (step: number) => {
      if (allowStepClick && step < currentStep) {
        onStepChange(step)
      }
    },
    [allowStepClick, currentStep, onStepChange]
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      <Theme style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <WizardProvider
          value={{
            currentStep,
            totalSteps: steps.length,
            steps,
            goNext,
            goBack,
            canProceed,
            isFirstStep,
            isLastStep,
            direction
          }}
        >
          {/* Header */}
          <WizardHeader
            title={title}
            currentStep={currentStep}
            totalSteps={steps.length}
            onClose={onClose}
          />

          {/* Body: step rail + content */}
          <div className="flex flex-1 min-h-0">
            {/* Left step rail */}
            {steps.length > 1 && (
              <aside className="w-56 shrink-0 border-r border-neutral-5 bg-neutral-2 py-4 overflow-hidden">
                <WizardStepIndicator
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={allowStepClick ? handleStepClick : undefined}
                />
              </aside>
            )}

            {/* Main content area — single scroll context */}
            <main className="flex-1 min-w-0 overflow-y-auto">
              <div className="p-6 max-w-4xl mx-auto">
                <WizardTransition stepIndex={currentStep} direction={direction}>
                  {children}
                </WizardTransition>
              </div>
            </main>
          </div>

          {/* Footer */}
          {!hideFooter && (
            <WizardFooter
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
              canProceed={canProceed}
              loading={loading}
              lastStepLabel={lastStepLabel}
              onBack={goBack}
              onNext={goNext}
              onCancel={onClose}
            />
          )}
        </WizardProvider>
      </Theme>
    </div>
  )
}
