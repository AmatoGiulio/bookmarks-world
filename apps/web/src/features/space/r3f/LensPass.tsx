import { useFrame, useThree } from '@react-three/fiber'
import * as React from 'react'
import * as THREE from 'three'
import type { SpaceObject } from '../spaceTypes'
import { semanticLensState } from './semanticLensState'

type Props = {
  objects: SpaceObject[]
  disabled: boolean
}

const LENS_SIZE = 240

export function LensPass({ objects, disabled }: Props) {
  const { gl, scene, camera, raycaster, size } = useThree()
  const pointer = React.useMemo(() => new THREE.Vector2(), [])
  const objectMap = React.useMemo(
    () => new Map(objects.map((object) => [object.id, object])),
    [objects],
  )

  useFrame(() => {
    camera.layers.set(0)
    gl.setScissorTest(false)
    gl.render(scene, camera)

    if (disabled || !semanticLensState.active) {
      semanticLensState.targetId = null
      semanticLensState.targetTags = []
      return
    }

    pointer.set(
      (semanticLensState.pointerX / Math.max(1, size.width)) * 2 - 1,
      -(semanticLensState.pointerY / Math.max(1, size.height)) * 2 + 1,
    )

    raycaster.layers.set(0)
    raycaster.setFromCamera(pointer, camera)

    const hit = raycaster
      .intersectObjects(scene.children, true)
      .find((entry) => typeof entry.object.userData.bookmarkId === 'string')

    const targetId = hit?.object.userData.bookmarkId as string | undefined
    const target = targetId ? objectMap.get(targetId) : undefined

    semanticLensState.targetId = target?.id ?? null
    semanticLensState.targetTags = target?.tags ?? []

    const half = LENS_SIZE / 2
    const left = Math.max(
      0,
      Math.min(size.width - LENS_SIZE, semanticLensState.pointerX - half),
    )
    const top = Math.max(
      0,
      Math.min(size.height - LENS_SIZE, semanticLensState.pointerY - half),
    )
    const bottom = size.height - top - LENS_SIZE

    gl.setScissor(left, bottom, LENS_SIZE, LENS_SIZE)
    gl.setScissorTest(true)

    camera.layers.set(1)
    gl.render(scene, camera)

    camera.layers.set(0)
    gl.setScissorTest(false)
  }, 1)

  return null
}
