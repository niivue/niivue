import { Button, Tooltip } from '@radix-ui/themes'

interface WizardFooterProps {
  isFirstStep: boolean
  isLastStep: boolean
  canProceed: boolean
  loading?: boolean
  lastStepLabel?: string
  /**
   * Human-readable reason why Next is disabled. Surfaced as a tooltip on the
   * Next button so authors don't have to guess what's missing. When omitted,
   * the disabled button has no tooltip.
   */
  disabledReason?: string
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
  disabledReason,
  onBack,
  onNext,
  onCancel
}: WizardFooterProps): React.ReactElement {
  // Cancel stays enabled even mid-run: long-running steps (e.g. multi-minute
  // dcm2niix imports) must remain abortable so users aren't trapped waiting.
  // Back stays disabled while running to avoid racing the engine's section
  // transition.
  const nextDisabled = !canProceed || loading
  const nextLabel = loading ? 'Running...' : isLastStep ? lastStepLabel : 'Next'

  const nextButton = (
    <Button variant="solid" size="2" onClick={onNext} disabled={nextDisabled}>
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin w-3.5 h-3.5 border-2 border-accent-contrast border-t-transparent rounded-full" />
          Running...
        </span>
      ) : (
        nextLabel
      )}
    </Button>
  )

  return (
    <footer className="flex items-center justify-between px-6 py-4 border-t border-neutral-5 shrink-0 bg-panel">
      <Button
        variant="soft"
        color="gray"
        size="2"
        onClick={isFirstStep ? onCancel : onBack}
        disabled={!isFirstStep && loading}
      >
        {isFirstStep ? 'Cancel' : 'Back'}
      </Button>

      {/* Tooltip on the disabled Next reveals which fields are still missing.
          Wrap in a span so the disabled <button> can still surface hover. */}
      {nextDisabled && disabledReason ? (
        <Tooltip content={disabledReason}>
          <span tabIndex={0}>{nextButton}</span>
        </Tooltip>
      ) : (
        nextButton
      )}
    </footer>
  )
}
