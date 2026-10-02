import * as THREE from 'three'
import type { SpaceObject } from '../spaceTypes'
import { createSurfaceTexture } from './surfaceTexture'

const cache = new Map<string, THREE.Texture>()
const callbacks = new Map<string, Set<(texture: THREE.Texture) => void>>()
const loader = new THREE.TextureLoader()

function notify(key: string, texture: THREE.Texture) {
  callbacks.get(key)?.forEach((callback) => callback(texture))
  callbacks.delete(key)
}

export function getBookmarkTexture(
  object: SpaceObject,
  onLoad?: (texture: THREE.Texture) => void,
) {
  const key = object.id
  const cached = cache.get(key)

  if (cached) {
    onLoad?.(cached)
    return cached
  }

  if (!object.image) {
    const fallback = createSurfaceTexture(object)
    cache.set(key, fallback)
    onLoad?.(fallback)
    return fallback
  }

  const pending = callbacks.get(key) ?? new Set<(texture: THREE.Texture) => void>()
  if (onLoad) pending.add(onLoad)
  callbacks.set(key, pending)

  const texture = loader.load(
    object.image,
    (loaded) => {
      loaded.minFilter = THREE.LinearMipmapLinearFilter
      loaded.magFilter = THREE.LinearFilter
      loaded.generateMipmaps = true
      loaded.anisotropy = 4
      loaded.colorSpace = THREE.SRGBColorSpace
      loaded.needsUpdate = true
      cache.set(key, loaded)
      notify(key, loaded)
    },
    undefined,
    () => {
      const fallback = createSurfaceTexture(object)
      cache.set(key, fallback)
      notify(key, fallback)
    },
  )

  cache.set(key, texture)
  return texture
}
