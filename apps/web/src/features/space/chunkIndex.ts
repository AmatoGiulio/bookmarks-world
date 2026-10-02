import type { CameraState, ViewportState } from '@bookmarks/spatial-engine'
import type { SpaceObject } from './spaceTypes'

const DEFAULT_CHUNK_SIZE = 720

export type ChunkIndex = {
  query: (
    camera: Readonly<CameraState>,
    viewport: Readonly<ViewportState>,
    margin?: number,
  ) => SpaceObject[]
}

export function createChunkIndex(
  objects: SpaceObject[],
  chunkSize = DEFAULT_CHUNK_SIZE,
): ChunkIndex {
  const chunks = new Map<string, SpaceObject[]>()

  for (const object of objects) {
    const cx = Math.floor(object.x / chunkSize)
    const cy = Math.floor(object.y / chunkSize)
    const key = `${cx},${cy}`
    const bucket = chunks.get(key)

    if (bucket) bucket.push(object)
    else chunks.set(key, [object])
  }

  return {
    query: (camera, viewport, margin = 360) => {
      const halfW = viewport.width / camera.zoom / 2 + margin
      const halfH = viewport.height / camera.zoom / 2 + margin
      const minCx = Math.floor((camera.x - halfW) / chunkSize)
      const maxCx = Math.floor((camera.x + halfW) / chunkSize)
      const minCy = Math.floor((camera.y - halfH) / chunkSize)
      const maxCy = Math.floor((camera.y + halfH) / chunkSize)

      const visible: SpaceObject[] = []
      for (let cy = minCy; cy <= maxCy; cy += 1) {
        for (let cx = minCx; cx <= maxCx; cx += 1) {
          const bucket = chunks.get(`${cx},${cy}`)
          if (bucket) visible.push(...bucket)
        }
      }

      return visible
    },
  }
}
