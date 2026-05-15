interface SpinnerProps {
  /** Visual scale. `sm` for inline use inside text or list items, `md` for
   *  buttons, `lg` for centered section-level loading states. */
  size?: 'sm' | 'md' | 'lg'
  /** When the spinner sits on a colored button background (e.g. accent
   *  primary), `contrast` flips the rim to accent-contrast so it remains
   *  visible. Otherwise the rim uses accent-9. */
  tone?: 'accent' | 'contrast' | 'neutral'
  className?: string
}

const SIZE_CLS: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'w-3 h-3 border',
  md: 'w-4 h-4 border-2',
  lg: 'w-6 h-6 border-2'
}

const TONE_CLS: Record<NonNullable<SpinnerProps['tone']>, string> = {
  accent: 'border-accent-9',
  contrast: 'border-accent-contrast',
  neutral: 'border-neutral-8'
}

/** Shared loading spinner. Use instead of hand-rolling
 *  `animate-spin ... border-... border-t-transparent rounded-full`
 *  so spinner colors and sizes stay consistent across screens. */
export function Spinner({
  size = 'md',
  tone = 'accent',
  className = ''
}: SpinnerProps): React.ReactElement {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`animate-spin ${SIZE_CLS[size]} ${TONE_CLS[tone]} border-t-transparent rounded-full ${className}`}
    />
  )
}
