import { Button } from '@radix-ui/themes'

interface WizardFooterProps {
  isFirstStep: boolean
  isLastStep: boolean
  canProceed: boolean
  loading?: boolean
  lastStepLabel?: string
  onBack: () => void
  onNext: () => void
  onCancel: () => void
}

export function WizardFooter({
  isFirstStep,
  isLastStep,
  canProceed,
  loading,
  lastStepLabel = 'Run',
  onBack,
  onNext,
  onCancel
}: WizardFooterProps): React.ReactElement {
  return (
    <footer className="flex items-center justify-between px-6 py-4 border-t border-neutral-5 shrink-0 bg-panel">
      <Button
        variant="soft"
        color="gray"
        size="2"
        onClick={isFirstStep ? onCancel : onBack}
        disabled={loading}
      >
        {isFirstStep ? 'Cancel' : 'Back'}
      </Button>

      <div className="flex items-center gap-3">
        {!isFirstStep && (
          <Button
            variant="soft"
            color="gray"
            size="2"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          variant="solid"
          size="2"
          onClick={onNext}
          disabled={!canProceed || loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin w-3.5 h-3.5 border-2 border-accent-contrast border-t-transparent rounded-full" />
              Running...
            </span>
          ) : isLastStep ? (
            lastStepLabel
          ) : (
            'Next'
          )}
        </Button>
      </div>
    </footer>
  )
}
