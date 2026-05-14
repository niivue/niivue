import { useState, useCallback, useEffect, useRef } from 'react'
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
  /** Tooltip text on the disabled Next button explaining what's missing. */
  disabledReason?: string
  loading?: boolean
  lastStepLabel?: string
  onComplete?: () => void
  /** Called when the Next button is clicked (non-last step). Falls back to onStepChange(currentStep+1). */
  onNext?: () => void
  /** Override the footer entirely (e.g., for completion screen) */
  hideFooter?: boolean
  /** Allow clicking completed steps to navigate back */
  allowStepClick?: boolean
  /**
   * When true, the Back-to-viewer / Cancel buttons prompt for confirmation
   * before tearing down the wizard. Wire this to "a step is currently
   * executing" so a misclick doesn't kill a multi-minute import.
   */
  requireConfirmOnClose?: boolean
  /**
   * Suppress the window-level Escape-to-close handler. Used when another
   * shell (e.g. the designer) is stacked over the wizard and owns Escape;
   * without this, both handlers fire and both shells unmount on one press.
   */
  disableEscape?: boolean
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
  disabledReason,
  loading = false,
  lastStepLabel,
  onComplete,
  onNext: onNextProp,
  hideFooter = false,
  allowStepClick = true,
  requireConfirmOnClose = false,
  disableEscape = false,
  children
}: WizardShellProps): React.ReactElement | null {
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const prevStep = useRef(currentStep)
  // Highest step the user has actually advanced through. Forward step-rail
  // clicks are gated on this so we don't let an author skip over an unfilled
  // form, while still allowing them to revisit any step they've already
  // completed in either direction.
  const [maxStepReached, setMaxStepReached] = useState(currentStep)

  // Track direction when step changes
  if (currentStep !== prevStep.current) {
    setDirection(currentStep > prevStep.current ? 'forward' : 'backward')
    prevStep.current = currentStep
  }

  useEffect(() => {
    setMaxStepReached((prev) => (currentStep > prev ? currentStep : prev))
  }, [currentStep])

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1

  const guardedClose = useCallback(() => {
    if (
      requireConfirmOnClose &&
      !confirm(
        'A workflow step is still running. Cancelling now will abort the step ' +
          'immediately — any files it has already written to disk will stay where ' +
          'they are (not rolled back) and may be partial or invalid. Continue?'
      )
    ) {
      return
    }
    onClose()
  }, [requireConfirmOnClose, onClose])

  // Escape used to close the shell automatically when it lived inside a
  // Radix Dialog. The inline panel doesn't get that for free, so we wire
  // it up here — routed through guardedClose so a misclick mid-run still
  // prompts before tearing down.
  useEffect(() => {
    if (!open || disableEscape) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
      }
      e.preventDefault()
      guardedClose()
    }
    window.addEventListener('keydown', handler)
    return (): void => window.removeEventListener('keydown', handler)
  }, [open, disableEscape, guardedClose])

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
      if (allowStepClick && step !== currentStep && step <= maxStepReached) {
        onStepChange(step)
      }
    },
    [allowStepClick, currentStep, maxStepReached, onStepChange]
  )

  if (!open) return null

  return (
    <div className="flex flex-col h-full w-full bg-surface" role="region" aria-label={title}>
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
          onClose={guardedClose}
        />

        {/* Body: step rail + content */}
        <div className="flex flex-1 min-h-0">
          {/* Left step rail. Collapses to an icon-only column below the md
              breakpoint so a narrow window doesn't lose form real estate to a
              full-width rail. */}
          {steps.length > 1 && (
            <aside className="w-16 md:w-56 shrink-0 border-r border-neutral-5 bg-neutral-2 py-4 overflow-hidden">
              <WizardStepIndicator
                steps={steps}
                currentStep={currentStep}
                maxStepReached={maxStepReached}
                onStepClick={allowStepClick ? handleStepClick : undefined}
              />
            </aside>
          )}

          {/* Main content area — overflows when the step's natural height
              exceeds the viewport. The inner wrapper is min-h-full + flex-col
              so steps that opt in (FormSection + step containers) can use
              flex-1 min-h-0 to grow primary lists into the empty space below
              short forms, instead of clipping at a fixed pixel max-h. */}
          <main className="flex-1 min-w-0 overflow-y-auto">
            <div className="p-6 max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto w-full min-h-full flex flex-col">
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
            disabledReason={disabledReason}
            loading={loading}
            lastStepLabel={lastStepLabel}
            onBack={goBack}
            onNext={goNext}
          />
        )}
      </WizardProvider>
    </div>
  )
}
