/** Format seconds as MM:SS or HH:MM:SS */
export function formatTime(seconds: number, withHours = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (withHours || h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Format with tenths for export */
export function formatTimePrecise(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const whole = Math.floor(s)
  const frac = Math.floor((s - whole) * 10)
  const body = `${String(m).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${frac}`
  if (h > 0) return `${String(h).padStart(2, '0')}:${body}`
  return body
}

/** Parse MM:SS, HH:MM:SS, MM:SS.t, or raw seconds into seconds. */
export function parseTime(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed)
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  const parts = trimmed.split(':')
  if (parts.length < 2 || parts.length > 3) return null
  const nums = parts.map((p) => Number(p))
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null
  if (parts.length === 2) {
    const [m, s] = nums
    return (m ?? 0) * 60 + (s ?? 0)
  }
  const [h, m, s] = nums
  return (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0)
}

export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed

  try {
    const u = new URL(trimmed)
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.split('/').filter(Boolean)[0]
      return id && /^[\w-]{11}$/.test(id) ? id : null
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v && /^[\w-]{11}$/.test(v)) return v
      const parts = u.pathname.split('/')
      const embedIdx = parts.indexOf('embed')
      if (embedIdx >= 0 && parts[embedIdx + 1] && /^[\w-]{11}$/.test(parts[embedIdx + 1])) {
        return parts[embedIdx + 1]
      }
      const shortsIdx = parts.indexOf('shorts')
      if (shortsIdx >= 0 && parts[shortsIdx + 1] && /^[\w-]{11}$/.test(parts[shortsIdx + 1])) {
        return parts[shortsIdx + 1]
      }
    }
  } catch {
    return null
  }
  return null
}
