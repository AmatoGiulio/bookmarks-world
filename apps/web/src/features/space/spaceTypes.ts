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
  x: number
  y: number
  width: number
  height: number
  tags: string[]
  image?: string
  accent?: string
  meta?: string
}
