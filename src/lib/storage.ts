import { get, set, del } from 'idb-keyval'
import type { ProjectState } from '../types'

const PROJECT_KEY = 'theatre-cue-project'
const MEDIA_BLOB_KEY = 'theatre-cue-media-blob'

export async function saveProject(project: ProjectState): Promise<void> {
  await set(PROJECT_KEY, project)
}

export async function loadProject(): Promise<ProjectState | null> {
  const data = await get<ProjectState>(PROJECT_KEY)
  return data ?? null
}

export async function saveMediaBlob(blob: Blob): Promise<void> {
  await set(MEDIA_BLOB_KEY, blob)
}

export async function loadMediaBlob(): Promise<Blob | null> {
  const blob = await get<Blob>(MEDIA_BLOB_KEY)
  return blob ?? null
}

export async function clearMediaBlob(): Promise<void> {
  await del(MEDIA_BLOB_KEY)
}

export function createEmptyProject(name = 'Untitled Rehearsal'): ProjectState {
  return {
    projectName: name,
    media: { kind: 'none', youtubeId: null, fileName: null },
    cues: [],
    updatedAt: Date.now(),
  }
}
