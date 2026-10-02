import type {
  CanvasFrame,
  CameraState,
  SpatialPointer,
  ViewportState,
} from '@bookmarks/spatial-engine'
import { createChunkIndex } from './chunkIndex'
import { createImageCache } from './imageCache'
import { semanticScore } from './semantic'
import type { SpaceObject } from './spaceTypes'
import { drawSpaceObject } from './surfaceRenderers'

const CLUSTER_CARDS = [
  'Data Mountain',
  'Pad++',
  'Piles',
  'Magic Lens',
  'Chameleon',
]

type Hit = {
  object: SpaceObject
  x: number
  y: number
  width: number
  height: number
}

type PointerState = {
  needsRender: boolean
  hovering: boolean
}

type Scene = {
  render: (frame: CanvasFrame, query: string) => boolean
  hitTest: (worldX: number, worldY: number, query: string) => Hit | null
  toggleCluster: (now: number) => void
  setLensActive: (active: boolean) => void
  setPointer: (pointer: SpatialPointer, query: string) => PointerState
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function cubicBezier(
  start: number,
  controlA: number,
  controlB: number,
  end: number,
  t: number,
) {
  const inv = 1 - t
  return (
    inv * inv * inv * start +
    3 * inv * inv * t * controlA +
    3 * inv * t * t * controlB +
    t * t * t * end
  )
}

function relationScore(a: SpaceObject, b: SpaceObject) {
  if (a.id === b.id) return 1
  const tags = new Set(a.tags)
  const shared = b.tags.filter((tag) => tags.has(tag)).length
  if (shared === 0) return 0
  return shared / Math.max(a.tags.length, b.tags.length)
}

function renderPosition(object: SpaceObject, query: string) {
  const score = semanticScore(object, query)
  const searching = query.trim().length > 0
  const pull = searching ? score * 0.14 : 0

  return {
    x: object.x - object.x * pull,
    y: object.y - object.y * pull,
    alpha: searching && score === 0 ? 0.08 : 1,
    scale: searching ? 0.94 + score * 0.13 : 1,
  }
}

function isVisible(
  object: SpaceObject,
  x: number,
  y: number,
  camera: Readonly<CameraState>,
  viewport: Readonly<ViewportState>,
) {
  const halfW = viewport.width / camera.zoom / 2
  const halfH = viewport.height / camera.zoom / 2
  const margin = 340 / camera.zoom

  return (
    x + object.width / 2 >= camera.x - halfW - margin &&
    x - object.width / 2 <= camera.x + halfW + margin &&
    y + object.height / 2 >= camera.y - halfH - margin &&
    y - object.height / 2 <= camera.y + halfH + margin
  )
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.roundRect(left, top, width, height, radius)
  ctx.fill()
}

export function createCanvasScene(
  objects: SpaceObject[],
  invalidate: () => void,
): Scene {
  const index = createChunkIndex(objects)
  const images = createImageCache(invalidate)

  let clusterProgress = 0
  let clusterTarget = 0
  let clusterLastNow = 0
  let hoveredId: string | null = null
  let lensActive = false
  let lensPointer: SpatialPointer | null = null
  let lensFocus: SpaceObject | null = null

  const queryCandidates = (
    camera: Readonly<CameraState>,
    viewport: Readonly<ViewportState>,
    query: string,
  ) => {
    const candidates = index.query(camera, viewport, 620)

    if (!query.trim()) return candidates

    const ids = new Set(candidates.map((object) => object.id))
    for (const object of objects) {
      if (semanticScore(object, query) > 0 && !ids.has(object.id)) {
        candidates.push(object)
      }
    }

    return candidates
  }

  const drawCluster = (
    ctx: CanvasRenderingContext2D,
    object: SpaceObject,
    x: number,
    y: number,
    width: number,
    height: number,
    zoom: number,
    alpha: number,
  ) => {
    const left = x - width / 2
    const top = y - height / 2

    ctx.save()
    ctx.globalAlpha = alpha

    for (let index = 4; index >= 0; index -= 1) {
      const offset = index * 8
      ctx.fillStyle = ['#ece7dc', '#34312c', '#91856f', '#171715', '#d1c9b8'][index]
      fillRoundedRect(
        ctx,
        left + offset,
        top - offset,
        width * 0.65,
        height * 0.53,
        4,
      )
    }

    if (width * zoom > 135 && clusterProgress < 0.65) {
      ctx.fillStyle = 'rgba(255,255,255,.9)'
      ctx.font = `600 ${16 / zoom}px system-ui`
      ctx.textBaseline = 'bottom'
      ctx.fillText(
        object.title,
        left + 18 / zoom,
        top + height * 0.53 - 28 / zoom,
      )
      ctx.fillStyle = 'rgba(255,255,255,.42)'
      ctx.font = `${9 / zoom}px system-ui`
      ctx.fillText(
        object.subtitle,
        left + 18 / zoom,
        top + height * 0.53 - 11 / zoom,
      )
    }

    ctx.restore()

    if (clusterProgress <= 0.001) return

    for (let index = 0; index < CLUSTER_CARDS.length; index += 1) {
      const stagger = index * 0.04
      const local = easeInOutCubic(
        clamp01((clusterProgress - stagger) / (1 - stagger)),
      )

      const targetX = x + 315 + (index % 2) * 36
      const targetY = y + (index - 2) * 124
      const waypointX = targetX * 0.95 + x * 0.05
      const waypointY = y - (targetY - y) * 0.095

      const cardX = cubicBezier(x, waypointX, targetX - 74, targetX, local)
      const cardY = cubicBezier(y, waypointY, targetY - 20, targetY, local)
      const cardScale = 0.74 + local * 0.26
      const cardW = 188 * cardScale
      const cardH = 112 * cardScale

      ctx.save()
      ctx.globalAlpha = alpha * local
      ctx.fillStyle = ['#e9e3d7', '#252421', '#b6a98d', '#111110', '#d9d2c3'][index]
      fillRoundedRect(
        ctx,
        cardX - cardW / 2,
        cardY - cardH / 2,
        cardW,
        cardH,
        4,
      )

      if (cardW * zoom > 95) {
        ctx.fillStyle = index === 1 || index === 3
          ? 'rgba(255,255,255,.84)'
          : 'rgba(18,18,16,.8)'
        ctx.font = `600 ${10 / zoom}px system-ui`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(
          CLUSTER_CARDS[index],
          cardX - cardW / 2 + 13 / zoom,
          cardY,
        )
      }

      ctx.restore()
    }
  }

  const drawObject = (
    ctx: CanvasRenderingContext2D,
    object: SpaceObject,
    x: number,
    y: number,
    alpha: number,
    scale: number,
    zoom: number,
    relationAlpha = 1,
  ) => {
    const hoverScale = hoveredId === object.id ? 1.025 : 1
    const width = object.width * scale * hoverScale
    const height = object.height * scale * hoverScale
    const left = x - width / 2
    const top = y - height / 2
    const finalAlpha = alpha * relationAlpha

    if (finalAlpha <= 0.01) return

    ctx.save()
    ctx.globalAlpha = finalAlpha

    if (object.kind === 'cluster') {
      drawCluster(ctx, object, x, y, width, height, zoom, finalAlpha)
      ctx.restore()
      return
    }

    const image = object.image ? images.get(object.image) : null

    drawSpaceObject({
      ctx,
      object,
      bounds: { left, top, width, height, x, y },
      zoom,
      image,
      hovered: hoveredId === object.id,
    })

    ctx.restore()
  }

  const drawWorld = (
    frame: CanvasFrame,
    query: string,
    relationFocus: SpaceObject | null = null,
  ) => {
    const { ctx, camera, viewport } = frame
    const tx = viewport.width * 0.5 - camera.x * camera.zoom
    const ty = viewport.height * 0.5 - camera.y * camera.zoom

    ctx.save()
    ctx.translate(tx, ty)
    ctx.scale(camera.zoom, camera.zoom)

    const candidates = queryCandidates(camera, viewport, query)

    for (const object of candidates) {
      const state = renderPosition(object, query)
      if (!isVisible(object, state.x, state.y, camera, viewport)) continue

      const related = relationFocus
        ? 0.07 + relationScore(relationFocus, object) * 0.93
        : 1

      drawObject(
        ctx,
        object,
        state.x,
        state.y,
        state.alpha,
        state.scale,
        camera.zoom,
        related,
      )
    }

    ctx.restore()
  }

  const hitTest = (worldX: number, worldY: number, query: string) => {
    for (let index = objects.length - 1; index >= 0; index -= 1) {
      const object = objects[index]
      const state = renderPosition(object, query)
      const width = object.width * state.scale
      const height = object.height * state.scale

      if (
        worldX >= state.x - width / 2 &&
        worldX <= state.x + width / 2 &&
        worldY >= state.y - height / 2 &&
        worldY <= state.y + height / 2
      ) {
        return { object, x: state.x, y: state.y, width, height }
      }
    }

    return null
  }

  const renderLens = (frame: CanvasFrame, query: string) => {
    if (!lensActive || !lensPointer) return

    const { ctx } = frame
    const size = 224
    const left = lensPointer.screenX - size / 2
    const top = lensPointer.screenY - size / 2

    ctx.save()
    ctx.beginPath()
    ctx.roundRect(left, top, size, size, 24)
    ctx.clip()
    ctx.fillStyle = 'rgba(232,228,216,.055)'
    ctx.fillRect(left, top, size, size)
    drawWorld(frame, query, lensFocus)
    ctx.restore()

    ctx.save()
    ctx.strokeStyle = 'rgba(248,247,243,.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(left + 0.5, top + 0.5, size - 1, size - 1, 24)
    ctx.stroke()

    ctx.fillStyle = 'rgba(8,8,8,.74)'
    fillRoundedRect(ctx, left + 12, top + size - 52, size - 24, 40, 9)

    ctx.fillStyle = 'rgba(255,255,255,.92)'
    ctx.font = '600 10px system-ui'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(
      lensFocus?.title ?? 'semantic lens',
      left + 20,
      top + size - 44,
    )

    ctx.fillStyle = 'rgba(255,255,255,.46)'
    ctx.font = '9px system-ui'
    ctx.fillText(
      lensFocus?.tags.slice(0, 3).join(' · ') ?? 'move across the space',
      left + 20,
      top + size - 27,
    )
    ctx.restore()
  }

  return {
    render: (frame, query) => {
      const dt = clusterLastNow === 0
        ? 16.67
        : Math.min(40, frame.now - clusterLastNow)
      clusterLastNow = frame.now

      const delta = clusterTarget - clusterProgress
      const clusterAnimating = Math.abs(delta) > 0.001

      if (clusterAnimating) {
        const response = 1 - Math.exp(-dt / 115)
        clusterProgress += delta * response
      } else {
        clusterProgress = clusterTarget
      }

      frame.ctx.fillStyle = '#070706'
      frame.ctx.fillRect(
        0,
        0,
        frame.viewport.width,
        frame.viewport.height,
      )

      drawWorld(frame, query)
      renderLens(frame, query)

      return clusterAnimating
    },

    hitTest,

    toggleCluster: (now) => {
      clusterTarget = clusterTarget > 0.5 ? 0 : 1
      clusterLastNow = now
    },

    setLensActive: (active) => {
      lensActive = active
      if (!active) lensFocus = null
    },

    setPointer: (pointer, query) => {
      lensPointer = pointer

      const nextHovered = hitTest(
        pointer.worldX,
        pointer.worldY,
        query,
      )?.object.id ?? null

      const changed = nextHovered !== hoveredId
      hoveredId = nextHovered

      if (lensActive) {
        lensFocus = hitTest(
          pointer.worldX,
          pointer.worldY,
          query,
        )?.object ?? null
      }

      return {
        needsRender: changed || lensActive,
        hovering: hoveredId !== null,
      }
    },
  }
}
