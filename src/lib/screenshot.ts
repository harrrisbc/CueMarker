/** Capture current frame from an HTML video element as a JPEG data URL */
export function captureVideoFrame(
  video: HTMLVideoElement | null,
  maxWidth = 320,
): string | null {
  if (!video || video.readyState < 2 || video.videoWidth === 0) return null

  const ratio = video.videoHeight / video.videoWidth
  const w = Math.min(maxWidth, video.videoWidth)
  const h = Math.round(w * ratio)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  try {
    ctx.drawImage(video, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.72)
  } catch {
    // CORS / tainted canvas (e.g. YouTube) — not available
    return null
  }
}
