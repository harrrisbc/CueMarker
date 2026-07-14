import { useEffect, useRef, type RefObject } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/plugins/regions'
import type { Cue } from '../types'
import { formatTime } from '../lib/time'
import './WaveformTimeline.css'

interface WaveformTimelineProps {
  kind: 'none' | 'mp4' | 'youtube'
  mediaUrl: string | null
  videoRef: RefObject<HTMLVideoElement | null>
  duration: number
  currentTime: number
  cues: Cue[]
  pendingStart: number | null
  onSeek: (time: number) => void
}

export function WaveformTimeline({
  kind,
  mediaUrl,
  videoRef,
  duration,
  currentTime,
  cues,
  pendingStart,
  onSeek,
}: WaveformTimelineProps) {
  const waveRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const regionsRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null)
  const rulerRef = useRef<HTMLDivElement>(null)
  const onSeekRef = useRef(onSeek)
  onSeekRef.current = onSeek
  const cuesRef = useRef(cues)
  cuesRef.current = cues

  // MP4 waveform via wavesurfer synced to video element
  useEffect(() => {
    if (kind !== 'mp4' || !waveRef.current || !mediaUrl) return

    let destroyed = false
    let ws: WaveSurfer | null = null
    let onWheel: ((e: WheelEvent) => void) | null = null
    let zoomLevel = 50

    const applyRegions = () => {
      if (!regionsRef.current) return
      const regions = regionsRef.current
      regions.clearRegions()
      for (const cue of cuesRef.current) {
        if (cue.type === 'cue' && cue.end != null) {
          regions.addRegion({
            id: cue.id,
            start: cue.start,
            end: cue.end,
            color: 'rgba(232, 168, 56, 0.28)',
            drag: false,
            resize: false,
          })
        } else {
          const start = cue.start
          const end = start + 0.05
          regions.addRegion({
            id: cue.id,
            start,
            end,
            color: 'rgba(92, 196, 196, 0.75)',
            drag: false,
            resize: false,
          })
        }
      }
    }

    const init = () => {
      if (destroyed || !waveRef.current) return
      const media = videoRef.current
      const regions = RegionsPlugin.create()
      regionsRef.current = regions

      ws = WaveSurfer.create({
        container: waveRef.current,
        waveColor: 'rgba(180, 150, 100, 0.55)',
        progressColor: 'rgba(232, 168, 56, 0.85)',
        cursorColor: '#f0d9a8',
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 1,
        height: 96,
        normalize: true,
        minPxPerSec: zoomLevel,
        media: media ?? undefined,
        url: media ? undefined : mediaUrl,
        plugins: [regions],
      })
      wsRef.current = ws

      ws.on('interaction', (t: number) => {
        onSeekRef.current(t)
      })
      ws.on('ready', () => applyRegions())

      onWheel = (e: WheelEvent) => {
        if (!ws) return
        e.preventDefault()
        zoomLevel = Math.max(10, Math.min(400, zoomLevel + (e.deltaY > 0 ? -15 : 15)))
        ws.zoom(zoomLevel)
      }
      waveRef.current.addEventListener('wheel', onWheel, { passive: false })
    }

    const hostEl = waveRef.current
    const raf = requestAnimationFrame(init)

    return () => {
      destroyed = true
      cancelAnimationFrame(raf)
      if (hostEl && onWheel) hostEl.removeEventListener('wheel', onWheel)
      ws?.destroy()
      wsRef.current = null
      regionsRef.current = null
    }
  }, [kind, mediaUrl, videoRef])

  // Sync regions/markers when cues change
  useEffect(() => {
    if (kind !== 'mp4' || !regionsRef.current) return
    const regions = regionsRef.current
    regions.clearRegions()

    for (const cue of cues) {
      if (cue.type === 'cue' && cue.end != null) {
        regions.addRegion({
          id: cue.id,
          start: cue.start,
          end: cue.end,
          color: 'rgba(232, 168, 56, 0.28)',
          drag: false,
          resize: false,
        })
      } else {
        const start = cue.start
        const end = Math.min(duration || cue.start + 0.05, cue.start + 0.05)
        regions.addRegion({
          id: cue.id,
          start,
          end,
          color: 'rgba(92, 196, 196, 0.75)',
          drag: false,
          resize: false,
        })
      }
    }

    if (pendingStart != null) {
      regions.addRegion({
        id: '__pending__',
        start: Math.min(pendingStart, currentTime),
        end: Math.max(pendingStart + 0.02, currentTime),
        color: 'rgba(232, 168, 56, 0.18)',
        drag: false,
        resize: false,
      })
    }
  }, [cues, pendingStart, currentTime, duration, kind])

  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || kind === 'none') return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(ratio * duration)
  }

  if (kind === 'none') {
    return (
      <div className="timeline timeline-empty">
        <p>Timeline appears after you import a clip</p>
      </div>
    )
  }

  return (
    <div className="timeline">
      <div className="timeline-meta">
        <span>Waveform / timeline</span>
        <span className="timeline-hint">
          {kind === 'youtube'
            ? 'YouTube: scrub ruler (audio waveform needs local MP4)'
            : 'Click waveform to seek · scroll to zoom'}
        </span>
      </div>

      {kind === 'mp4' ? (
        <div className="wave-wrap">
          <div ref={waveRef} className="wave-host" />
        </div>
      ) : (
        <div
          ref={rulerRef}
          className="ruler"
          onClick={handleRulerClick}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          aria-label="Timeline"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 1))
            if (e.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 1))
          }}
        >
          <div className="ruler-track" />
          <div className="ruler-playhead" style={{ left: `${pct}%` }} />
          {cues.map((cue) => {
            if (!duration) return null
            if (cue.type === 'cue' && cue.end != null) {
              const left = (cue.start / duration) * 100
              const width = ((cue.end - cue.start) / duration) * 100
              return (
                <div
                  key={cue.id}
                  className="ruler-region"
                  style={{ left: `${left}%`, width: `${Math.max(width, 0.3)}%` }}
                  title={`#${cue.number} ${formatTime(cue.start)}–${formatTime(cue.end)}`}
                />
              )
            }
            const left = (cue.start / duration) * 100
            return (
              <div
                key={cue.id}
                className="ruler-bullet"
                style={{ left: `${left}%` }}
                title={`#${cue.number} bullet @ ${formatTime(cue.start)}`}
              />
            )
          })}
          {pendingStart != null && duration > 0 && (
            <div
              className="ruler-region is-pending"
              style={{
                left: `${(Math.min(pendingStart, currentTime) / duration) * 100}%`,
                width: `${(Math.abs(currentTime - pendingStart) / duration) * 100}%`,
              }}
            />
          )}
          <div className="ruler-ticks">
            <span>{formatTime(0)}</span>
            <span>{formatTime(duration / 2)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
