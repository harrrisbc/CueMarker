import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Toolbar } from './components/Toolbar'
import { VideoStage } from './components/VideoStage'
import { WaveformTimeline } from './components/WaveformTimeline'
import { CueList } from './components/CueList'
import { useCues } from './hooks/useCues'
import { usePlayer } from './hooks/usePlayer'
import { captureVideoFrame } from './lib/screenshot'
import { exportCuesCsv, exportCuesPdf } from './lib/export'
import { extractPeaksFromBlob, shouldAttemptPeaks } from './lib/peaks'
import { downloadProjectJson, readProjectJsonFile } from './lib/projectJson'
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
  const [mp4Blob, setMp4Blob] = useState<Blob | null>(null)
  const [youtubeId, setYoutubeId] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [peaks, setPeaks] = useState<number[] | null>(null)
  const [peaksStatus, setPeaksStatus] = useState<'idle' | 'building' | 'ready' | 'fallback'>('idle')

  const {
    cues,
    isRecording,
    recordingStart,
    replaceCues,
    startCue,
    stopCue,
    tickRecording,
    cancelRecording,
    addBullet,
    updateCue,
    setCueTimes,
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

  // Live-update open cue end while recording
  useEffect(() => {
    if (!isRecording) return
    tickRecording(currentTime)
  }, [isRecording, currentTime, tickRecording])

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
          setMp4Blob(null)
          setPeaks(null)
          setPeaksStatus('idle')
        } else if (project.media.kind === 'mp4') {
          const blob = await loadMediaBlob()
          if (blob) {
            const url = URL.createObjectURL(blob)
            setMp4Url(url)
            setMp4Blob(blob)
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

  // Peak extraction for MP4 (skipped for long / large files)
  useEffect(() => {
    let cancelled = false
    if (mediaKind !== 'mp4' || !mp4Blob) {
      setPeaks(null)
      setPeaksStatus(mediaKind === 'none' ? 'idle' : 'fallback')
      return
    }

    const run = async () => {
      if (duration <= 0) {
        if (!cancelled) setPeaksStatus('building')
        return
      }
      if (!shouldAttemptPeaks(duration, mp4Blob.size)) {
        if (!cancelled) {
          setPeaks(null)
          setPeaksStatus('fallback')
          setStatus('Long clip: using overview timeline (waveform skipped for stability)')
        }
        return
      }
      if (!cancelled) setPeaksStatus('building')
      const result = await extractPeaksFromBlob(mp4Blob, duration)
      if (cancelled) return
      if (result) {
        setPeaks(result.peaks[0] ?? null)
        setPeaksStatus('ready')
      } else {
        setPeaks(null)
        setPeaksStatus('fallback')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [mediaKind, mp4Blob, duration])

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

  useEffect(() => {
    return () => {
      if (mp4UrlRef.current) URL.revokeObjectURL(mp4UrlRef.current)
    }
  }, [])

  const hasMedia = mediaKind !== 'none'

  const grabThumb = useCallback(() => {
    return captureVideoFrame(controller.getVideoElement())
  }, [controller])

  const handleImportMp4 = useCallback(async (file: File) => {
    if (mp4UrlRef.current) URL.revokeObjectURL(mp4UrlRef.current)
    const url = URL.createObjectURL(file)
    setMp4Url(url)
    setMp4Blob(file)
    setMediaKind('mp4')
    setYoutubeId(null)
    setFileName(file.name)
    setPeaks(null)
    setPeaksStatus('building')
    cancelRecording()
    try {
      await saveMediaBlob(file)
    } catch {
      setStatus('Warning: MP4 could not be cached locally (file may be too large)')
    }
    setStatus(`Loaded ${file.name}`)
  }, [cancelRecording])

  const handleImportYouTube = useCallback(async (url: string) => {
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
    setMp4Blob(null)
    setPeaks(null)
    setPeaksStatus('fallback')
    setYoutubeId(id)
    setMediaKind('youtube')
    setFileName(null)
    cancelRecording()
    setStatus('YouTube loaded — screenshots unavailable (browser limit)')
  }, [cancelRecording])

  const handleMarkCue = useCallback(() => {
    if (!hasMedia) return
    const t = controller.getCurrentTime()
    const thumb = grabThumb()
    const { cue } = startCue(t, thumb)
    setStatus(`Cue started @ ${t.toFixed(1)}s — press N to stop`)
    return cue
  }, [hasMedia, controller, grabThumb, startCue])

  const handleStopCue = useCallback(() => {
    if (!hasMedia || !isRecording) return
    const t = controller.getCurrentTime()
    stopCue(t)
    setStatus(`Cue stopped @ ${t.toFixed(1)}s`)
  }, [hasMedia, isRecording, controller, stopCue])

  const handleBullet = useCallback(() => {
    if (!hasMedia || isRecording) return
    const t = controller.getCurrentTime()
    const thumb = grabThumb()
    const cue = addBullet(t, thumb)
    setStatus(`Bullet #${cue.number} @ ${t.toFixed(1)}s`)
  }, [hasMedia, isRecording, controller, grabThumb, addBullet])

  const handleSaveJson = useCallback(() => {
    downloadProjectJson({
      projectName,
      media: { kind: mediaKind, youtubeId, fileName },
      cues,
      updatedAt: Date.now(),
    })
    setStatus('Project JSON saved')
  }, [projectName, mediaKind, youtubeId, fileName, cues])

  const handleLoadJson = useCallback(
    async (file: File) => {
      try {
        const project = await readProjectJsonFile(file)
        setProjectName(project.projectName)
        replaceCues(project.cues)
        if (project.media.kind === 'youtube' && project.media.youtubeId) {
          if (mp4UrlRef.current) {
            URL.revokeObjectURL(mp4UrlRef.current)
            setMp4Url(null)
          }
          setMp4Blob(null)
          await clearMediaBlob()
          setYoutubeId(project.media.youtubeId)
          setMediaKind('youtube')
          setFileName(null)
          setPeaks(null)
          setPeaksStatus('fallback')
          setStatus('JSON loaded · YouTube restored')
        } else {
          setFileName(project.media.fileName)
          if (project.media.kind === 'mp4' && project.media.fileName && mediaKind !== 'mp4') {
            setStatus(`JSON loaded — Import MP4: ${project.media.fileName}`)
          } else if (project.media.kind === 'mp4' && mediaKind === 'mp4') {
            setStatus('JSON cues loaded onto current MP4')
          } else {
            setStatus('JSON loaded')
          }
        }
      } catch (err) {
        setStatus(err instanceof Error ? err.message : 'Could not load JSON')
      }
    },
    [replaceCues, mediaKind],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return

      if (e.key === 'Escape' && isRecording) {
        e.preventDefault()
        cancelRecording()
        setStatus('Recording cancelled')
        return
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        handleMarkCue()
        return
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        handleStopCue()
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
  }, [
    handleMarkCue,
    handleStopCue,
    handleBullet,
    cancelRecording,
    isRecording,
    togglePlay,
    hasMedia,
  ])

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
        onStopCue={handleStopCue}
        onBullet={handleBullet}
        onExportCsv={() => exportCuesCsv(cues, projectName)}
        onExportPdf={() => void exportCuesPdf(cues, projectName)}
        onSaveJson={handleSaveJson}
        onLoadJson={handleLoadJson}
        isRecording={isRecording}
        recordingStart={recordingStart}
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
            duration={duration}
            currentTime={currentTime}
            cues={cues}
            peaks={peaks}
            peaksStatus={peaksStatus}
            onSeek={seekTo}
            onCueTimesChange={setCueTimes}
          />
        </main>

        <CueList
          cues={cues}
          mediaDuration={duration}
          onUpdate={updateCue}
          onDelete={deleteCue}
          onJump={seekTo}
        />
      </div>
    </div>
  )
}

export default App
