import type { Cue, ProjectState } from '../types'

export const PROJECT_JSON_VERSION = 1

export type ProjectJson = {
  version: number
  projectName: string
  media: ProjectState['media']
  cues: Cue[]
  updatedAt: number
}

export function toProjectJson(project: ProjectState): ProjectJson {
  return {
    version: PROJECT_JSON_VERSION,
    projectName: project.projectName,
    media: {
      kind: project.media.kind,
      youtubeId: project.media.youtubeId,
      fileName: project.media.fileName,
    },
    cues: project.cues.map((c) => ({
      id: c.id,
      number: c.number,
      type: c.type,
      start: c.start,
      end: c.end,
      name: c.name,
      remark: c.remark,
      thumbnail: c.thumbnail,
    })),
    updatedAt: project.updatedAt,
  }
}

export function parseProjectJson(raw: unknown): ProjectJson {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid project file')
  const data = raw as Record<string, unknown>
  if (typeof data.projectName !== 'string') throw new Error('Missing projectName')
  if (!Array.isArray(data.cues)) throw new Error('Missing cues array')

  const mediaRaw = (data.media ?? {}) as Record<string, unknown>
  const kind =
    mediaRaw.kind === 'mp4' || mediaRaw.kind === 'youtube' || mediaRaw.kind === 'none'
      ? mediaRaw.kind
      : 'none'

  const cues: Cue[] = data.cues.map((item, i) => {
    const c = item as Record<string, unknown>
    const type = c.type === 'bullet' ? 'bullet' : 'cue'
    const start = Number(c.start)
    const end = c.end == null || c.end === '' ? null : Number(c.end)
    if (!Number.isFinite(start)) throw new Error(`Cue ${i + 1} has invalid start`)
    return {
      id: typeof c.id === 'string' ? c.id : crypto.randomUUID(),
      number: typeof c.number === 'number' ? c.number : i + 1,
      type,
      start,
      end: end != null && Number.isFinite(end) ? end : type === 'cue' ? start : null,
      name: typeof c.name === 'string' ? c.name : '',
      remark: typeof c.remark === 'string' ? c.remark : '',
      thumbnail: typeof c.thumbnail === 'string' ? c.thumbnail : null,
    }
  })

  return {
    version: typeof data.version === 'number' ? data.version : PROJECT_JSON_VERSION,
    projectName: data.projectName,
    media: {
      kind,
      youtubeId: typeof mediaRaw.youtubeId === 'string' ? mediaRaw.youtubeId : null,
      fileName: typeof mediaRaw.fileName === 'string' ? mediaRaw.fileName : null,
    },
    cues,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
  }
}

export function downloadProjectJson(project: ProjectState): void {
  const json = toProjectJson(project)
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
  const name = (project.projectName || 'cues').replace(/[^\w-]+/g, '_').slice(0, 60)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.cuemarker.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function readProjectJsonFile(file: File): Promise<ProjectJson> {
  const text = await file.text()
  return parseProjectJson(JSON.parse(text) as unknown)
}
