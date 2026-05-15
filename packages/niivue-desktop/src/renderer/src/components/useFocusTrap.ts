import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hidden && el.offsetParent !== null
  )
}

/**
 * Hand-rolled focus trap for inline panels that occupy the viewport but
 * don't use Radix Dialog (which would supply this for free).
 *
 * - On mount, save document.activeElement and, if focus is outside the
 *   container, move it to the first focusable child.
 * - While enabled, Tab / Shift+Tab wraps within the container so keyboard
 *   focus can never escape to background controls.
 * - On unmount (or when `enabled` flips to false), restore focus to the
 *   element that was focused before the trap engaged.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    if (!container.contains(document.activeElement)) {
      const els = getFocusableElements(container)
      if (els.length > 0) {
        els[0].focus()
      } else if (container.tabIndex >= 0) {
        container.focus()
      }
    }

    const handleKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return
      const els = getFocusableElements(container)
      if (els.length === 0) {
        e.preventDefault()
        return
      }
      const first = els[0]
      const last = els[els.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last || !container.contains(active)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKey)
    return (): void => {
      container.removeEventListener('keydown', handleKey)
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [containerRef, enabled])
}
