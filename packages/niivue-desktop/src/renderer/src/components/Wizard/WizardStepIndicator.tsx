import { Text } from '@radix-ui/themes'
import { CheckIcon } from '@radix-ui/react-icons'
import type { WizardStep } from './WizardContext.js'

interface WizardStepIndicatorProps {
  steps: WizardStep[]
  currentStep: number
  onStepClick?: (step: number) => void
}

export function WizardStepIndicator({
  steps,
  currentStep,
  onStepClick
}: WizardStepIndicatorProps): React.ReactElement {
  return (
    <nav className="flex flex-col gap-1 py-2">
      {steps.map((step, i) => {
        const isCompleted = i < currentStep
        const isCurrent = i === currentStep
        const isClickable = isCompleted && onStepClick

        return (
          <button
            key={i}
            type="button"
            disabled={!isClickable}
            onClick={() => isClickable && onStepClick(i)}
            className={
              'flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors duration-150 ' +
              (isCurrent
                ? 'bg-accent-3 text-accent-11'
                : isCompleted
                  ? 'text-neutral-11 hover:bg-neutral-3 cursor-pointer'
                  : 'text-neutral-8 cursor-default')
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
              <Text
                size="2"
                weight={isCurrent ? 'medium' : 'regular'}
                className="truncate"
              >
                {step.label}
              </Text>
              {step.description && isCurrent && (
                <Text size="1" className="truncate text-neutral-9 mt-0.5">
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
