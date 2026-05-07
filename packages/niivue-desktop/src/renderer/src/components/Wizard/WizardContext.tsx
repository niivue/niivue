import { createContext, useContext } from 'react'

export interface WizardStep {
  label: string
  description?: string
  icon?: React.ReactNode
}

export interface WizardContextValue {
  currentStep: number
  totalSteps: number
  steps: WizardStep[]
  goNext: () => void
  goBack: () => void
  canProceed: boolean
  isFirstStep: boolean
  isLastStep: boolean
  direction: 'forward' | 'backward'
}

const WizardCtx = createContext<WizardContextValue | null>(null)

export const WizardProvider = WizardCtx.Provider

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardCtx)
  if (!ctx) throw new Error('useWizard must be used inside WizardProvider')
  return ctx
}
