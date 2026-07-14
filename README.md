# CueMarker

Local-first web app for lighting and theatre designers to mark cues on rehearsal video and export a cue list.

## Features

- **Import** a local MP4 or paste a YouTube URL
- **Stable timeline** for long rehearsals (overview mode for multi-hour clips; waveform when safe)
- **Trackpad-friendly**: scroll to pan, pinch / Ctrl+scroll to zoom
- **Continuous duration cues** — press **M** once; each cue runs until the next
- **Bullet markers** — press **B** for a single flash point
- **Drag markers** on the timeline to adjust time; edit start/end in the cue list
- **Cue list** with number, time, name, remark, thumbnail, Jump, and Delete
- **Frame screenshots** next to each cue (MP4 only)
- **Save / Load JSON** project files; IndexedDB autosave on this device
- **Export** CSV and PDF

## Shortcuts

| Key | Action |
|-----|--------|
| `M` | Place continuous duration cue at playhead |
| `B` | Place bullet marker |
| `Space` | Play / pause |

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build
npm run preview
```

## JSON project files

**Save JSON** writes `ProjectName.cuemarker.json` (cues, names, remarks, YouTube URL, MP4 file name).

**Load JSON** restores cues. For MP4 projects, re-import the same video file when prompted (video is not embedded in the JSON).

## Notes

- Clips longer than ~45 minutes use the overview timeline (no heavy audio decode) so 2-hour rehearsals stay stable.
- Full waveform peaks and thumbnail screenshots work best with shorter local MP4s.
- YouTube supports playback, scrubbing, and cue/bullet marking; waveform audio and thumbs are limited by the browser.
- Projects stay in the browser; clearing site data removes autosaved data. Use Save JSON for portable backups.
