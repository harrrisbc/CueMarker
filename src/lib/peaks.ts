/** Safe, capped peak extraction for waveforms. Returns null for long/huge files. */

const MAX_DECODE_SECONDS = 45 * 60
const MAX_BLOB_BYTES = 180 * 1024 * 1024 // ~180MB — decode past this is too risky
const TARGET_POINTS = 3200
const DECODE_TIMEOUT_MS = 45_000

export type PeaksResult = {
  peaks: number[][]
  duration: number
}

function downsampleChannel(data: Float32Array, target: number): number[] {
  const len = data.length
  if (len === 0) return new Array(target).fill(0)
  const block = Math.max(1, Math.floor(len / target))
  const out: number[] = []
  for (let i = 0; i < target; i++) {
    const start = i * block
    const end = Math.min(len, start + block)
    let peak = 0
    for (let j = start; j < end; j++) {
      const v = Math.abs(data[j] ?? 0)
      if (v > peak) peak = v
    }
    out.push(peak)
  }
  return out
}

export function shouldAttemptPeaks(duration: number, blobSize: number): boolean {
  if (!Number.isFinite(duration) || duration <= 0) return false
  if (duration > MAX_DECODE_SECONDS) return false
  if (blobSize > MAX_BLOB_BYTES) return false
  return true
}

/**
 * Decode audio and build downsampled peaks. Never call for multi-hour files —
 * returns null on skip / failure so the UI can use the overview timeline.
 */
export async function extractPeaksFromBlob(
  blob: Blob,
  durationHint?: number,
): Promise<PeaksResult | null> {
  if (durationHint != null && !shouldAttemptPeaks(durationHint, blob.size)) {
    return null
  }
  if (blob.size > MAX_BLOB_BYTES) return null

  let ctx: AudioContext | null = null
  try {
    ctx = new AudioContext()
    const arrayBuffer = await blob.arrayBuffer()
    const copy = arrayBuffer.slice(0)

    const audioBuffer = await Promise.race([
      ctx.decodeAudioData(copy),
      new Promise<AudioBuffer>((_, reject) => {
        window.setTimeout(() => reject(new Error('Peak decode timed out')), DECODE_TIMEOUT_MS)
      }),
    ])

    if (audioBuffer.duration > MAX_DECODE_SECONDS) {
      return null
    }

    const channel = audioBuffer.getChannelData(0)
    const samples = downsampleChannel(channel, TARGET_POINTS)
    // WaveSurfer expects [-1..1] style channel arrays; use mono duplicated
    return {
      peaks: [samples],
      duration: audioBuffer.duration,
    }
  } catch {
    return null
  } finally {
    try {
      await ctx?.close()
    } catch {
      /* ignore */
    }
  }
}

/** Draw a simple peak strip into a canvas (overview / zoomed view). */
export function drawPeaksOnCanvas(
  canvas: HTMLCanvasElement,
  peaks: number[],
  width: number,
  height: number,
  scrollPx: number,
  pxPerSec: number,
  duration: number,
): void {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.max(1, Math.floor(width * dpr))
  canvas.height = Math.max(1, Math.floor(height * dpr))
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  ctx.fillStyle = 'rgba(180, 150, 100, 0.55)'
  const mid = height / 2
  const totalPx = Math.max(1, duration * pxPerSec)
  const startSample = Math.floor((scrollPx / totalPx) * peaks.length)
  const endSample = Math.ceil(((scrollPx + width) / totalPx) * peaks.length)
  const visible = Math.max(1, endSample - startSample)

  for (let x = 0; x < width; x++) {
    const si = startSample + Math.floor((x / width) * visible)
    const amp = peaks[Math.min(peaks.length - 1, Math.max(0, si))] ?? 0
    const h = Math.max(1, amp * (height * 0.9))
    ctx.fillRect(x, mid - h / 2, 1, h)
  }
}
