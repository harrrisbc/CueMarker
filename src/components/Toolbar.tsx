import { useRef } from 'react'
import { formatTime } from '../lib/time'
import './Toolbar.css'

interface ToolbarProps {
  projectName: string
  onProjectNameChange: (name: string) => void
  onImportMp4: (file: File) => void
  onImportYouTube: (url: string) => void
  onMarkCue: () => void
  onBullet: () => void
  onExportCsv: () => void
  onExportPdf: () => void
  isRecording: boolean
  pendingStart: number | null
  hasMedia: boolean
  cueCount: number
}

export function Toolbar({
  projectName,
  onProjectNameChange,
  onImportMp4,
  onImportYouTube,
  onMarkCue,
  onBullet,
  onExportCsv,
  onExportPdf,
  isRecording,
  pendingStart,
  hasMedia,
  cueCount,
}: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const ytRef = useRef<HTMLInputElement>(null)

  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <span className="brand-mark" aria-hidden />
        <div className="brand-text">
          <h1 className="brand-name">CueMarker</h1>
          <input
            className="project-name"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            aria-label="Project name"
            placeholder="Project name"
          />
        </div>
      </div>

      <div className="toolbar-import">
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImportMp4(f)
            e.target.value = ''
          }}
        />
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          Import MP4
        </button>
        <div className="yt-row">
          <input
            ref={ytRef}
            className="yt-input"
            type="url"
            placeholder="YouTube URL"
            aria-label="YouTube URL"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onImportYouTube((e.target as HTMLInputElement).value)
              }
            }}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (ytRef.current) onImportYouTube(ytRef.current.value)
            }}
          >
            Load
          </button>
        </div>
      </div>

      <div className="toolbar-mark">
        <button
          type="button"
          className={`btn btn-cue ${isRecording ? 'is-recording' : ''}`}
          onClick={onMarkCue}
          disabled={!hasMedia}
          title="Mark duration cue (M)"
        >
          {isRecording
            ? `End Cue · started ${formatTime(pendingStart ?? 0)}`
            : 'Mark Cue · M'}
        </button>
        <button
          type="button"
          className="btn btn-bullet"
          onClick={onBullet}
          disabled={!hasMedia || isRecording}
          title="Bullet flash marker (B)"
        >
          Bullet · B
        </button>
        {isRecording && (
          <span className="recording-pill" role="status">
            Recording cue…
          </span>
        )}
      </div>

      <div className="toolbar-export">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onExportCsv}
          disabled={cueCount === 0}
        >
          Export CSV
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onExportPdf}
          disabled={cueCount === 0}
        >
          Export PDF
        </button>
      </div>
    </header>
  )
}
