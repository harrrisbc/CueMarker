# CueMarker

Local-first app for lighting and theatre designers to mark cues on rehearsal video and export a cue list.

## Features

- **Import** a local MP4 or paste a YouTube URL
- **Stable timeline** for long rehearsals (overview mode for multi-hour clips; waveform when safe)
- **Trackpad-friendly**: scroll to pan, pinch / Ctrl+scroll to zoom
- **Duration cues** — press **M** to start, **N** (or Stop Cue) to end
- **Bullet markers** — press **B** for a single flash point
- **Drag markers** on the timeline to adjust time; edit start/end in the cue list
- **Cue list** with number, time, name, remark, thumbnail, Jump, and Delete
- **Frame screenshots** next to each cue (MP4 only)
- **Save / Load JSON** project files; IndexedDB autosave on this device
- **Export** CSV and PDF
- **Desktop app** via Tauri (double-click `.app` / `.exe`)

## Shortcuts

| Key | Action |
|-----|--------|
| `M` | Start duration cue at playhead |
| `N` | Stop recording cue at playhead |
| `B` | Place bullet marker |
| `Esc` | Cancel open recording |
| `Space` | Play / pause |

## Desktop app (recommended)

CueMarker ships as a normal desktop app using [Tauri](https://tauri.app/).

### Prerequisites (Mac)

1. [Node.js 20+](https://nodejs.org)
2. [Rust](https://rustup.rs) — install, then reopen Terminal:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
3. Xcode Command Line Tools:
   ```bash
   xcode-select --install
   ```

### Run in desktop window (dev)

```bash
git clone https://github.com/harrrisbc/CueMarker.git
cd CueMarker
git checkout cursor/theatre-cue-marker-71e9
npm install
npm run tauri:dev
```

A CueMarker window opens (no browser needed).

### Build installable app

**Mac** (creates `.app` / `.dmg`):
```bash
npm run tauri:build
```
Built files land in:
`src-tauri/target/release/bundle/macos/` and `.../dmg/`

**Windows** (creates `.exe` / `.msi` — run on a Windows PC):
```bash
npm run tauri:build
```
Output in:
`src-tauri/target/release/bundle/nsis/` or `.../msi/`

Drag **CueMarker.app** to Applications (Mac), or run the Windows installer — then open like any other app.

## Browser (optional)

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## JSON project files

**Save JSON** writes `ProjectName.cuemarker.json` (cues, names, remarks, YouTube URL, MP4 file name).

**Load JSON** restores cues. For MP4 projects, re-import the same video file when prompted (video is not embedded in the JSON).

## Notes

- Clips longer than ~45 minutes use the overview timeline (no heavy audio decode) so 2-hour rehearsals stay stable.
- Full waveform peaks and thumbnail screenshots work best with shorter local MP4s.
- YouTube supports playback, scrubbing, and cue/bullet marking; waveform audio and thumbs are limited by the browser.
- Projects stay on the device; use Save JSON for portable backups.
