# CueMarker

Local-first web app for lighting and theatre designers to mark cues on rehearsal video and export a cue list.

## Features

- **Import** a local MP4 or paste a YouTube URL
- **Interactive timeline** with sound waveform (MP4) or scrub ruler (YouTube)
- **Duration cues** — press **M** (or Mark Cue) to start, press again to end
- **Bullet markers** — press **B** (or Bullet) for a single flash point
- **Cue list** with number, time, name, remark, thumbnail, Jump, and Delete
- **Frame screenshots** captured next to each cue (MP4 only)
- **Export** CSV and PDF
- **Autosave** to IndexedDB on this device (no account / no server)

## Shortcuts

| Key | Action |
|-----|--------|
| `M` | Start / finish duration cue |
| `B` | Place bullet marker |
| `Space` | Play / pause |
| `Esc` | Cancel open duration cue |

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build
npm run preview
```

## Notes

- Full **waveform** and **thumbnail screenshots** require a local MP4 (browser CORS blocks this for YouTube).
- YouTube still supports playback, scrubbing, and cue/bullet marking.
- Projects stay in the browser; clearing site data removes them.
