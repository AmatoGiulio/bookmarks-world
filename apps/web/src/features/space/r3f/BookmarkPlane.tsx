import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as React from 'react'
import * as THREE from 'three'
import { semanticScore } from '../semantic'
import type { SpaceObject } from '../spaceTypes'
import {
  CHUNK_FADE_MARGIN,
  DEPTH_FADE_END,
  DEPTH_FADE_START,
  INVIS_THRESHOLD,
  RENDER_DISTANCE,
} from './constants'
import {
  semanticLensState,
  semanticRelation,
} from './semanticLensState'
import { getBookmarkTexture } from './textureManager'

const PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1)

export type CameraGridState = {
  cx: number
  cy: number
  cz: number
  camZ: number
}

type Props = {
  object: SpaceObject
  chunkCx: number
  chunkCy: number
  chunkCz: number
  query: string
  focusId: string | null
  cameraGridRef: React.RefObject<CameraGridState>
  onOpen: (object: SpaceObject, origin: DOMRect) => void
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function BookmarkPlane({
  object,
  chunkCx,
  chunkCy,
  chunkCz,
  query,
  focusId,
  cameraGridRef,
  onOpen,
}: Props) {
  const meshRef = React.useRef<THREE.Mesh>(null)
  const semanticRef = React.useRef<THREE.Mesh>(null)
  const materialRef = React.useRef<THREE.MeshBasicMaterial>(null)
  const semanticMaterialRef = React.useRef<THREE.MeshBasicMaterial>(null)

  const { camera, size, gl } = useThree()
  const [hovered, setHovered] = React.useState(false)
  const [texture, setTexture] = React.useState<THREE.Texture | null>(null)

  const state = React.useRef({
    opacity: 0,
    hover: 1,
    focusScale: 1,
    semanticOpacity: 0,
    semanticScale: 1,
    x: object.x,
    y: object.y,
    z: object.z,
    searchScale: 1,
  })

  const scale = React.useMemo(() => {
    const aspect = object.width / Math.max(1, object.height)
    const baseHeight = 13 + (object.priority ?? 1) * 2.3
    return new THREE.Vector3(baseHeight * aspect, baseHeight, 1)
  }, [object.height, object.priority, object.width])

  const searchScore = React.useMemo(
    () => semanticScore(object, query),
    [object, query],
  )

  const searching = query.trim().length > 0

  React.useEffect(() => {
    const loaded = getBookmarkTexture(object, (next) => {
      setTexture(next)
    })
    setTexture(loaded)
  }, [object])

  React.useEffect(() => {
    semanticRef.current?.layers.set(1)
  }, [texture])

  useFrame(() => {
    const mesh = meshRef.current
    const semanticMesh = semanticRef.current
    const material = materialRef.current
    const semanticMaterial = semanticMaterialRef.current

    if (
      !mesh ||
      !semanticMesh ||
      !material ||
      !semanticMaterial ||
      !texture
    ) {
      return
    }

    const cam = cameraGridRef.current
    const chunkDistance = Math.max(
      Math.abs(chunkCx - cam.cx),
      Math.abs(chunkCy - cam.cy),
      Math.abs(chunkCz - cam.cz),
    )
    const depthDistance = Math.abs(object.z - cam.camZ)

    const gridFade = chunkDistance <= RENDER_DISTANCE
      ? 1
      : Math.max(
          0,
          1 -
            (chunkDistance - RENDER_DISTANCE) /
              Math.max(CHUNK_FADE_MARGIN, 0.0001),
        )

    const depthFade = depthDistance <= DEPTH_FADE_START
      ? 1
      : Math.max(
          0,
          1 -
            (depthDistance - DEPTH_FADE_START) /
              Math.max(DEPTH_FADE_END - DEPTH_FADE_START, 0.0001),
        )

    const searchOpacity = searching
      ? searchScore <= 0
        ? 0.035
        : 0.48 + searchScore * 0.52
      : 1

    const baseVisibility =
      Math.min(gridFade, depthFade * depthFade) *
      searchOpacity

    const isFocused = focusId === object.id
    const focusOpacity = focusId === null
      ? 1
      : isFocused
        ? 0
        : 0.075

    const targetOpacity = baseVisibility * focusOpacity
    const targetFocusScale = focusId && !isFocused ? 0.82 : 1

    const relevance = searching ? searchScore : 0
    const targetX = searching && relevance > 0
      ? lerp(object.x, camera.position.x, relevance * 0.34)
      : object.x
    const targetY = searching && relevance > 0
      ? lerp(object.y, camera.position.y, relevance * 0.34)
      : object.y
    const targetZ = searching
      ? relevance > 0
        ? object.z + 22 + relevance * 24
        : object.z - 26
      : object.z
    const targetSearchScale = searching
      ? relevance > 0
        ? 1 + relevance * 0.18
        : 0.82
      : 1

    state.current.x = lerp(state.current.x, targetX, 0.085)
    state.current.y = lerp(state.current.y, targetY, 0.085)
    state.current.z = lerp(state.current.z, targetZ, 0.085)
    state.current.searchScale = lerp(
      state.current.searchScale,
      targetSearchScale,
      0.085,
    )

    mesh.position.set(
      state.current.x,
      state.current.y,
      state.current.z,
    )
    semanticMesh.position.copy(mesh.position)

    state.current.opacity = lerp(
      state.current.opacity,
      targetOpacity,
      focusId ? 0.14 : 0.18,
    )
    state.current.hover = lerp(
      state.current.hover,
      hovered && !focusId ? 1.045 : 1,
      0.16,
    )
    state.current.focusScale = lerp(
      state.current.focusScale,
      targetFocusScale,
      0.1,
    )

    material.opacity = state.current.opacity
    material.depthWrite = state.current.opacity > 0.99
    mesh.visible = state.current.opacity > INVIS_THRESHOLD

    const finalScale =
      state.current.hover *
      state.current.focusScale *
      state.current.searchScale

    mesh.scale.set(
      scale.x * finalScale,
      scale.y * finalScale,
      1,
    )

    const relation = semanticRelation(object.id, object.tags)
    const semanticTarget =
      semanticLensState.active && !focusId
        ? baseVisibility * relation
        : 0

    state.current.semanticOpacity = lerp(
      state.current.semanticOpacity,
      semanticTarget,
      0.22,
    )
    state.current.semanticScale = lerp(
      state.current.semanticScale,
      semanticLensState.active
        ? 0.96 + relation * 0.09
        : 1,
      0.18,
    )

    semanticMaterial.opacity = state.current.semanticOpacity
    semanticMaterial.depthWrite = state.current.semanticOpacity > 0.99
    semanticMesh.visible =
      state.current.semanticOpacity > INVIS_THRESHOLD

    semanticMesh.scale.set(
      scale.x *
        state.current.semanticScale *
        state.current.searchScale,
      scale.y *
        state.current.semanticScale *
        state.current.searchScale,
      1,
    )
  })

  const open = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (focusId) return

    const mesh = meshRef.current
    if (!mesh) return

    mesh.updateWorldMatrix(true, false)

    const points = [
      new THREE.Vector3(-0.5, -0.5, 0),
      new THREE.Vector3(0.5, -0.5, 0),
      new THREE.Vector3(0.5, 0.5, 0),
      new THREE.Vector3(-0.5, 0.5, 0),
    ].map((point) =>
      point.applyMatrix4(mesh.matrixWorld).project(camera))

    const xs = points.map(
      (point) => (point.x * 0.5 + 0.5) * size.width,
    )
    const ys = points.map(
      (point) => (-point.y * 0.5 + 0.5) * size.height,
    )
    const rect = gl.domElement.getBoundingClientRect()

    const left = rect.left + Math.min(...xs)
    const top = rect.top + Math.min(...ys)
    const right = rect.left + Math.max(...xs)
    const bottom = rect.top + Math.max(...ys)

    onOpen(
      object,
      new DOMRect(
        left,
        top,
        right - left,
        bottom - top,
      ),
    )
  }

  if (!texture) return null

  return (
    <>
      <mesh
        ref={meshRef}
        position={[object.x, object.y, object.z]}
        scale={scale}
        geometry={PLANE_GEOMETRY}
        visible={false}
        userData={{ bookmarkId: object.id }}
        onClick={open}
        onPointerOver={(event) => {
          event.stopPropagation()
          if (focusId) return
          setHovered(true)
          gl.domElement.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          if (!focusId) gl.domElement.style.cursor = 'grab'
        }}
      >
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      <mesh
        ref={semanticRef}
        position={[object.x, object.y, object.z]}
        scale={scale}
        geometry={PLANE_GEOMETRY}
        visible={false}
      >
        <meshBasicMaterial
          ref={semanticMaterialRef}
          map={texture}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </>
  )
}
