import { CHUNK_OFFSETS, CHUNK_SIZE } from './constants'
import type { SpaceObject } from '../spaceTypes'

export type BookmarkChunk = {
  key: string
  cx: number
  cy: number
  cz: number
  objects: SpaceObject[]
}

function key(cx: number, cy: number, cz: number) {
  return `${cx},${cy},${cz}`
}

export function buildBookmarkChunks(objects: SpaceObject[]) {
  const chunks = new Map<string, BookmarkChunk>()

  for (const object of objects) {
    const cx = Math.floor(object.x / CHUNK_SIZE)
    const cy = Math.floor(object.y / CHUNK_SIZE)
    const cz = Math.floor(object.z / CHUNK_SIZE)
    const chunkKey = key(cx, cy, cz)
    const existing = chunks.get(chunkKey)

    if (existing) {
      existing.objects.push(object)
      continue
    }

    chunks.set(chunkKey, {
      key: chunkKey,
      cx,
      cy,
      cz,
      objects: [object],
    })
  }

  return chunks
}

export function activeChunksAround(
  chunks: Map<string, BookmarkChunk>,
  cx: number,
  cy: number,
  cz: number,
) {
  const active: BookmarkChunk[] = []

  for (const offset of CHUNK_OFFSETS) {
    const chunk = chunks.get(
      key(cx + offset.dx, cy + offset.dy, cz + offset.dz),
    )
    if (chunk) active.push(chunk)
  }

  return active
}
