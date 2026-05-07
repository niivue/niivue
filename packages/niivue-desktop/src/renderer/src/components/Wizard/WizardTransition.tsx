import { useEffect, useRef, useState } from 'react'

interface WizardTransitionProps {
  stepIndex: number
  direction: 'forward' | 'backward'
  children: React.ReactNode
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

  useEffect(() => {
    if (stepIndex === displayedStep) {
      setDisplayedChildren(children)
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
  }, [stepIndex, children])

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
      style={{ minHeight: 0, flex: 1 }}
    >
      {displayedChildren}
    </div>
  )
}
