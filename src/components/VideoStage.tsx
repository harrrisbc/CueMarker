import type { RefObject } from 'react'
import { formatTime } from '../lib/time'
import './VideoStage.css'

interface VideoStageProps {
  kind: 'none' | 'mp4' | 'youtube'
  mp4Url: string | null
  videoRef: RefObject<HTMLVideoElement | null>
  ytContainerRef: RefObject<HTMLDivElement | null>
  currentTime: number
  duration: number
  playing: boolean
  onTogglePlay: () => void
  onSeekRelative: (delta: number) => void
}

export function VideoStage({
  kind,
  mp4Url,
  videoRef,
  ytContainerRef,
  currentTime,
  duration,
  playing,
  onTogglePlay,
  onSeekRelative,
}: VideoStageProps) {
  return (
    <section className="video-stage">
      <div className="video-frame">
        {kind === 'none' && (
          <div className="video-empty">
            <p className="video-empty-title">Import a rehearsal clip</p>
            <p className="video-empty-copy">
              Load an MP4 for full waveform + frame grabs, or paste a YouTube URL to mark cues over
              the rehearsal.
            </p>
          </div>
        )}
        {kind === 'mp4' && (
          <video
            ref={videoRef}
            className="video-el"
            src={mp4Url ?? undefined}
            playsInline
            preload="auto"
          />
        )}
        {kind === 'youtube' && (
          <div className="yt-wrap">
            <div ref={ytContainerRef} className="yt-host" />
          </div>
        )}
      </div>

      <div className="transport">
        <button type="button" className="transport-btn" onClick={() => onSeekRelative(-5)} disabled={kind === 'none'}>
          −5s
        </button>
        <button
          type="button"
          className="transport-btn transport-play"
          onClick={onTogglePlay}
          disabled={kind === 'none'}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="transport-btn" onClick={() => onSeekRelative(5)} disabled={kind === 'none'}>
          +5s
        </button>
        <span className="transport-time" aria-live="polite">
          {formatTime(currentTime, duration >= 3600)} / {formatTime(duration, duration >= 3600)}
        </span>
      </div>
    </section>
  )
}
