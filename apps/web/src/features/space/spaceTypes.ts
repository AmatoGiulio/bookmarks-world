export type SpaceObjectKind =
  | 'image'
  | 'video'
  | 'paper'
  | 'repo'
  | 'article'
  | 'audio'
  | 'cluster'

export type SpaceObject = {
  id: string
  kind: SpaceObjectKind
  title: string
  subtitle: string
  source?: string
  x: number
  y: number
  z: number
  width: number
  height: number
  tags: string[]
  image?: string
  accent?: string
  meta?: string
  priority?: number
}
