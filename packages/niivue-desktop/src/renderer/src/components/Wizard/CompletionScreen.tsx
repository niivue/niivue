import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Heading, Text, Badge, Callout } from '@radix-ui/themes'
import { CheckCircledIcon, CheckIcon } from '@radix-ui/react-icons'
import { Niivue, NVImage, SLICE_TYPE } from '@niivue/niivue'
import type { BidsSeriesMapping } from '../../../../common/bidsTypes.js'
import { generateBidsPath } from '../BidsWizard/bidsTreeUtil.js'

const electron = window.electron

interface WrittenFile {
  key: string
  label: string
  tag?: string
  bidsPath: string
  sourcePath: string
}

function buildWrittenFileList(
  mappings: BidsSeriesMapping[],
  bidsDir: string,
  originalPaths: Record<number, string> = {}
): WrittenFile[] {
  const included = mappings.filter((m) => !m.excluded)
  const files: WrittenFile[] = []

  for (const m of included) {
    const bidsRelPath = generateBidsPath(m)
    const ext = m.niftiPath.endsWith('.nii.gz') ? '.nii.gz' : '.nii'
    const bidsPath = bidsDir ? `${bidsDir}/${bidsRelPath}${ext}` : m.niftiPath
    const origPath = originalPaths[m.index]

    if (origPath) {
      const strippedPath = origPath.replace(/\.nii(\.gz)?$/, '_brain.nii.gz')
      files.push({
        key: `${m.index}-stripped`,
        label: `${bidsRelPath}${ext}`,
        tag: 'skull stripped',
        bidsPath,
        sourcePath: strippedPath
      })
      files.push({
        key: `${m.index}-original`,
        label: `${bidsRelPath}${ext}`,
        tag: 'original',
        bidsPath,
        sourcePath: origPath
      })
    } else {
      files.push({
        key: `${m.index}`,
        label: `${bidsRelPath}${ext}`,
        bidsPath,
        sourcePath: m.niftiPath
      })
    }
  }

  return files
}

async function renderPreviewImage(niftiPath: string): Promise<string | null> {
  const canvas = document.createElement('canvas')
  canvas.width = 120
  canvas.height = 120
  canvas.style.position = 'absolute'
  canvas.style.left = '-9999px'
  document.body.appendChild(canvas)

  const nv = new Niivue({
    isResizeCanvas: false,
    show3Dcrosshair: false,
    backColor: [0, 0, 0, 1],
    crosshairWidth: 0
  })

  try {
    await nv.attachToCanvas(canvas)
    const base64: string = await electron.ipcRenderer.invoke('loadFromFile', niftiPath)
    if (!base64) return null
    const vol = await NVImage.loadFromBase64({ base64, name: niftiPath })
    nv.addVolume(vol)
    nv.setSliceType(SLICE_TYPE.RENDER)
    nv.updateGLVolume()
    nv.drawScene()
    return canvas.toDataURL('image/png')
  } catch {
    return null
  } finally {
    nv.volumes = []
    const ext = nv.gl?.getExtension('WEBGL_lose_context')
    if (ext) ext.loseContext()
    document.body.removeChild(canvas)
  }
}

function useSeriesPreviews(paths: string[]): Map<string, string> {
  const [images, setImages] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      for (const path of paths) {
        if (cancelled) break
        const url = await renderPreviewImage(path)
        if (cancelled) break
        if (url) {
          setImages((prev) => new Map(prev).set(path, url))
        }
      }
    })()
    return () => { cancelled = true }
  }, [paths.join('\n')])

  return images
}

interface CompletionScreenProps {
  context: Record<string, unknown>
  outputs: Record<string, unknown> | null
  onClose: () => void
  onLoadFile?: (niftiPath: string) => Promise<void>
  onEditWorkflow?: () => void
}

export function CompletionScreen({
  context,
  outputs,
  onClose,
  onLoadFile,
  onEditWorkflow
}: CompletionScreenProps): React.ReactElement {
  const mappings = (context.series_list as BidsSeriesMapping[]) || []
  const bidsDir = (outputs?.bids_dir as string) || ''
  const outDir = (outputs?.outDir as string) || ''
  const originalPaths = (context._originalPaths as Record<number, string>) || {}
  const plainVolumes = (outputs?.volumes as string[]) || []
  const isBidsWorkflow = mappings.length > 0

  const previewPaths = useMemo(() => {
    if (isBidsWorkflow) {
      return buildWrittenFileList(mappings, bidsDir, originalPaths).map((f) => f.sourcePath)
    }
    return plainVolumes
  }, [mappings, bidsDir, originalPaths, isBidsWorkflow, plainVolumes])
  const previewImages = useSeriesPreviews(previewPaths)

  const writtenFiles = useMemo(
    () => isBidsWorkflow ? buildWrittenFileList(mappings, bidsDir, originalPaths) : [],
    [mappings, bidsDir, originalPaths, isBidsWorkflow]
  )

  const [loadedKeys, setLoadedKeys] = useState<Set<string>>(new Set())
  const markLoaded = useCallback((keys: string[]) => {
    setLoadedKeys((prev) => {
      const next = new Set(prev)
      for (const k of keys) next.add(k)
      return next
    })
  }, [])

  const handleOpenBidsFile = useCallback(
    async (file: WrittenFile) => {
      let filePath: string
      if (file.tag === 'original') {
        filePath = file.sourcePath
      } else {
        const exists = await electron.ipcRenderer.invoke('file-exists', file.bidsPath).catch(() => false)
        filePath = exists ? file.bidsPath : file.sourcePath
      }
      if (onLoadFile) {
        await onLoadFile(filePath)
        markLoaded([file.key])
      }
    },
    [onLoadFile, markLoaded]
  )

  const handleLoadAll = useCallback(
    async () => {
      if (!onLoadFile) return
      const items: { key: string; path: string }[] = isBidsWorkflow
        ? writtenFiles.map((f) => ({ key: f.key, path: f.sourcePath }))
        : plainVolumes.map((vol, i) => ({ key: String(i), path: vol }))
      for (const item of items) {
        await onLoadFile(item.path)
        markLoaded([item.key])
      }
    },
    [onLoadFile, isBidsWorkflow, writtenFiles, plainVolumes, markLoaded]
  )

  const displayDir = bidsDir || outDir
  const fileList = isBidsWorkflow ? writtenFiles : plainVolumes.map((vol, i) => ({
    key: String(i),
    label: vol.split(/[\\/]/).pop() ?? vol,
    sourcePath: vol,
    bidsPath: vol
  }))

  return (
    <div className="flex flex-col gap-6">
      <Callout.Root color="green" size="2">
        <Callout.Icon>
          <CheckCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          Conversion completed successfully.
          {displayDir && (
            <Text size="1" className="text-neutral-9 block mt-1">{displayDir}</Text>
          )}
        </Callout.Text>
      </Callout.Root>

      {fileList.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Heading size="3" className="text-neutral-12">
              {isBidsWorkflow ? 'Open in viewer' : `${plainVolumes.length} NIfTI file${plainVolumes.length !== 1 ? 's' : ''} created`}
            </Heading>
            {onLoadFile && fileList.length > 1 && (
              <Button variant="soft" size="2" onClick={handleLoadAll}>
                Load All in Viewer
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {fileList.map((f) => {
              const file = f as WrittenFile
              return (
                <div
                  key={file.key}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg bg-neutral-2 hover:bg-neutral-3 transition-colors"
                >
                  {previewImages.has(file.sourcePath) ? (
                    <img
                      src={previewImages.get(file.sourcePath)}
                      width={56}
                      height={56}
                      className="rounded-md shrink-0"
                    />
                  ) : (
                    <div className="rounded-md bg-neutral-12 shrink-0 flex items-center justify-center" style={{ width: 56, height: 56 }}>
                      <div className="animate-spin w-3 h-3 border border-neutral-8 border-t-transparent rounded-full" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <Text size="2" className="truncate text-neutral-12">{file.label}</Text>
                    {file.tag && (
                      <Badge
                        size="1"
                        color={file.tag === 'skull stripped' ? 'blue' : 'gray'}
                        variant="soft"
                        className="mt-1 w-fit"
                      >
                        {file.tag}
                      </Badge>
                    )}
                  </div>
                  {onLoadFile && (
                    <Button
                      size="1"
                      variant={loadedKeys.has(file.key) ? 'outline' : 'soft'}
                      color={loadedKeys.has(file.key) ? 'green' : undefined}
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isBidsWorkflow) {
                          void handleOpenBidsFile(file)
                        } else if (onLoadFile) {
                          void (async () => {
                            await onLoadFile(file.sourcePath)
                            markLoaded([file.key])
                          })()
                        }
                      }}
                    >
                      {loadedKeys.has(file.key) ? (
                        <><CheckIcon /> Loaded</>
                      ) : (
                        isBidsWorkflow ? 'Open' : 'Load in Viewer'
                      )}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t border-neutral-5">
        {onEditWorkflow && (
          <Button variant="soft" size="2" onClick={onEditWorkflow}>
            Edit Workflow
          </Button>
        )}
        <Button variant="solid" size="2" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  )
}
