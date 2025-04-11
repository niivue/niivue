export type FMRIEvent = {
  onset: number
  duration: number
  trial_type: string
}

export let fmriEvents: FMRIEvent[] = []

export const trialTypeColorMap: Record<string, [number, number, number, number]> = {}
let nextColorIndex = 0

const defaultColors: [number, number, number][] = [
  [1, 0.4, 0.4], // red
  [0.4, 0.6, 1], // blue
  [0.6, 0.6, 0.6], // gray
  [1, 0.8, 0.3], // orange
  [0.6, 1, 0.6], // green
  [1, 0.6, 1], // magenta
  [0.3, 1, 1], // cyan
  [1, 1, 1] // white fallback
]

export function getColorForTrialType(type: string): [number, number, number, number] {
  if (trialTypeColorMap[type]) return trialTypeColorMap[type]
  const rgb = defaultColors[nextColorIndex % defaultColors.length]
  nextColorIndex++
  return (trialTypeColorMap[type] = [...rgb, 0.25])
}

export function loadFMRIEvents(tsvText: string, nvInstance?: any): void {
  // reset our events
  fmriEvents = []
  
  const lines = tsvText.trim().split('\n')
  if (lines.length < 2) return

  fmriEvents.length = 0
  Object.keys(trialTypeColorMap).forEach(k => delete trialTypeColorMap[k])
  nextColorIndex = 0

  lines.slice(1).forEach(row => {
    const [onsetStr, durationStr, type] = row.split('\t')
    const onset = parseFloat(onsetStr)
    const duration = parseFloat(durationStr)
    if (!isNaN(onset) && !isNaN(duration) && type) {
      fmriEvents.push({ onset, duration, trial_type: type.trim() })
    }
  })

  nvInstance?.drawScene()
}