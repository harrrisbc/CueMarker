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

export function useCues(initial: Cue[] = []) {
  const [cues, setCues] = useState<Cue[]>(initial)
  const [pendingStart, setPendingStart] = useState<number | null>(null)

  const isRecording = pendingStart !== null

  const replaceCues = useCallback((next: Cue[]) => {
    setCues(renumber(next))
    setPendingStart(null)
  }, [])

  const startOrFinishCue = useCallback(
    (currentTime: number, thumbnail: string | null) => {
      if (pendingStart === null) {
        setPendingStart(currentTime)
        return { action: 'started' as const }
      }

      const start = Math.min(pendingStart, currentTime)
      const end = Math.max(pendingStart, currentTime)
      const cue: Cue = {
        id: newId(),
        number: 0,
        type: 'cue',
        start,
        end,
        name: '',
        remark: '',
        thumbnail,
      }
      setCues((prev) => renumber([...prev, cue]))
      setPendingStart(null)
      const created = renumber([...cues, cue]).find((c) => c.id === cue.id)!
      return { action: 'finished' as const, cue: created }
    },
    [pendingStart, cues],
  )

  const addBullet = useCallback(
    (currentTime: number, thumbnail: string | null) => {
      const cue: Cue = {
        id: newId(),
        number: 0,
        type: 'bullet',
        start: currentTime,
        end: null,
        name: '',
        remark: '',
        thumbnail,
      }
      setCues((prev) => renumber([...prev, cue]))
      return renumber([...cues, cue]).find((c) => c.id === cue.id)!
    },
    [cues],
  )

  const cancelPending = useCallback(() => {
    setPendingStart(null)
  }, [])

  const updateCue = useCallback((id: string, patch: Partial<Pick<Cue, 'name' | 'remark'>>) => {
    setCues((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }, [])

  const deleteCue = useCallback((id: string) => {
    setCues((prev) => renumber(prev.filter((c) => c.id !== id)))
  }, [])

  const sorted = useMemo(() => [...cues].sort((a, b) => a.start - b.start), [cues])

  return {
    cues: sorted,
    pendingStart,
    isRecording,
    replaceCues,
    startOrFinishCue,
    addBullet,
    cancelPending,
    updateCue,
    deleteCue,
  }
}

export type { CueType }
