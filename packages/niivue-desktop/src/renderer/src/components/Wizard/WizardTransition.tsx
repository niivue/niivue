import { useEffect, useRef, useState } from 'react'

interface WizardTransitionProps {
  stepIndex: number
  direction: 'forward' | 'backward'
  children: React.ReactNode
}

/** Read the user's reduced-motion preference. Tracked via media-query
 *  listener so a runtime change (system pref toggle, OS dark mode switch
 *  in some setups) is picked up without a remount. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent): void => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return (): void => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

export function WizardTransition({
  stepIndex,
  direction,
  children
}: WizardTransitionProps): React.ReactElement {
  const [displayedStep, setDisplayedStep] = useState(stepIndex)
  const [displayedChildren, setDisplayedChildren] = useState(children)
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (stepIndex === displayedStep) {
      setDisplayedChildren(children)
      return
    }

    // Reduced-motion users skip the slide/fade transition entirely —
    // swap content instantly and leave phase at 'idle'.
    if (reducedMotion) {
      setDisplayedChildren(children)
      setDisplayedStep(stepIndex)
      setPhase('idle')
      return
    }

    // Start exit animation
    setPhase('exit')
    clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(() => {
      // Switch content and start enter animation
      setDisplayedChildren(children)
      setDisplayedStep(stepIndex)
      setPhase('enter')

      timeoutRef.current = setTimeout(() => {
        setPhase('idle')
      }, 150)
    }, 100)

    return () => clearTimeout(timeoutRef.current)
  }, [stepIndex, children, reducedMotion])

  const className =
    phase === 'exit'
      ? 'wizard-step-exit wizard-step-exit-active'
      : phase === 'enter'
        ? 'wizard-step-enter wizard-step-enter-active'
        : ''

  return (
    <div
      className={className}
      data-direction={direction}
      // display: flex + flex-direction: column lets the step content opt into
      // `flex-1 min-h-0` so primary lists grow to fill empty vertical space.
      // The flex: 1 + minHeight: 0 anchor this div to WizardShell's flex-col
      // inner so it never clips below the visible area.
      style={{ minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      {displayedChildren}
    </div>
  )
}
