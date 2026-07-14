import { useCallback, useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    YT?: typeof YT
    onYouTubeIframeAPIReady?: () => void
  }
}

let ytApiPromise: Promise<void> | null = null

function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve()
  if (ytApiPromise) return ytApiPromise

  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    } else if (window.YT?.Player) {
      resolve()
    }
  })
  return ytApiPromise
}

export interface PlayerController {
  getCurrentTime: () => number
  getDuration: () => number
  seekTo: (time: number) => void
  play: () => void
  pause: () => void
  isPlaying: () => boolean
  getVideoElement: () => HTMLVideoElement | null
}

interface UsePlayerOptions {
  kind: 'none' | 'mp4' | 'youtube'
  mp4Url: string | null
  youtubeId: string | null
  onTimeUpdate?: (t: number) => void
}

export function usePlayer({ kind, mp4Url, youtubeId, onTimeUpdate }: UsePlayerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const ytContainerRef = useRef<HTMLDivElement | null>(null)
  const ytPlayerRef = useRef<YT.Player | null>(null)
  const [ready, setReady] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const rafRef = useRef<number>(0)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  onTimeUpdateRef.current = onTimeUpdate

  // Tear down / rebuild when media changes
  useEffect(() => {
    setReady(false)
    setCurrentTime(0)
    setDuration(0)
    setPlaying(false)
    ytPlayerRef.current = null

    if (kind === 'none') return

    if (kind === 'mp4') {
      const video = videoRef.current
      if (!video || !mp4Url) return

      const onMeta = () => {
        setDuration(video.duration || 0)
        setReady(true)
      }
      const onPlay = () => setPlaying(true)
      const onPause = () => setPlaying(false)
      const onEnded = () => setPlaying(false)

      video.addEventListener('loadedmetadata', onMeta)
      video.addEventListener('play', onPlay)
      video.addEventListener('pause', onPause)
      video.addEventListener('ended', onEnded)
      if (video.readyState >= 1) onMeta()

      return () => {
        video.removeEventListener('loadedmetadata', onMeta)
        video.removeEventListener('play', onPlay)
        video.removeEventListener('pause', onPause)
        video.removeEventListener('ended', onEnded)
      }
    }

    if (kind === 'youtube' && youtubeId) {
      let cancelled = false
      let player: YT.Player | null = null

      loadYouTubeApi().then(() => {
        if (cancelled || !ytContainerRef.current || !window.YT) return
        // Clear previous iframe
        ytContainerRef.current.innerHTML = ''
        const host = document.createElement('div')
        host.id = `yt-host-${youtubeId}-${Date.now()}`
        ytContainerRef.current.appendChild(host)

        player = new window.YT.Player(host.id, {
          videoId: youtubeId,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: (e) => {
              if (cancelled) return
              ytPlayerRef.current = e.target
              setDuration(e.target.getDuration() || 0)
              setReady(true)
            },
            onStateChange: (e) => {
              setPlaying(e.data === window.YT!.PlayerState.PLAYING)
              if (e.data === window.YT!.PlayerState.PLAYING) {
                setDuration(e.target.getDuration() || 0)
              }
            },
          },
        })
        ytPlayerRef.current = player
      })

      return () => {
        cancelled = true
        try {
          player?.destroy()
        } catch {
          /* ignore */
        }
        ytPlayerRef.current = null
      }
    }
  }, [kind, mp4Url, youtubeId])

  // RAF clock for continuous time
  useEffect(() => {
    const tick = () => {
      let t = 0
      if (kind === 'mp4' && videoRef.current) {
        t = videoRef.current.currentTime
        if (videoRef.current.duration && videoRef.current.duration !== duration) {
          setDuration(videoRef.current.duration)
        }
      } else if (kind === 'youtube' && ytPlayerRef.current?.getCurrentTime) {
        try {
          t = ytPlayerRef.current.getCurrentTime() || 0
        } catch {
          t = 0
        }
      }
      setCurrentTime(t)
      onTimeUpdateRef.current?.(t)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [kind, duration])

  const seekTo = useCallback(
    (time: number) => {
      const t = Math.max(0, time)
      if (kind === 'mp4' && videoRef.current) {
        videoRef.current.currentTime = t
        setCurrentTime(t)
      } else if (kind === 'youtube' && ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(t, true)
        setCurrentTime(t)
      }
    },
    [kind],
  )

  const play = useCallback(() => {
    if (kind === 'mp4') videoRef.current?.play()
    else if (kind === 'youtube') ytPlayerRef.current?.playVideo()
  }, [kind])

  const pause = useCallback(() => {
    if (kind === 'mp4') videoRef.current?.pause()
    else if (kind === 'youtube') ytPlayerRef.current?.pauseVideo()
  }, [kind])

  const togglePlay = useCallback(() => {
    if (playing) pause()
    else play()
  }, [playing, play, pause])

  const controller: PlayerController = {
    getCurrentTime: () => {
      if (kind === 'mp4' && videoRef.current) return videoRef.current.currentTime
      if (kind === 'youtube' && ytPlayerRef.current?.getCurrentTime) {
        try {
          return ytPlayerRef.current.getCurrentTime()
        } catch {
          return currentTime
        }
      }
      return currentTime
    },
    getDuration: () => duration,
    seekTo,
    play,
    pause,
    isPlaying: () => playing,
    getVideoElement: () => (kind === 'mp4' ? videoRef.current : null),
  }

  return {
    videoRef,
    ytContainerRef,
    ready,
    currentTime,
    duration,
    playing,
    seekTo,
    play,
    pause,
    togglePlay,
    controller,
  }
}
