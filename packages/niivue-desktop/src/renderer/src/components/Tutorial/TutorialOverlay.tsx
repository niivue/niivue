import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Button, Text, Heading } from '@radix-ui/themes'
import { Cross1Icon, ArrowRightIcon, ArrowLeftIcon } from '@radix-ui/react-icons'

export interface TutorialStep {
  /** data-tutorial-id of the element to spotlight, or null for a centered modal */
  target: string | null
  /** Title shown in the tooltip */
  title: string
  /** Instructional body text (supports line breaks) */
  body: string
  /** Preferred placement relative to the target */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** If true, advance only when user interacts with the target */
  waitForInteraction?: boolean
  /** Optional action label override for the next button */
  nextLabel?: string
}

interface TutorialOverlayProps {
  steps: TutorialStep[]
  currentStep: number
  onNext: () => void
  onBack: () => void
  onSkip: () => void
  onComplete: () => void
}

interface TooltipPosition {
  top: number
  left: number
  placement: 'top' | 'bottom' | 'left' | 'right'
}

function getTooltipPosition(
  targetRect: DOMRect,
  preferred: 'top' | 'bottom' | 'left' | 'right',
  tooltipWidth: number,
  tooltipHeight: number
): TooltipPosition {
  const gap = 12
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Try preferred placement first, then fallback
  const placements: Array<'top' | 'bottom' | 'left' | 'right'> = [preferred]
  if (preferred === 'bottom') placements.push('top', 'right', 'left')
  else if (preferred === 'top') placements.push('bottom', 'right', 'left')
  else if (preferred === 'right') placements.push('left', 'bottom', 'top')
  else placements.push('right', 'bottom', 'top')

  for (const p of placements) {
    let top = 0
    let left = 0

    switch (p) {
      case 'bottom':
        top = targetRect.bottom + gap
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        break
      case 'top':
        top = targetRect.top - tooltipHeight - gap
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        break
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
        left = targetRect.right + gap
        break
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
        left = targetRect.left - tooltipWidth - gap
        break
    }

    // Clamp within viewport
    left = Math.max(12, Math.min(left, vw - tooltipWidth - 12))
    top = Math.max(12, Math.min(top, vh - tooltipHeight - 12))

    // Check if it fits without overlapping the target
    const tooltipRect = { top, left, right: left + tooltipWidth, bottom: top + tooltipHeight }
    const overlaps =
      tooltipRect.left < targetRect.right &&
      tooltipRect.right > targetRect.left &&
      tooltipRect.top < targetRect.bottom &&
      tooltipRect.bottom > targetRect.top

    if (!overlaps) {
      return { top, left, placement: p }
    }
  }

  // Fallback: below target, clamped
  return {
    top: Math.min(targetRect.bottom + gap, vh - tooltipHeight - 12),
    left: Math.max(12, Math.min(targetRect.left, vw - tooltipWidth - 12)),
    placement: 'bottom'
  }
}

export function TutorialOverlay({
  steps,
  currentStep,
  onNext,
  onBack,
  onSkip,
  onComplete
}: TutorialOverlayProps): React.ReactElement | null {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1
  const isFirst = currentStep === 0

  const updatePosition = useCallback(() => {
    if (!step) return

    if (!step.target) {
      setTargetRect(null)
      setTooltipPos(null)
      return
    }

    const el = document.querySelector(`[data-tutorial-id="${step.target}"]`)
    if (!el) {
      setTargetRect(null)
      setTooltipPos(null)
      return
    }

    const rect = el.getBoundingClientRect()
    setTargetRect(rect)

    if (tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      setTooltipPos(
        getTooltipPosition(rect, step.placement || 'bottom', tooltipRect.width, tooltipRect.height)
      )
    }
  }, [step])

  // Update position on step change and on resize/scroll
  useEffect(() => {
    updatePosition()
    const frame = requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [updatePosition, currentStep])

  // Re-measure after tooltip renders to get accurate size
  useEffect(() => {
    const timer = setTimeout(updatePosition, 50)
    return () => clearTimeout(timer)
  }, [currentStep, updatePosition])

  if (!step) return null

  const hasCutout = targetRect !== null
  const padding = 8

  // SVG mask with cutout for the target element
  const renderBackdrop = (): React.ReactElement => {
    if (!hasCutout) {
      return (
        <div
          className="fixed inset-0 z-[100]"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={(e) => e.stopPropagation()}
        />
      )
    }

    return (
      <svg
        className="fixed inset-0 z-[100]"
        width="100%"
        height="100%"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <mask id="tutorial-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left - padding}
              y={targetRect.top - padding}
              width={targetRect.width + padding * 2}
              height={targetRect.height + padding * 2}
              rx="8"
              ry="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.5)"
          mask="url(#tutorial-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>
    )
  }

  // Highlight ring around the target
  const renderHighlight = (): React.ReactElement | null => {
    if (!hasCutout) return null

    return (
      <div
        className="fixed z-[101] pointer-events-none rounded-lg"
        style={{
          top: targetRect.top - padding,
          left: targetRect.left - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
          boxShadow: '0 0 0 2px var(--accent-9), 0 0 12px 2px var(--accent-a5)',
          transition: 'all 200ms ease-out'
        }}
      />
    )
  }

  // Tooltip with step content
  const tooltipStyle: React.CSSProperties = hasCutout && tooltipPos
    ? { top: tooltipPos.top, left: tooltipPos.left }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

  return (
    <>
      {renderBackdrop()}
      {renderHighlight()}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[102] w-[380px] bg-panel border border-neutral-6 rounded-xl shadow-2xl"
        style={{
          ...tooltipStyle,
          transition: 'top 200ms ease-out, left 200ms ease-out'
        }}
      >
        <div className="p-5">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mb-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className={
                  'w-1.5 h-1.5 rounded-full transition-colors ' +
                  (i === currentStep
                    ? 'bg-accent-9'
                    : i < currentStep
                      ? 'bg-accent-7'
                      : 'bg-neutral-6')
                }
              />
            ))}
            <div className="flex-1" />
            <Text size="1" className="text-neutral-8">
              {currentStep + 1}/{steps.length}
            </Text>
          </div>

          <Heading size="3" weight="bold" className="text-neutral-12 mb-2">
            {step.title}
          </Heading>

          <Text size="2" className="text-neutral-11 leading-relaxed whitespace-pre-line">
            {step.body}
          </Text>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-5">
          <Button
            variant="ghost"
            color="gray"
            size="1"
            onClick={onSkip}
          >
            <Cross1Icon />
            Skip tutorial
          </Button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                variant="soft"
                color="gray"
                size="1"
                onClick={onBack}
              >
                <ArrowLeftIcon />
                Back
              </Button>
            )}
            <Button
              variant="solid"
              size="1"
              onClick={isLast ? onComplete : onNext}
            >
              {isLast ? 'Finish' : (step.nextLabel || 'Next')}
              {!isLast && <ArrowRightIcon />}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
