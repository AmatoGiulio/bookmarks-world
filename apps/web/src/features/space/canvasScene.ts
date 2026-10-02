import type {
  CanvasFrame,
  CameraState,
  SpatialPointer,
  ViewportState,
} from '@bookmarks/spatial-engine'
import { createChunkIndex } from './chunkIndex'
import { semanticScore } from './semantic'
import type { SpaceObject } from './spaceTypes'

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

type Scene = {
  render: (frame: CanvasFrame, query: string) => boolean
  hitTest: (worldX: number, worldY: number, query: string) => Hit | null
  toggleCluster: (now: number) => void
  setLensActive: (active: boolean) => void
  setPointer: (pointer: SpatialPointer, query: string) => boolean
  setFocusedId: (id: string | null) => void
}

type ImageRecord = {
  image: HTMLImageElement
  ready: boolean
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
  const pull = searching ? score * 0.22 : 0

  return {
    x: object.x - object.x * pull,
    y: object.y - object.y * pull,
    score,
    alpha: searching && score === 0 ? 0.1 : 1,
    scale: searching ? 0.9 + score * 0.18 : 1,
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
  const margin = 260 / camera.zoom

  return (
    x + object.width / 2 >= camera.x - halfW - margin &&
    x - object.width / 2 <= camera.x + halfW + margin &&
    y + object.height / 2 >= camera.y - halfH - margin &&
    y - object.height / 2 <= camera.y + halfH + margin
  )
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
  ctx.fill()
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  left: number,
  top: number,
  width: number,
  height: number,
) {
  const imageRatio = image.naturalWidth / Math.max(1, image.naturalHeight)
  const targetRatio = width / height

  let sourceWidth = image.naturalWidth
  let sourceHeight = image.naturalHeight
  let sourceX = 0
  let sourceY = 0

  if (imageRatio > targetRatio) {
    sourceWidth = image.naturalHeight * targetRatio
    sourceX = (image.naturalWidth - sourceWidth) / 2
  } else {
    sourceHeight = image.naturalWidth / targetRatio
    sourceY = (image.naturalHeight - sourceHeight) / 2
  }

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    left,
    top,
    width,
    height,
  )
}

export function createCanvasScene(
  objects: SpaceObject[],
  invalidate: () => void,
): Scene {
  const index = createChunkIndex(objects)
  const imageCache = new Map<string, ImageRecord>()

  let focusedId: string | null = null
  let clusterProgress = 0
  let clusterTarget = 0
  let clusterLastNow = 0
  let lensActive = false
  let lensPointer: SpatialPointer | null = null
  let lensFocus: SpaceObject | null = null

  const getImage = (src: string) => {
    const cached = imageCache.get(src)
    if (cached) return cached.ready ? cached.image : null

    const image = new Image()
    const record: ImageRecord = { image, ready: false }
    imageCache.set(src, record)
    image.decoding = 'async'
    image.onload = () => {
      record.ready = true
      invalidate()
    }
    image.onerror = () => imageCache.delete(src)
    image.src = src
    return null
  }

  const queryCandidates = (
    camera: Readonly<CameraState>,
    viewport: Readonly<ViewportState>,
    query: string,
  ) => {
    const candidates = index.query(camera, viewport, 520)

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
    ctx.globalAlpha = alpha * (1 - clusterProgress * 0.3)

    for (let index = 4; index >= 0; index -= 1) {
      const offset = index * 7
      ctx.fillStyle = `hsl(${34 + index * 22} 12% ${18 + index * 4}%)`
      fillRoundedRect(ctx, left + offset, top - offset, width * 0.58, height * 0.45, 3)
    }

    ctx.restore()

    if (clusterProgress <= 0.001) return

    for (let index = 0; index < CLUSTER_CARDS.length; index += 1) {
      const stagger = index * 0.045
      const local = easeInOutCubic(
        clamp01((clusterProgress - stagger) / (1 - stagger)),
      )

      const targetX = x + 220 + (index % 2) * 34
      const targetY = y + (index - 2) * 112
      const controlAX = x + 54
      const controlAY = y - (targetY - y) * 0.095
      const controlBX = targetX - 88
      const controlBY = targetY - 18

      const cardX = cubicBezier(x, controlAX, controlBX, targetX, local)
      const cardY = cubicBezier(y, controlAY, controlBY, targetY, local)
      const cardScale = 0.72 + local * 0.28
      const cardW = 156 * cardScale
      const cardH = 94 * cardScale

      ctx.save()
      ctx.globalAlpha = alpha * local
      ctx.fillStyle = `hsl(${34 + index * 24} 12% ${20 + index * 5}%)`
      fillRoundedRect(
        ctx,
        cardX - cardW / 2,
        cardY - cardH / 2,
        cardW,
        cardH,
        4,
      )

      if (cardW * zoom > 82) {
        ctx.fillStyle = 'rgba(255,255,255,.78)'
        ctx.font = `600 ${10 / zoom}px system-ui`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(
          CLUSTER_CARDS[index],
          cardX - cardW / 2 + 12 / zoom,
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
    if (object.id === focusedId) return

    const width = object.width * scale
    const height = object.height * scale
    const left = x - width / 2
    const top = y - height / 2
    const projectedWidth = width * zoom
    const finalAlpha = alpha * relationAlpha

    if (finalAlpha <= 0.01) return

    ctx.save()
    ctx.globalAlpha = finalAlpha
    ctx.fillStyle = object.accent ?? '#e9e7e0'

    if (object.kind === 'cluster') {
      drawCluster(ctx, object, x, y, width, height, zoom, finalAlpha)
      ctx.restore()
      return
    }

    if (object.kind === 'audio') {
      ctx.beginPath()
      ctx.arc(x, y, Math.min(width, height) / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      fillRoundedRect(
        ctx,
        left,
        top,
        width,
        height,
        object.kind === 'video' ? 6 : 3,
      )
    }

    if (object.image && projectedWidth >= 48) {
      const image = getImage(object.image)
      if (image) {
        ctx.save()
        if (object.kind === 'audio') {
          ctx.beginPath()
          ctx.arc(x, y, Math.min(width, height) / 2, 0, Math.PI * 2)
        } else {
          ctx.beginPath()
          ctx.roundRect(left, top, width, height, object.kind === 'video' ? 6 : 3)
        }
        ctx.clip()
        drawImageCover(ctx, image, left, top, width, height)
        ctx.restore()
      }
    }

    if (object.kind === 'paper' && projectedWidth > 115) {
      ctx.strokeStyle = 'rgba(15,15,15,.18)'
      ctx.lineWidth = 1 / zoom
      for (let row = 0; row < 4; row += 1) {
        const yy = top + height - 34 - row * 18
        ctx.beginPath()
        ctx.moveTo(left + 22, yy)
        ctx.lineTo(left + width * (row === 2 ? 0.62 : 0.86), yy)
        ctx.stroke()
      }
    }

    if (object.kind === 'repo' && projectedWidth > 90) {
      ctx.fillStyle = 'rgba(255,255,255,.78)'
      ctx.font = `${32 / zoom}px ui-monospace, monospace`
      ctx.fillText('{ }', left + 20, top + 46 / zoom)
    }

    if (object.kind === 'video' && projectedWidth > 100) {
      ctx.fillStyle = 'rgba(0,0,0,.42)'
      ctx.beginPath()
      ctx.arc(x, y, 22 / zoom, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,.9)'
      ctx.font = `${13 / zoom}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('▶', x + 1 / zoom, y)
    }

    if (projectedWidth > 82) {
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillStyle = 'rgba(248,247,243,.92)'
      ctx.font = `600 ${11 / zoom}px system-ui`
      ctx.fillText(object.title, left, top + height + 10 / zoom)

      if (projectedWidth > 170) {
        ctx.fillStyle = 'rgba(248,247,243,.42)'
        ctx.font = `${9 / zoom}px system-ui`
        ctx.fillText(object.subtitle, left, top + height + 26 / zoom)
      }
    }

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
        ? 0.08 + relationScore(relationFocus, object) * 0.92
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

  const renderLens = (frame: CanvasFrame, query: string) => {
    if (!lensActive || !lensPointer) return

    const { ctx } = frame
    const size = 210
    const left = lensPointer.screenX - size / 2
    const top = lensPointer.screenY - size / 2

    ctx.save()
    ctx.beginPath()
    ctx.roundRect(left, top, size, size, 22)
    ctx.clip()
    ctx.fillStyle = 'rgba(228,225,215,.07)'
    ctx.fillRect(left, top, size, size)
    drawWorld(frame, query, lensFocus)
    ctx.restore()

    ctx.save()
    ctx.strokeStyle = 'rgba(248,247,243,.34)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(left + 0.5, top + 0.5, size - 1, size - 1, 22)
    ctx.stroke()

    ctx.fillStyle = 'rgba(8,8,8,.68)'
    ctx.fillRect(left + 12, top + size - 47, size - 24, 35)
    ctx.fillStyle = 'rgba(255,255,255,.9)'
    ctx.font = '600 10px system-ui'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(lensFocus?.title ?? 'semantic lens', left + 20, top + size - 40)
    ctx.fillStyle = 'rgba(255,255,255,.48)'
    ctx.font = '9px system-ui'
    ctx.fillText(
      lensFocus?.tags.slice(0, 3).join(' · ') ?? 'move across the space',
      left + 20,
      top + size - 25,
    )
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

  return {
    render: (frame, query) => {
      const dt = clusterLastNow === 0 ? 16.67 : Math.min(40, frame.now - clusterLastNow)
      clusterLastNow = frame.now

      const clusterDelta = clusterTarget - clusterProgress
      const clusterAnimating = Math.abs(clusterDelta) > 0.001
      if (clusterAnimating) {
        const response = 1 - Math.exp(-dt / 115)
        clusterProgress += clusterDelta * response
      } else {
        clusterProgress = clusterTarget
      }

      frame.ctx.fillStyle = '#080808'
      frame.ctx.fillRect(0, 0, frame.viewport.width, frame.viewport.height)

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
      if (!lensActive) return false
      lensFocus = hitTest(pointer.worldX, pointer.worldY, query)?.object ?? null
      return true
    },

    setFocusedId: (id) => {
      focusedId = id
    },
  }
}
