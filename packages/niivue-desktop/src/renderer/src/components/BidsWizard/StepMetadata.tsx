import { useMemo, useState } from 'react'
import { Button, Text } from '@radix-ui/themes'
import { marked } from 'marked'
import type { BidsDatasetConfig } from '../../../../common/bidsTypes.js'

const electron = window.electron

interface StepMetadataProps {
  config: BidsDatasetConfig
  onUpdateConfig: <K extends keyof BidsDatasetConfig>(key: K, value: BidsDatasetConfig[K]) => void
}

export function StepMetadata({ config, onUpdateConfig }: StepMetadataProps): JSX.Element {
  const [readmeTab, setReadmeTab] = useState<'edit' | 'preview'>('edit')

  const handleSelectOutputDir = async (): Promise<void> => {
    const dir = await electron.bidsSelectOutputDir()
    if (dir) {
      onUpdateConfig('outputDir', dir)
    }
  }

  const defaultReadme = `# ${config.name || 'My Dataset'}

This dataset was converted to BIDS format using NiiVue Desktop.

## Description

*Describe your dataset here...*
`

  const readmeContent = config.readme || ''
  const displayContent = readmeContent || defaultReadme

  const renderedHtml = useMemo(() => {
    return marked.parse(displayContent, { async: false }) as string
  }, [displayContent])

  return (
    <div className="flex flex-col gap-3">
      <style>{`
        .markdown-preview h1 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0 0.3em; }
        .markdown-preview h2 { font-size: 1.25em; font-weight: 600; margin: 0.5em 0 0.3em; }
        .markdown-preview h3 { font-size: 1.1em; font-weight: 600; margin: 0.4em 0 0.2em; }
        .markdown-preview p { margin: 0.4em 0; }
        .markdown-preview ul, .markdown-preview ol { margin: 0.3em 0; padding-left: 1.5em; }
        .markdown-preview li { margin: 0.15em 0; }
        .markdown-preview code { background: #f3f4f6; padding: 0.1em 0.3em; border-radius: 3px; font-size: 0.9em; }
        .markdown-preview pre { background: #f3f4f6; padding: 0.6em; border-radius: 4px; overflow-x: auto; margin: 0.4em 0; }
        .markdown-preview pre code { background: none; padding: 0; }
        .markdown-preview blockquote { border-left: 3px solid #d1d5db; padding-left: 0.8em; margin: 0.4em 0; color: #6b7280; }
        .markdown-preview a { color: #2563eb; text-decoration: underline; }
        .markdown-preview em { font-style: italic; }
        .markdown-preview strong { font-weight: 700; }
        .markdown-preview hr { border: none; border-top: 1px solid #e5e7eb; margin: 0.6em 0; }
      `}</style>
      <Text size="2" weight="bold">Dataset Metadata</Text>
      <Text size="1" color="gray">
        Configure the dataset_description.json fields and output location.
      </Text>

      <label className="flex flex-col gap-1">
        <Text size="1" weight="medium">
          Dataset Name <span className="text-[var(--red-9)]">*</span>
        </Text>
        <input
          type="text"
          value={config.name}
          onChange={(e) => onUpdateConfig('name', e.target.value)}
          placeholder="My BIDS Dataset"
          className="px-3 py-2 text-sm border border-[var(--gray-6)] rounded"
        />
      </label>

      <label className="flex flex-col gap-1">
        <Text size="1" weight="medium">BIDS Version</Text>
        <input
          type="text"
          value={config.bidsVersion}
          onChange={(e) => onUpdateConfig('bidsVersion', e.target.value)}
          className="px-3 py-2 text-sm border border-[var(--gray-6)] rounded w-32"
        />
      </label>

      <label className="flex flex-col gap-1">
        <Text size="1" weight="medium">License</Text>
        <input
          type="text"
          value={config.license}
          onChange={(e) => onUpdateConfig('license', e.target.value)}
          placeholder="CC0"
          className="px-3 py-2 text-sm border border-[var(--gray-6)] rounded w-48"
        />
      </label>

      <label className="flex flex-col gap-1">
        <Text size="1" weight="medium">Authors (comma-separated)</Text>
        <input
          type="text"
          value={config.authors.join(', ')}
          onChange={(e) =>
            onUpdateConfig(
              'authors',
              e.target.value
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean)
            )
          }
          placeholder="Author One, Author Two"
          className="px-3 py-2 text-sm border border-[var(--gray-6)] rounded"
        />
      </label>

      {/* README.md editor with preview */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Text size="1" weight="medium">README.md</Text>
          <div className="flex border border-[var(--gray-6)] rounded overflow-hidden">
            <button
              className={`px-3 py-0.5 text-xs ${readmeTab === 'edit' ? 'bg-[var(--accent-9)] text-white' : 'bg-[var(--color-background)] text-[var(--gray-10)] hover:bg-[var(--gray-3)]'}`}
              onClick={() => setReadmeTab('edit')}
            >
              Edit
            </button>
            <button
              className={`px-3 py-0.5 text-xs ${readmeTab === 'preview' ? 'bg-[var(--accent-9)] text-white' : 'bg-[var(--color-background)] text-[var(--gray-10)] hover:bg-[var(--gray-3)]'}`}
              onClick={() => setReadmeTab('preview')}
            >
              Preview
            </button>
          </div>
        </div>

        {readmeTab === 'edit' ? (
          <textarea
            value={readmeContent}
            onChange={(e) => onUpdateConfig('readme', e.target.value)}
            placeholder={defaultReadme}
            rows={6}
            className="px-3 py-2 text-sm border border-[var(--gray-6)] rounded font-mono resize-y"
          />
        ) : (
          <div
            className="px-3 py-2 text-sm border border-[var(--gray-6)] rounded bg-[var(--color-background)] min-h-[144px] max-h-[300px] overflow-y-auto markdown-preview"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
        <Text size="1" color="gray">
          Supports Markdown formatting. A detailed README avoids validator warnings.
        </Text>
      </div>

      <div className="flex flex-col gap-1">
        <Text size="1" weight="medium">
          Output Directory <span className="text-[var(--red-9)]">*</span>
        </Text>
        <div className="flex gap-2">
          <Button variant="soft" size="2" onClick={handleSelectOutputDir}>
            Browse...
          </Button>
          <input
            type="text"
            value={config.outputDir}
            onChange={(e) => onUpdateConfig('outputDir', e.target.value)}
            placeholder="Select output directory"
            className="flex-1 px-3 py-2 text-sm border border-[var(--gray-6)] rounded"
          />
        </div>
      </div>
    </div>
  )
}
