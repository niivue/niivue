import { Text } from '@radix-ui/themes'
import { CheckIcon } from '@radix-ui/react-icons'
import type { WizardStep } from './WizardContext.js'

interface WizardStepIndicatorProps {
  steps: WizardStep[]
  currentStep: number
  /**
   * Highest step the user has advanced through. Steps up to this index are
   * clickable in either direction; steps beyond it stay disabled so an author
   * can't skip over an unfilled form.
   */
  maxStepReached?: number
  onStepClick?: (step: number) => void
}

export function WizardStepIndicator({
  steps,
  currentStep,
  maxStepReached,
  onStepClick
}: WizardStepIndicatorProps): React.ReactElement {
  const reached = maxStepReached ?? currentStep
  return (
    <nav aria-label="Wizard steps" className="flex flex-col gap-1 py-2">
      {steps.map((step, i) => {
        const isCompleted = i < currentStep
        const isCurrent = i === currentStep
        const isVisited = i <= reached && !isCurrent
        const isUnreached = i > reached
        const isClickable = isVisited && !!onStepClick

        return (
          <button
            key={i}
            type="button"
            disabled={!isClickable}
            onClick={() => isClickable && onStepClick(i)}
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={`Step ${i + 1}: ${step.label}${isCompleted ? ' (completed)' : ''}`}
            title={isUnreached ? 'Complete the earlier steps to unlock this one' : undefined}
            className={
              'flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors duration-150 ' +
              (isCurrent
                ? 'bg-accent-3 text-accent-11'
                : isVisited
                  ? 'text-neutral-11 hover:bg-neutral-3 cursor-pointer'
                  : 'text-neutral-8 cursor-not-allowed')
            }
          >
            {/* Step number / check circle */}
            <div
              className={
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors duration-150 ' +
                (isCurrent
                  ? 'bg-accent-9 text-accent-contrast'
                  : isCompleted
                    ? 'bg-accent-surface text-accent-11 border border-accent-7'
                    : 'bg-neutral-3 text-neutral-8 border border-neutral-6')
              }
            >
              {isCompleted ? <CheckIcon className="w-3.5 h-3.5" /> : i + 1}
            </div>

            {/* Label */}
            <div className="flex flex-col min-w-0">
              <Text size="2" weight={isCurrent ? 'medium' : 'regular'} className="truncate">
                {step.label}
              </Text>
              {step.description && (
                <Text
                  size="1"
                  className={
                    'truncate mt-0.5 ' +
                    (isCurrent ? 'text-accent-11' : isVisited ? 'text-neutral-9' : 'text-neutral-8')
                  }
                >
                  {step.description}
                </Text>
              )}
            </div>
          </button>
        )
      })}
    </nav>
  )
}
