export type CueType = 'cue' | 'bullet'

export type MediaKind = 'none' | 'mp4' | 'youtube'

export interface Cue {
  id: string
  number: number
  type: CueType
  start: number
  end: number | null
  name: string
  remark: string
  thumbnail: string | null
}

export interface ProjectMedia {
  kind: MediaKind
  youtubeId: string | null
  /** Original file name for MP4 (blob stored separately) */
  fileName: string | null
}

export interface ProjectState {
  projectName: string
  media: ProjectMedia
  cues: Cue[]
  updatedAt: number
}
