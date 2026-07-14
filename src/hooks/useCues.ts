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

/**
 * Abut duration cues to the next cue's start when there is a following cue.
 * The last closed cue keeps its explicit end (does not stretch to media end).
 */
export function recomputeContinuousEnds(cues: Cue[]): Cue[] {
  const durationCues = cues
    .filter((c) => c.type === 'cue')
    .sort((a, b) => a.start - b.start)

  const endById = new Map<string, number>()
  for (let i = 0; i < durationCues.length; i++) {
    const cur = durationCues[i]!
    const next = durationCues[i + 1]
    if (next) {
      endById.set(cur.id, Math.max(next.start, cur.start))
    } else {
      const explicit = cur.end != null && Number.isFinite(cur.end) ? cur.end : cur.start
      endById.set(cur.id, Math.max(explicit, cur.start))
    }
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
  const [recordingId, setRecordingId] = useState<string | null>(null)

  const isRecording = recordingId !== null

  const replaceCues = useCallback((next: Cue[]) => {
    setCues(recomputeContinuousEnds(next))
    setRecordingId(null)
  }, [])

  /** Start a duration cue at playhead. If already recording, end the open cue first. */
  const startCue = useCallback((currentTime: number, thumbnail: string | null) => {
    const t = Math.max(0, currentTime)
    const id = newId()
    const cue: Cue = {
      id,
      number: 0,
      type: 'cue',
      start: t,
      end: t,
      name: '',
      remark: '',
      thumbnail,
    }

    setCues((prev) => {
      let working = prev
      if (recordingId) {
        working = prev.map((c) =>
          c.id === recordingId ? { ...c, end: Math.max(c.start, t) } : c,
        )
      }
      return recomputeContinuousEnds([...working, cue])
    })
    setRecordingId(id)
    return { cue, beganRecording: true as const }
  }, [recordingId])

  /** Stop the open recording cue at playhead. */
  const stopCue = useCallback((currentTime: number) => {
    if (!recordingId) return null
    const t = Math.max(0, currentTime)
    const id = recordingId
    let stopped: Cue | null = null
    setCues((prev) => {
      const next = recomputeContinuousEnds(
        prev.map((c) => {
          if (c.id !== id) return c
          return { ...c, end: Math.max(c.start, t) }
        }),
      )
      stopped = next.find((c) => c.id === id) ?? null
      return next
    })
    setRecordingId(null)
    return stopped
  }, [recordingId])

  /** Live-stretch the open cue to the playhead while recording. */
  const tickRecording = useCallback(
    (currentTime: number) => {
      if (!recordingId) return
      const t = Math.max(0, currentTime)
      setCues((prev) => {
        const cur = prev.find((c) => c.id === recordingId)
        if (!cur || Math.abs((cur.end ?? cur.start) - t) < 0.05) return prev
        return prev.map((c) =>
          c.id === recordingId ? { ...c, end: Math.max(c.start, t) } : c,
        )
      })
    },
    [recordingId],
  )

  const cancelRecording = useCallback(() => {
    if (!recordingId) return
    setCues((prev) => recomputeContinuousEnds(prev.filter((c) => c.id !== recordingId)))
    setRecordingId(null)
  }, [recordingId])

  const addBullet = useCallback((currentTime: number, thumbnail: string | null) => {
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
      const next = recomputeContinuousEnds([...prev, cue])
      created = next.find((c) => c.id === cue.id)!
      return next
    })
    return created
  }, [])

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
          if (typeof next.end === 'number') {
            next.end = Math.max(next.start, next.end)
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
                c.id === following.id ? { ...c, start: newStart } : c,
              )
            }
          }
        }

        return recomputeContinuousEnds(mapped)
      })
    },
    [],
  )

  const setCueTimes = useCallback((id: string, times: { start: number; end?: number | null }) => {
    setCues((prev) => {
      const mapped = prev.map((c) => {
        if (c.id !== id) return c
        if (c.type === 'bullet') {
          return { ...c, start: Math.max(0, times.start), end: null }
        }
        const start = Math.max(0, times.start)
        const end =
          times.end != null ? Math.max(start, times.end) : Math.max(start, c.end ?? start)
        return { ...c, start, end }
      })
      return recomputeContinuousEnds(mapped)
    })
  }, [])

  const deleteCue = useCallback(
    (id: string) => {
      if (recordingId === id) setRecordingId(null)
      setCues((prev) => recomputeContinuousEnds(prev.filter((c) => c.id !== id)))
    },
    [recordingId],
  )

  const sorted = useMemo(() => [...cues].sort((a, b) => a.start - b.start), [cues])
  const recordingStart = useMemo(() => {
    if (!recordingId) return null
    return cues.find((c) => c.id === recordingId)?.start ?? null
  }, [cues, recordingId])

  return {
    cues: sorted,
    recordingId,
    recordingStart,
    isRecording,
    replaceCues,
    startCue,
    stopCue,
    tickRecording,
    cancelRecording,
    addBullet,
    updateCue,
    setCueTimes,
    deleteCue,
  }
}

export type { CueType }
