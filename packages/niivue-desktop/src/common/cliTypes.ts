/**
 * CLI Options interface for headless subcommand architecture
 */
export interface CLIOptions {
  /** The subcommand to execute */
  subcommand: 'view' | 'segment' | 'extract' | 'dcm2niix' | 'niimath' | 'python' | null
  /** Second-level subcommand (for dcm2niix: 'list' | 'convert') */
  subcommandMode?: string
  /** Input file path, URL, standard name, or '-' for stdin */
  input: string | null
  /** Output file path or '-' for stdout */
  output: string | null
  /** Segmentation model name */
  model: string | null
  /** niimath operations string */
  ops: string | null
  /** dcm2niix series selection */
  series: string | null
  /** dcm2niix compress option */
  compress: 'y' | 'n'
  /** dcm2niix BIDS sidecar option */
  bids: 'y' | 'n'
  /** Label volume path for extract command */
  labels: string | null
  /** Comma-separated label values for extract command */
  values: string | null
  /** Label ranges for extract command (can have multiple) */
  range: string[]
  /** Invert label selection for extract command */
  invert: boolean
  /** Output as binary mask for extract command */
  binarize: boolean
  /** Path to label.json file for named label lookup */
  labelJson: string | null
  /** Comma-separated label names to extract (requires labelJson) */
  labelNames: string | null
  /** WebSocket server port (null = auto-select) */
  wsPort: number | null
  /** Disable WebSocket server */
  noWs: boolean
  /** Show help */
  help: boolean
}

/**
 * Resolved input information
 */
export interface ResolvedInput {
  /** Type of input source */
  type: 'standard' | 'local-file' | 'url' | 'stdin'
  /** Original path/URL provided */
  originalPath: string
  /** Base64-encoded file data */
  base64: string
  /** Filename for display purposes */
  filename: string
}

/**
 * Available segmentation models
 */
export const AVAILABLE_MODELS = [
  'tissue-seg-light',
  'tissue-seg-full',
  'brain-extract-light',
  'brain-extract-full',
  'parcellation-50',
  'parcellation-104'
] as const

export type SegmentationModel = (typeof AVAILABLE_MODELS)[number]

/**
 * Available standard/bundled image names
 */
export const STANDARD_IMAGES = ['mni152', 'chris_t1'] as const

export type StandardImage = (typeof STANDARD_IMAGES)[number]

/**
 * Exit codes for headless operations
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGUMENTS: 2,
  INPUT_NOT_FOUND: 3,
  OUTPUT_WRITE_FAILED: 4,
  MODEL_NOT_FOUND: 5,
  DCM2NIIX_ERROR: 6,
  NIIMATH_ERROR: 7,
  STDIN_TIMEOUT: 8,
  URL_FETCH_ERROR: 9
} as const

/**
 * Default CLI options
 */
export function getDefaultCLIOptions(): CLIOptions {
  return {
    subcommand: null,
    subcommandMode: undefined,
    input: null,
    output: null,
    model: null,
    ops: null,
    series: null,
    compress: 'y',
    bids: 'y',
    labels: null,
    values: null,
    range: [],
    invert: false,
    binarize: false,
    labelJson: null,
    labelNames: null,
    wsPort: null,
    noWs: false,
    help: false
  }
}
