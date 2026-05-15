import { Heading, Text, Button } from '@radix-ui/themes'
import { ArrowLeftIcon } from '@radix-ui/react-icons'

interface WizardHeaderProps {
  title: string
  currentStep: number
  totalSteps: number
  onClose: () => void
}

export function WizardHeader({
  title,
  currentStep,
  totalSteps,
  onClose
}: WizardHeaderProps): React.ReactElement {
  const progressPct =
    totalSteps > 0 ? Math.min(100, Math.max(0, ((currentStep + 1) / totalSteps) * 100)) : 0
  return (
    <header className="shrink-0 bg-panel border-b border-neutral-5">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            color="gray"
            size="2"
            onClick={onClose}
            aria-label="Back to viewer"
          >
            <ArrowLeftIcon /> Back to viewer
          </Button>
          <div className="w-px h-6 bg-neutral-5" aria-hidden />
          <Heading size="4" weight="bold" className="text-neutral-12">
            {title}
          </Heading>
        </div>

        <Text size="2" className="text-neutral-9">
          Step {currentStep + 1} of {totalSteps}
        </Text>
      </div>
      {totalSteps > 1 && (
        <div
          className="h-0.5 bg-neutral-4"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalSteps}
          aria-valuenow={currentStep + 1}
          aria-label={`Wizard progress: step ${currentStep + 1} of ${totalSteps}`}
        >
          <div
            className="h-full bg-accent-9 transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </header>
  )
}
