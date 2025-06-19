/**
 * NIIvue UIKit Demo Package
 * 
 * This package provides a medical imaging demo that showcases the UIKit components
 * integrated with NIIvue for medical visualization.
 */

export interface MedicalParams {
  brightness: number
  contrast: number
  zoom: number
  opacity: number
  slice: number
  crosshair: boolean
  colorbar: boolean
  radiological: boolean
  interpolation: boolean
  colormap: string
  viewMode: string
}

export interface UIKitComponentsInstance {
  brightnessSlider: any | null
  contrastSlider: any | null
  zoomSlider: any | null
  opacitySlider: any | null
  sliceSlider: any | null
  crosshairToggle: any | null
  colorbarToggle: any | null
  radiologicalToggle: any | null
  interpolationToggle: any | null
  colormapSelector: any | null
  viewModeSelector: any | null
  screenshotButton: any | null
  backgroundButton: any | null
  logsButton: any | null
  resetButton: any | null
}

/**
 * Initialize the medical imaging demo
 * This function should be called when the DOM is ready
 */
export async function initMedicalDemo(): Promise<void> {
  // The main initialization will be handled by the HTML file
  // This is just a placeholder for the TypeScript interface
  console.log('Medical imaging demo initialization placeholder')
}

/**
 * Default medical parameters
 */
export const DEFAULT_MEDICAL_PARAMS: MedicalParams = {
  brightness: 0.5,
  contrast: 0.5,
  zoom: 1.0,
  opacity: 1.0,
  slice: 0.5,
  crosshair: true,
  colorbar: true,
  radiological: false,
  interpolation: true,
  colormap: 'gray',
  viewMode: 'MultiPlanar'
}

/**
 * Version information
 */
export const NIIVUE_UIKIT_VERSION = '0.1.0' 