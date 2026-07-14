import { useCallback, useMemo, useState } from 'react'
import type { Cue, CueType } from '../types'

function newId(): string {
  return crypto.randomUUID()
}

function renumber(cues: Cue[]): Cue[] {
  return [...cues]
    .sort((a, b) => a.start - b.start || a.number - b.number)
    .map((c, i) => ({ ...c, number: i + 1 }))
}

/** Abut duration cues: each ends where the next duration cue starts (or at media end). */
export function recomputeContinuousEnds(cues: Cue[], mediaDuration: number): Cue[] {
  const durationCues = cues
    .filter((c) => c.type === 'cue')
    .sort((a, b) => a.start - b.start)

  const endById = new Map<string, number>()
  for (let i = 0; i < durationCues.length; i++) {
    const cur = durationCues[i]!
    const next = durationCues[i + 1]
    const end = next ? Math.max(next.start, cur.start) : Math.max(mediaDuration || cur.start, cur.start)
    endById.set(cur.id, end)
  }

  return renumber(
    cues.map((c) => {
      if (c.type !== 'cue') return c
      const end = endById.get(c.id)
      return end == null ? c : { ...c, end }
    }),
  )
}

export function useCues(initial: Cue[] = []) {
  const [cues, setCues] = useState<Cue[]>(initial)
  const [mediaDuration, setMediaDuration] = useState(0)

  const replaceCues = useCallback((next: Cue[], duration = mediaDuration) => {
    setCues(recomputeContinuousEnds(next, duration))
  }, [mediaDuration])

  const syncMediaDuration = useCallback((duration: number) => {
    setMediaDuration(duration)
    setCues((prev) => recomputeContinuousEnds(prev, duration))
  }, [])

  /** One-press continuous duration cue at playhead. */
  const addContinuousCue = useCallback(
    (currentTime: number, thumbnail: string | null) => {
      const t = Math.max(0, currentTime)
      const cue: Cue = {
        id: newId(),
        number: 0,
        type: 'cue',
        start: t,
        end: t,
        name: '',
        remark: '',
        thumbnail,
      }
      let created!: Cue
      setCues((prev) => {
        // Avoid duplicate starts within 40ms
        const clash = prev.some((c) => c.type === 'cue' && Math.abs(c.start - t) < 0.04)
        const nextList = clash ? prev : [...prev, cue]
        const next = recomputeContinuousEnds(nextList, mediaDuration)
        created = next.find((c) => c.id === cue.id) ?? next.find((c) => Math.abs(c.start - t) < 0.04)!
        return next
      })
      return created
    },
    [mediaDuration],
  )

  const addBullet = useCallback(
    (currentTime: number, thumbnail: string | null) => {
      const cue: Cue = {
        id: newId(),
        number: 0,
        type: 'bullet',
        start: Math.max(0, currentTime),
        end: null,
        name: '',
        remark: '',
        thumbnail,
      }
      let created!: Cue
      setCues((prev) => {
        const next = recomputeContinuousEnds([...prev, cue], mediaDuration)
        created = next.find((c) => c.id === cue.id)!
        return next
      })
      return created
    },
    [mediaDuration],
  )

  const updateCue = useCallback(
    (id: string, patch: Partial<Pick<Cue, 'name' | 'remark' | 'start' | 'end'>>) => {
      setCues((prev) => {
        let mapped = prev.map((c) => {
          if (c.id !== id) return c
          const next = { ...c, ...patch }
          if (next.type === 'bullet') {
            next.end = null
          }
          if (typeof next.start === 'number') {
            next.start = Math.max(0, next.start)
          }
          return next
        })

        // Continuous model: editing end moves the next duration cue's start
        if (typeof patch.end === 'number') {
          const edited = mapped.find((c) => c.id === id)
          if (edited?.type === 'cue') {
            const durationCues = mapped
              .filter((c) => c.type === 'cue')
              .sort((a, b) => a.start - b.start)
            const idx = durationCues.findIndex((c) => c.id === id)
            const following = durationCues[idx + 1]
            if (following) {
              const newStart = Math.max(edited.start + 0.05, patch.end)
              mapped = mapped.map((c) =>
                c.id === following.id ? { ...c, start: Math.min(newStart, mediaDuration || newStart) } : c,
              )
            }
          }
        }

        return recomputeContinuousEnds(mapped, mediaDuration)
      })
    },
    [mediaDuration],
  )

  const setCueTimes = useCallback(
    (id: string, times: { start: number; end?: number | null }) => {
      setCues((prev) => {
        const mapped = prev.map((c) => {
          if (c.id !== id) return c
          if (c.type === 'bullet') {
            return { ...c, start: Math.max(0, times.start), end: null }
          }
          return {
            ...c,
            start: Math.max(0, times.start),
            end: times.end != null ? Math.max(times.start, times.end) : c.end,
          }
        })
        return recomputeContinuousEnds(mapped, mediaDuration)
      })
    },
    [mediaDuration],
  )

  const deleteCue = useCallback(
    (id: string) => {
      setCues((prev) => recomputeContinuousEnds(prev.filter((c) => c.id !== id), mediaDuration))
    },
    [mediaDuration],
  )

  const sorted = useMemo(() => [...cues].sort((a, b) => a.start - b.start), [cues])

  return {
    cues: sorted,
    replaceCues,
    syncMediaDuration,
    addContinuousCue,
    addBullet,
    updateCue,
    setCueTimes,
    deleteCue,
  }
}

export type { CueType }
