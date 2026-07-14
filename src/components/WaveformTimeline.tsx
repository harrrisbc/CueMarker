import { useCallback, useEffect, useRef, useState } from 'react'
import type { Cue } from '../types'
import { drawPeaksOnCanvas } from '../lib/peaks'
import { formatTime } from '../lib/time'
import './WaveformTimeline.css'

interface WaveformTimelineProps {
  kind: 'none' | 'mp4' | 'youtube'
  duration: number
  currentTime: number
  cues: Cue[]
  peaks: number[] | null
  peaksStatus: 'idle' | 'building' | 'ready' | 'fallback'
  onSeek: (time: number) => void
  onCueTimesChange: (id: string, times: { start: number; end?: number | null }) => void
}

type DragState = {
  cueId: string
  type: Cue['type']
  grabOffsetSec: number
} | null

export function WaveformTimeline({
  kind,
  duration,
  currentTime,
  cues,
  peaks,
  peaksStatus,
  onSeek,
  onCueTimesChange,
}: WaveformTimelineProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pxPerSec, setPxPerSec] = useState(40)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(640)
  const dragRef = useRef<DragState>(null)
  const suppressClickRef = useRef(false)
  const onTimesRef = useRef(onCueTimesChange)
  onTimesRef.current = onCueTimesChange
  const cuesRef = useRef(cues)
  cuesRef.current = cues

  useEffect(() => {
    if (!duration || duration <= 0) return
    const w = viewportRef.current?.clientWidth || 640
    setViewportWidth(w)
    setPxPerSec(Math.max(0.05, w / duration))
    setScrollLeft(0)
  }, [duration, kind])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewportWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [kind])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !peaks || !duration) return
    drawPeaksOnCanvas(canvas, peaks, viewportWidth, 96, scrollLeft, pxPerSec, duration)
  }, [peaks, duration, scrollLeft, pxPerSec, viewportWidth])

  const clientXToTime = useCallback(
    (clientX: number) => {
      const el = viewportRef.current
      if (!el || !duration) return 0
      const rect = el.getBoundingClientRect()
      const x = clientX - rect.left + scrollLeft
      return Math.max(0, Math.min(duration, x / pxPerSec))
    },
    [duration, pxPerSec, scrollLeft],
  )

  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (!duration) return
      e.preventDefault()
      const el = viewportRef.current
      if (!el) return

      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const timeAtCursor = (scrollLeft + mouseX) / pxPerSec
        const factor = e.deltaY > 0 ? 0.9 : 1.1
        const minZoom = Math.max(0.05, viewportWidth / duration)
        const next = Math.min(400, Math.max(minZoom, pxPerSec * factor))
        const nextScroll = Math.max(0, timeAtCursor * next - mouseX)
        setPxPerSec(next)
        setScrollLeft(Math.min(nextScroll, Math.max(0, duration * next - viewportWidth)))
        return
      }

      const dx = e.deltaX !== 0 ? e.deltaX : e.deltaY
      setScrollLeft((s) => {
        const max = Math.max(0, duration * pxPerSec - viewportWidth)
        return Math.max(0, Math.min(max, s + dx))
      })
    },
    [duration, pxPerSec, scrollLeft, viewportWidth],
  )

  useEffect(() => {
    const el = viewportRef.current
    if (!el || kind === 'none') return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel, kind])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || !duration) return
      suppressClickRef.current = true
      const t = clientXToTime(e.clientX)
      const start = Math.max(0, Math.min(duration, t - drag.grabOffsetSec))
      if (drag.type === 'bullet') {
        onTimesRef.current(drag.cueId, { start, end: null })
      } else {
        onTimesRef.current(drag.cueId, { start })
      }
    }
    const onUp = () => {
      dragRef.current = null
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [clientXToTime, duration])

  const handleClick = (e: React.MouseEvent) => {
    if (suppressClickRef.current) return
    if ((e.target as HTMLElement).closest('[data-marker]')) return
    onSeek(clientXToTime(e.clientX))
  }

  if (kind === 'none') {
    return (
      <div className="timeline timeline-empty">
        <p>Timeline appears after you import a clip</p>
      </div>
    )
  }

  const playheadLeft = currentTime * pxPerSec - scrollLeft
  const hint =
    peaksStatus === 'building'
      ? 'Building waveform…'
      : peaksStatus === 'fallback'
        ? 'Overview timeline (waveform skipped for long clip) · scroll=pan · pinch/ctrl+scroll=zoom'
        : 'Scroll to pan · pinch / ctrl+scroll to zoom · drag markers to adjust'

  return (
    <div className="timeline">
      <div className="timeline-meta">
        <span>Waveform / timeline</span>
        <span className="timeline-hint">{hint}</span>
      </div>

      <div
        ref={viewportRef}
        className="timeline-viewport"
        onClick={handleClick}
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
        {peaks ? <canvas ref={canvasRef} className="timeline-canvas" /> : <div className="timeline-fallback-band" />}

        <div className="timeline-markers" style={{ width: Math.max(viewportWidth, duration * pxPerSec), transform: `translateX(${-scrollLeft}px)` }}>
          {cues.map((cue) => {
            if (cue.type === 'bullet') {
              const left = cue.start * pxPerSec
              return (
                <div
                  key={cue.id}
                  data-marker
                  className="marker-bullet"
                  style={{ left }}
                  title={`#${cue.number} @ ${formatTime(cue.start)}`}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    dragRef.current = {
                      cueId: cue.id,
                      type: 'bullet',
                      grabOffsetSec: clientXToTime(e.clientX) - cue.start,
                    }
                  }}
                />
              )
            }
            const end = cue.end ?? cue.start + 0.1
            const left = cue.start * pxPerSec
            const width = Math.max(4, (end - cue.start) * pxPerSec)
            return (
              <div
                key={cue.id}
                data-marker
                className="marker-region"
                style={{ left, width }}
                title={`#${cue.number} ${formatTime(cue.start)}–${formatTime(end)} · drag to adjust`}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  dragRef.current = {
                    cueId: cue.id,
                    type: 'cue',
                    grabOffsetSec: clientXToTime(e.clientX) - cue.start,
                  }
                }}
              >
                <span className="marker-label">#{cue.number}</span>
              </div>
            )
          })}
        </div>

        <div
          className="timeline-playhead"
          style={{ left: Math.max(-2, Math.min(viewportWidth, playheadLeft)) }}
        />

        <div className="timeline-ticks">
          <span>{formatTime(scrollLeft / pxPerSec, duration >= 3600)}</span>
          <span>
            {formatTime(
              Math.min(duration, (scrollLeft + viewportWidth / 2) / pxPerSec),
              duration >= 3600,
            )}
          </span>
          <span>
            {formatTime(
              Math.min(duration, (scrollLeft + viewportWidth) / pxPerSec),
              duration >= 3600,
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
