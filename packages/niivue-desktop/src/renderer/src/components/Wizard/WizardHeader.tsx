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
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-5 shrink-0 bg-panel">
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
    </header>
  )
}
