import { useRef } from 'react'
import { formatTime } from '../lib/time'
import './Toolbar.css'

interface ToolbarProps {
  projectName: string
  onProjectNameChange: (name: string) => void
  onImportMp4: (file: File) => void
  onImportYouTube: (url: string) => void
  onMarkCue: () => void
  onStopCue: () => void
  onBullet: () => void
  onExportCsv: () => void
  onExportPdf: () => void
  onSaveJson: () => void
  onLoadJson: (file: File) => void
  isRecording: boolean
  recordingStart: number | null
  hasMedia: boolean
  cueCount: number
}

export function Toolbar({
  projectName,
  onProjectNameChange,
  onImportMp4,
  onImportYouTube,
  onMarkCue,
  onStopCue,
  onBullet,
  onExportCsv,
  onExportPdf,
  onSaveJson,
  onLoadJson,
  isRecording,
  recordingStart,
  hasMedia,
  cueCount,
}: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const jsonRef = useRef<HTMLInputElement>(null)
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
        <input
          ref={jsonRef}
          type="file"
          accept="application/json,.json,.cuemarker.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onLoadJson(f)
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
          title="Start duration cue (M)"
        >
          {isRecording ? `Recording… ${formatTime(recordingStart ?? 0)}` : 'Mark Cue · M'}
        </button>
        <button
          type="button"
          className="btn btn-stop"
          onClick={onStopCue}
          disabled={!hasMedia || !isRecording}
          title="Stop recording cue (N)"
        >
          Stop Cue · N
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
            Recording — press N to stop
          </span>
        )}
      </div>

      <div className="toolbar-export">
        <button type="button" className="btn btn-ghost" onClick={onSaveJson}>
          Save JSON
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => jsonRef.current?.click()}>
          Load JSON
        </button>
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
