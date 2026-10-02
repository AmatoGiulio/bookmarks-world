import {
  KeyboardControls,
  useKeyboardControls,
} from '@react-three/drei'
import {
  Canvas,
  useFrame,
  useThree,
} from '@react-three/fiber'
import * as React from 'react'
import { buildBookmarkChunks, activeChunksAround } from './chunks'
import {
  CHUNK_SIZE,
  INITIAL_CAMERA_Z,
  KEYBOARD_SPEED,
  MAX_VELOCITY,
  VELOCITY_DECAY,
  VELOCITY_LERP,
} from './constants'
import {
  BookmarkPlane,
  type CameraGridState,
} from './BookmarkPlane'
import { ClusterPlane } from './ClusterPlane'
import { LensPass } from './LensPass'
import type { SpaceObject } from '../spaceTypes'

const KEYBOARD_MAP = [
  { name: 'forward', keys: ['w', 'W', 'ArrowUp'] },
  { name: 'backward', keys: ['s', 'S', 'ArrowDown'] },
  { name: 'left', keys: ['a', 'A', 'ArrowLeft'] },
  { name: 'right', keys: ['d', 'D', 'ArrowRight'] },
  { name: 'up', keys: ['e', 'E'] },
  { name: 'down', keys: ['q', 'Q'] },
]

type KeyboardKeys = {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  up: boolean
  down: boolean
}

type ControllerState = {
  velocity: { x: number; y: number; z: number }
  targetVel: { x: number; y: number; z: number }
  basePos: { x: number; y: number; z: number }
  drift: { x: number; y: number }
  mouse: { x: number; y: number }
  lastMouse: { x: number; y: number }
  scrollAccum: number
  isDragging: boolean
  lastTouches: Touch[]
  lastTouchDist: number
  lastChunkKey: string
}

type Props = {
  objects: SpaceObject[]
  query: string
  focusId: string | null
  onOpen: (object: SpaceObject, origin: DOMRect) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function touchDistance(touches: Touch[]) {
  if (touches.length < 2) return 0
  const [a, b] = touches
  if (!a || !b) return 0
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

function SceneController({
  objects,
  query,
  focusId,
  onOpen,
}: Props) {
  const { camera, gl } = useThree()
  const [, getKeys] = useKeyboardControls<keyof KeyboardKeys>()
  const chunks = React.useMemo(() => buildBookmarkChunks(objects), [objects])

  const controller = React.useRef<ControllerState>({
    velocity: { x: 0, y: 0, z: 0 },
    targetVel: { x: 0, y: 0, z: 0 },
    basePos: { x: 0, y: 0, z: INITIAL_CAMERA_Z },
    drift: { x: 0, y: 0 },
    mouse: { x: 0, y: 0 },
    lastMouse: { x: 0, y: 0 },
    scrollAccum: 0,
    isDragging: false,
    lastTouches: [],
    lastTouchDist: 0,
    lastChunkKey: '',
  })

  const cameraGridRef = React.useRef<CameraGridState>({
    cx: 0,
    cy: 0,
    cz: 0,
    camZ: INITIAL_CAMERA_Z,
  })

  const [activeChunks, setActiveChunks] = React.useState(() =>
    activeChunksAround(chunks, 0, 0, 0),
  )

  React.useEffect(() => {
    if (!focusId) return

    const state = controller.current
    state.velocity = { x: 0, y: 0, z: 0 }
    state.targetVel = { x: 0, y: 0, z: 0 }
    state.scrollAccum = 0
    state.isDragging = false
    gl.domElement.style.cursor = 'default'
  }, [focusId, gl])

  React.useEffect(() => {
    const canvas = gl.domElement
    const state = controller.current

    if (!focusId) canvas.style.cursor = 'grab'

    const onMouseDown = (event: MouseEvent) => {
      if (focusId) return
      state.isDragging = true
      state.lastMouse = {
        x: event.clientX,
        y: event.clientY,
      }
      canvas.style.cursor = 'grabbing'
    }

    const onMouseUp = () => {
      state.isDragging = false
      if (!focusId) canvas.style.cursor = 'grab'
    }

    const onMouseMove = (event: MouseEvent) => {
      state.mouse = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      }

      if (focusId || !state.isDragging) return

      state.targetVel.x -=
        (event.clientX - state.lastMouse.x) * 0.025
      state.targetVel.y +=
        (event.clientY - state.lastMouse.y) * 0.025

      state.lastMouse = {
        x: event.clientX,
        y: event.clientY,
      }
    }

    const onWheel = (event: WheelEvent) => {
      if (focusId) return
      event.preventDefault()
      state.scrollAccum += event.deltaY * 0.006
    }

    const onTouchStart = (event: TouchEvent) => {
      if (focusId) return
      event.preventDefault()
      state.lastTouches = Array.from(event.touches)
      state.lastTouchDist = touchDistance(state.lastTouches)
      canvas.style.cursor = 'grabbing'
    }

    const onTouchMove = (event: TouchEvent) => {
      if (focusId) return
      event.preventDefault()

      const touches = Array.from(event.touches)

      if (
        touches.length === 1 &&
        state.lastTouches.length >= 1
      ) {
        const touch = touches[0]
        const last = state.lastTouches[0]

        if (touch && last) {
          state.targetVel.x -=
            (touch.clientX - last.clientX) * 0.02
          state.targetVel.y +=
            (touch.clientY - last.clientY) * 0.02
        }
      } else if (
        touches.length === 2 &&
        state.lastTouchDist > 0
      ) {
        const distance = touchDistance(touches)
        state.scrollAccum +=
          (state.lastTouchDist - distance) * 0.006
        state.lastTouchDist = distance
      }

      state.lastTouches = touches
    }

    const onTouchEnd = (event: TouchEvent) => {
      state.lastTouches = Array.from(event.touches)
      state.lastTouchDist = touchDistance(state.lastTouches)
      if (!focusId) canvas.style.cursor = 'grab'
    }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('wheel', onWheel, {
      passive: false,
    })
    canvas.addEventListener('touchstart', onTouchStart, {
      passive: false,
    })
    canvas.addEventListener('touchmove', onTouchMove, {
      passive: false,
    })
    canvas.addEventListener('touchend', onTouchEnd, {
      passive: false,
    })

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [focusId, gl])

  useFrame(() => {
    const state = controller.current

    if (!focusId) {
      const {
        forward,
        backward,
        left,
        right,
        up,
        down,
      } = getKeys()

      if (forward) state.targetVel.z -= KEYBOARD_SPEED
      if (backward) state.targetVel.z += KEYBOARD_SPEED
      if (left) state.targetVel.x -= KEYBOARD_SPEED
      if (right) state.targetVel.x += KEYBOARD_SPEED
      if (down) state.targetVel.y -= KEYBOARD_SPEED
      if (up) state.targetVel.y += KEYBOARD_SPEED

      const isZooming = Math.abs(state.velocity.z) > 0.05
      const zoomFactor = clamp(state.basePos.z / 50, 0.3, 2)
      const driftAmount = 8 * zoomFactor
      const driftLerp = isZooming ? 0.2 : 0.12

      if (!state.isDragging) {
        state.drift.x = lerp(
          state.drift.x,
          state.mouse.x * driftAmount,
          driftLerp,
        )
        state.drift.y = lerp(
          state.drift.y,
          state.mouse.y * driftAmount,
          driftLerp,
        )
      }

      state.targetVel.z += state.scrollAccum
      state.scrollAccum *= 0.8

      state.targetVel.x = clamp(
        state.targetVel.x,
        -MAX_VELOCITY,
        MAX_VELOCITY,
      )
      state.targetVel.y = clamp(
        state.targetVel.y,
        -MAX_VELOCITY,
        MAX_VELOCITY,
      )
      state.targetVel.z = clamp(
        state.targetVel.z,
        -MAX_VELOCITY,
        MAX_VELOCITY,
      )

      state.velocity.x = lerp(
        state.velocity.x,
        state.targetVel.x,
        VELOCITY_LERP,
      )
      state.velocity.y = lerp(
        state.velocity.y,
        state.targetVel.y,
        VELOCITY_LERP,
      )
      state.velocity.z = lerp(
        state.velocity.z,
        state.targetVel.z,
        VELOCITY_LERP,
      )

      state.basePos.x += state.velocity.x
      state.basePos.y += state.velocity.y
      state.basePos.z += state.velocity.z

      state.targetVel.x *= VELOCITY_DECAY
      state.targetVel.y *= VELOCITY_DECAY
      state.targetVel.z *= VELOCITY_DECAY
    } else {
      state.drift.x = lerp(state.drift.x, 0, 0.12)
      state.drift.y = lerp(state.drift.y, 0, 0.12)
    }

    camera.position.set(
      state.basePos.x + state.drift.x,
      state.basePos.y + state.drift.y,
      state.basePos.z,
    )

    const cx = Math.floor(state.basePos.x / CHUNK_SIZE)
    const cy = Math.floor(state.basePos.y / CHUNK_SIZE)
    const cz = Math.floor(state.basePos.z / CHUNK_SIZE)

    cameraGridRef.current = {
      cx,
      cy,
      cz,
      camZ: state.basePos.z,
    }

    const chunkKey = `${cx},${cy},${cz}`

    if (chunkKey !== state.lastChunkKey) {
      state.lastChunkKey = chunkKey
      setActiveChunks(
        activeChunksAround(chunks, cx, cy, cz),
      )
    }
  })

  React.useEffect(() => {
    const state = controller.current

    state.basePos = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    }

    const cx = Math.floor(state.basePos.x / CHUNK_SIZE)
    const cy = Math.floor(state.basePos.y / CHUNK_SIZE)
    const cz = Math.floor(state.basePos.z / CHUNK_SIZE)

    state.lastChunkKey = `${cx},${cy},${cz}`
    setActiveChunks(
      activeChunksAround(chunks, cx, cy, cz),
    )
  }, [camera, chunks])

  return (
    <>
      {activeChunks.map((chunk) => (
        <React.Fragment key={chunk.key}>
          {chunk.objects.map((object) =>
            object.kind === 'cluster' ? (
              <ClusterPlane
                key={object.id}
                object={object}
                chunkCx={chunk.cx}
                chunkCy={chunk.cy}
                chunkCz={chunk.cz}
                focusId={focusId}
                cameraGridRef={cameraGridRef}
              />
            ) : (
              <BookmarkPlane
                key={object.id}
                object={object}
                chunkCx={chunk.cx}
                chunkCy={chunk.cy}
                chunkCz={chunk.cz}
                query={query}
                focusId={focusId}
                cameraGridRef={cameraGridRef}
                onOpen={onOpen}
              />
            ),
          )}
        </React.Fragment>
      ))}

      <LensPass
        objects={objects}
        disabled={focusId !== null}
      />
    </>
  )
}

export function InfiniteBookmarksCanvas(props: Props) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

  return (
    <KeyboardControls map={KEYBOARD_MAP}>
      <div className="edo-canvas">
        <Canvas
          camera={{
            position: [0, 0, INITIAL_CAMERA_Z],
            fov: 60,
            near: 1,
            far: 500,
          }}
          dpr={dpr}
          flat
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
          }}
        >
          <color attach="background" args={['#070706']} />
          <fog attach="fog" args={['#070706', 120, 320]} />
          <SceneController {...props} />
        </Canvas>
      </div>
    </KeyboardControls>
  )
}
