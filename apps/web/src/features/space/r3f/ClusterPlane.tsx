import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as React from 'react'
import * as THREE from 'three'
import type { SpaceObject } from '../spaceTypes'
import type { CameraGridState } from './BookmarkPlane'
import {
  CHUNK_FADE_MARGIN,
  DEPTH_FADE_END,
  DEPTH_FADE_START,
  INVIS_THRESHOLD,
  RENDER_DISTANCE,
} from './constants'
import { getBookmarkTexture } from './textureManager'

const PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1)

const ITEMS = [
  ['Data Mountain', '#e7e0d4'],
  ['Pad++', '#252421'],
  ['Piles', '#a7997d'],
  ['Magic Lens', '#121210'],
  ['Chameleon', '#d9d1c0'],
] as const

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function ease(value: number) {
  const t = clamp01(value)
  return 1 - Math.pow(1 - t, 3)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function createCardTexture(title: string, fill: string, index: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 380

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable for cluster texture')

  ctx.fillStyle = fill
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const dark = index === 1 || index === 3

  ctx.fillStyle = dark
    ? 'rgba(255,255,255,.42)'
    : 'rgba(12,12,11,.42)'
  ctx.font = '600 20px ui-monospace, monospace'
  ctx.fillText(`0${index + 1} / SPATIAL`, 34, 44)

  ctx.fillStyle = dark ? '#f3f0e8' : '#171613'
  ctx.font = '600 42px system-ui'
  ctx.fillText(title, 34, 196)

  ctx.fillStyle = dark
    ? 'rgba(255,255,255,.35)'
    : 'rgba(12,12,11,.34)'
  ctx.font = '22px system-ui'
  ctx.fillText('reference', 34, 238)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4

  return texture
}

type Props = {
  object: SpaceObject
  chunkCx: number
  chunkCy: number
  chunkCz: number
  focusId: string | null
  cameraGridRef: React.RefObject<CameraGridState>
}

export function ClusterPlane({
  object,
  chunkCx,
  chunkCy,
  chunkCz,
  focusId,
  cameraGridRef,
}: Props) {
  const groupRef = React.useRef<THREE.Group>(null)
  const baseRef = React.useRef<THREE.Mesh>(null)
  const baseMaterialRef = React.useRef<THREE.MeshBasicMaterial>(null)
  const itemRefs = React.useRef<Array<THREE.Mesh | null>>([])
  const itemMaterialRefs =
    React.useRef<Array<THREE.MeshBasicMaterial | null>>([])

  const { gl } = useThree()
  const [expanded, setExpanded] = React.useState(false)
  const [texture, setTexture] = React.useState<THREE.Texture | null>(null)

  const animation = React.useRef({
    progress: 0,
    opacity: 0,
    scale: 1,
  })

  const baseScale = React.useMemo(() => {
    const aspect = object.width / Math.max(1, object.height)
    const height = 13 + (object.priority ?? 1) * 2.3
    return new THREE.Vector3(height * aspect, height, 1)
  }, [object.height, object.priority, object.width])

  const itemTextures = React.useMemo(
    () =>
      ITEMS.map(([title, fill], index) =>
        createCardTexture(title, fill, index)),
    [],
  )

  React.useEffect(() => {
    const loaded = getBookmarkTexture(object, setTexture)
    setTexture(loaded)

    return () => {
      itemTextures.forEach((itemTexture) => itemTexture.dispose())
    }
  }, [itemTextures, object])

  React.useEffect(() => {
    baseRef.current?.layers.enable(1)
    itemRefs.current.forEach((mesh) => mesh?.layers.enable(1))
  }, [texture])

  useFrame((_, delta) => {
    const group = groupRef.current
    const base = baseRef.current
    const material = baseMaterialRef.current

    if (!group || !base || !material || !texture) return

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

    const targetOpacity =
      Math.min(gridFade, depthFade * depthFade) *
      (focusId ? 0.075 : 1)

    animation.current.opacity = lerp(
      animation.current.opacity,
      targetOpacity,
      focusId ? 0.14 : 0.18,
    )

    const targetProgress = expanded && !focusId ? 1 : 0
    const response = 1 - Math.exp(-delta * 6.2)

    animation.current.progress +=
      (targetProgress - animation.current.progress) * response

    animation.current.scale = lerp(
      animation.current.scale,
      focusId ? 0.82 : 1,
      0.1,
    )

    group.scale.setScalar(animation.current.scale)

    material.opacity = animation.current.opacity
    material.depthWrite = animation.current.opacity > 0.99
    base.visible = animation.current.opacity > INVIS_THRESHOLD
    base.scale.set(
      baseScale.x * (1 - animation.current.progress * 0.13),
      baseScale.y * (1 - animation.current.progress * 0.13),
      1,
    )

    itemRefs.current.forEach((mesh, index) => {
      const itemMaterial = itemMaterialRefs.current[index]
      if (!mesh || !itemMaterial) return

      const stagger = index * 0.065
      const local = ease(
        (animation.current.progress - stagger) /
          Math.max(0.001, 1 - stagger),
      )

      const targetX = 22 + (index % 2) * 5
      const targetY = (2 - index) * 11.2
      const arc = Math.sin(local * Math.PI) * (3.8 + index * 0.55)
      const targetZ = 3.2 + index * 1.2

      mesh.position.set(
        lerp(0, targetX, local),
        lerp(0, targetY, local) + arc,
        lerp(-0.3 * index, targetZ, local),
      )

      const itemScale = 0.72 + local * 0.28
      mesh.scale.set(12.6 * itemScale, 7.5 * itemScale, 1)

      itemMaterial.opacity =
        animation.current.opacity * local * 0.98
      itemMaterial.depthWrite = itemMaterial.opacity > 0.99
      mesh.visible = itemMaterial.opacity > INVIS_THRESHOLD
    })
  })

  const toggle = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (focusId) return
    setExpanded((value) => !value)
  }

  if (!texture) return null

  return (
    <group
      ref={groupRef}
      position={[object.x, object.y, object.z]}
      onClick={toggle}
      onPointerOver={(event) => {
        event.stopPropagation()
        if (!focusId) gl.domElement.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        if (!focusId) gl.domElement.style.cursor = 'grab'
      }}
    >
      <mesh
        ref={baseRef}
        geometry={PLANE_GEOMETRY}
        scale={baseScale}
        userData={{ bookmarkId: object.id }}
      >
        <meshBasicMaterial
          ref={baseMaterialRef}
          map={texture}
          transparent
          opacity={0}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {itemTextures.map((itemTexture, index) => (
        <mesh
          key={ITEMS[index][0]}
          ref={(node) => {
            itemRefs.current[index] = node
          }}
          geometry={PLANE_GEOMETRY}
          visible={false}
        >
          <meshBasicMaterial
            ref={(node) => {
              itemMaterialRefs.current[index] = node
            }}
            map={itemTexture}
            transparent
            opacity={0}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
