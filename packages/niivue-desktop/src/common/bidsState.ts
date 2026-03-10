import type { BidsWizardState } from './bidsTypes.js'

const BIDS_KEY = 'bids'

interface CustomDataEnvelope {
  [key: string]: unknown
}

/**
 * Serialize BIDS wizard state into an NVDocument.customData string.
 * Uses a namespaced envelope so other features can coexist in customData.
 */
export function serializeBidsState(customData: string, state: BidsWizardState): string {
  let envelope: CustomDataEnvelope = {}
  if (customData) {
    try {
      envelope = JSON.parse(customData) as CustomDataEnvelope
    } catch {
      // If existing customData isn't valid JSON, start fresh
      envelope = {}
    }
  }
  envelope[BIDS_KEY] = state
  return JSON.stringify(envelope)
}

/**
 * Deserialize BIDS wizard state from an NVDocument.customData string.
 * Returns null if no saved BIDS state exists or data is invalid.
 */
export function deserializeBidsState(customData: string): BidsWizardState | null {
  if (!customData) return null
  try {
    const envelope = JSON.parse(customData) as CustomDataEnvelope
    const saved = envelope[BIDS_KEY]
    if (!saved || typeof saved !== 'object') return null
    const state = saved as BidsWizardState
    // Basic structural validation
    if (!Array.isArray(state.mappings) || typeof state.step !== 'number') return null
    return state
  } catch {
    return null
  }
}
