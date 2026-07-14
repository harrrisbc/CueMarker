import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Toolbar } from './components/Toolbar'
import { VideoStage } from './components/VideoStage'
import { WaveformTimeline } from './components/WaveformTimeline'
import { CueList } from './components/CueList'
import { useCues } from './hooks/useCues'
import { usePlayer } from './hooks/usePlayer'
import { captureVideoFrame } from './lib/screenshot'
import { exportCuesCsv, exportCuesPdf } from './lib/export'
import { extractYouTubeId } from './lib/time'
import {
  clearMediaBlob,
  loadMediaBlob,
  loadProject,
  saveMediaBlob,
  saveProject,
} from './lib/storage'
import type { MediaKind } from './types'
import './App.css'

function App() {
  const [projectName, setProjectName] = useState('Untitled Rehearsal')
  const [mediaKind, setMediaKind] = useState<MediaKind>('none')
  const [mp4Url, setMp4Url] = useState<string | null>(null)
  const [youtubeId, setYoutubeId] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const {
    cues,
    pendingStart,
    isRecording,
    replaceCues,
    startOrFinishCue,
    addBullet,
    cancelPending,
    updateCue,
    deleteCue,
  } = useCues()

  const {
    videoRef,
    ytContainerRef,
    currentTime,
    duration,
    playing,
    seekTo,
    togglePlay,
    controller,
  } = usePlayer({ kind: mediaKind, mp4Url, youtubeId })

  const mp4UrlRef = useRef(mp4Url)
  mp4UrlRef.current = mp4Url

  // Hydrate from IndexedDB once
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const project = await loadProject()
        if (cancelled || !project) {
          setHydrated(true)
          return
        }
        setProjectName(project.projectName)
        replaceCues(project.cues)
        if (project.media.kind === 'youtube' && project.media.youtubeId) {
          setMediaKind('youtube')
          setYoutubeId(project.media.youtubeId)
          setFileName(null)
        } else if (project.media.kind === 'mp4') {
          const blob = await loadMediaBlob()
          if (blob) {
            const url = URL.createObjectURL(blob)
            setMp4Url(url)
            setMediaKind('mp4')
            setFileName(project.media.fileName)
            setYoutubeId(null)
          }
        }
        setStatus('Restored last project from this device')
      } catch {
        setStatus('Could not restore previous project')
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [replaceCues])

  // Autosave
  useEffect(() => {
    if (!hydrated) return
    const handle = window.setTimeout(() => {
      void saveProject({
        projectName,
        media: {
          kind: mediaKind,
          youtubeId,
          fileName,
        },
        cues,
        updatedAt: Date.now(),
      })
    }, 400)
    return () => window.clearTimeout(handle)
  }, [hydrated, projectName, mediaKind, youtubeId, fileName, cues])

  // Revoke object URLs
  useEffect(() => {
    return () => {
      if (mp4UrlRef.current) URL.revokeObjectURL(mp4UrlRef.current)
    }
  }, [])

  const hasMedia = mediaKind !== 'none'

  const grabThumb = useCallback(() => {
    return captureVideoFrame(controller.getVideoElement())
  }, [controller])

  const handleImportMp4 = useCallback(
    async (file: File) => {
      if (mp4UrlRef.current) URL.revokeObjectURL(mp4UrlRef.current)
      const url = URL.createObjectURL(file)
      setMp4Url(url)
      setMediaKind('mp4')
      setYoutubeId(null)
      setFileName(file.name)
      cancelPending()
      try {
        await saveMediaBlob(file)
      } catch {
        setStatus('Warning: MP4 could not be cached locally (file may be too large)')
      }
      setStatus(`Loaded ${file.name}`)
    },
    [cancelPending],
  )

  const handleImportYouTube = useCallback(
    async (url: string) => {
      const id = extractYouTubeId(url)
      if (!id) {
        setStatus('Invalid YouTube URL')
        return
      }
      if (mp4UrlRef.current) {
        URL.revokeObjectURL(mp4UrlRef.current)
        setMp4Url(null)
      }
      await clearMediaBlob()
      setYoutubeId(id)
      setMediaKind('youtube')
      setFileName(null)
      cancelPending()
      setStatus('YouTube loaded — screenshots unavailable (browser limit)')
    },
    [cancelPending],
  )

  const handleMarkCue = useCallback(() => {
    if (!hasMedia) return
    const t = controller.getCurrentTime()
    const thumb = grabThumb()
    const result = startOrFinishCue(t, thumb)
    if (result.action === 'started') setStatus(`Cue start @ ${t.toFixed(1)}s — press M again to end`)
    else setStatus(`Cue #${result.cue?.number ?? ''} recorded`)
  }, [hasMedia, controller, grabThumb, startOrFinishCue])

  const handleBullet = useCallback(() => {
    if (!hasMedia || isRecording) return
    const t = controller.getCurrentTime()
    const thumb = grabThumb()
    const cue = addBullet(t, thumb)
    setStatus(`Bullet #${cue.number} @ ${t.toFixed(1)}s`)
  }, [hasMedia, isRecording, controller, grabThumb, addBullet])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return

      if (e.key === 'Escape') {
        if (isRecording) {
          cancelPending()
          setStatus('Cue cancelled')
        }
        return
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        handleMarkCue()
        return
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        handleBullet()
        return
      }
      if (e.key === ' ' && hasMedia) {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleMarkCue, handleBullet, cancelPending, isRecording, togglePlay, hasMedia])

  const noteBanner = useMemo(() => {
    if (mediaKind === 'youtube') {
      return 'YouTube mode: marking works; waveform audio & thumbnails need a local MP4.'
    }
    return null
  }, [mediaKind])

  return (
    <div className="app-shell">
      <Toolbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        onImportMp4={handleImportMp4}
        onImportYouTube={handleImportYouTube}
        onMarkCue={handleMarkCue}
        onBullet={handleBullet}
        onExportCsv={() => exportCuesCsv(cues, projectName)}
        onExportPdf={() => void exportCuesPdf(cues, projectName)}
        isRecording={isRecording}
        pendingStart={pendingStart}
        hasMedia={hasMedia}
        cueCount={cues.length}
      />

      {(status || noteBanner) && (
        <div className="status-bar" role="status">
          {noteBanner && <span className="status-note">{noteBanner}</span>}
          {status && <span className="status-msg">{status}</span>}
        </div>
      )}

      <div className="workspace">
        <main className="stage">
          <VideoStage
            kind={mediaKind}
            mp4Url={mp4Url}
            videoRef={videoRef}
            ytContainerRef={ytContainerRef}
            currentTime={currentTime}
            duration={duration}
            playing={playing}
            onTogglePlay={togglePlay}
            onSeekRelative={(d) => seekTo(Math.max(0, Math.min(duration || 0, currentTime + d)))}
          />
          <WaveformTimeline
            kind={mediaKind}
            mediaUrl={mp4Url}
            videoRef={videoRef}
            duration={duration}
            currentTime={currentTime}
            cues={cues}
            pendingStart={pendingStart}
            onSeek={seekTo}
          />
        </main>

        <CueList cues={cues} onUpdate={updateCue} onDelete={deleteCue} onJump={seekTo} />
      </div>
    </div>
  )
}

export default App
