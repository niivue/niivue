import { Button, Tooltip } from '@radix-ui/themes'
import { Spinner } from '../Spinner.js'

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
}

export function WizardFooter({
  isFirstStep,
  isLastStep,
  canProceed,
  loading,
  lastStepLabel = 'Run',
  disabledReason,
  onBack,
  onNext
}: WizardFooterProps): React.ReactElement {
  // Cancel stays enabled even mid-run: long-running steps (e.g. multi-minute
  // dcm2niix imports) must remain abortable so users aren't trapped waiting.
  // Back stays disabled while running to avoid racing the engine's section
  // transition.
  const nextDisabled = !canProceed || loading
  const nextLabel = loading ? 'Running…' : isLastStep ? lastStepLabel : 'Next'

  const nextButton = (
    <Button variant="solid" size="2" onClick={onNext} disabled={nextDisabled}>
      {loading ? (
        <span className="flex items-center gap-2">
          <Spinner size="md" tone="contrast" />
          Running…
        </span>
      ) : (
        nextLabel
      )}
    </Button>
  )

  // The header already renders a "Back to viewer" affordance, so the footer
  // doesn't need a second Cancel on the first step — that duplication was
  // pointed out in the workflow-designer UX review. Use a single Back button
  // that's disabled on the first step (and during loading, to avoid racing
  // the engine).
  return (
    <footer className="flex items-center justify-between px-6 py-4 border-t border-neutral-5 shrink-0 bg-panel">
      <Button
        variant="soft"
        color="gray"
        size="2"
        onClick={onBack}
        disabled={isFirstStep || loading}
        aria-label={isFirstStep ? 'Back (you are on the first step)' : 'Back'}
      >
        Back
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
