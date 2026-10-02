import type { CanvasFrame, CameraState, ViewportState } from '@bookmarks/spatial-engine'
import { semanticScore } from './semantic'
import type { SpaceObject } from './spaceTypes'

type RenderInput = {
  frame: CanvasFrame
  objects: SpaceObject[]
  query: string
}

function renderPosition(object: SpaceObject, query: string) {
  const score = semanticScore(object, query)
  const searching = query.trim().length > 0
  const pull = searching ? score * 0.22 : 0

  return {
    x: object.x - object.x * pull,
    y: object.y - object.y * pull,
    score,
    alpha: searching && score === 0 ? 0.12 : 1,
    scale: searching ? 0.9 + score * 0.18 : 1,
  }
}

function visible(
  object: SpaceObject,
  x: number,
  y: number,
  camera: Readonly<CameraState>,
  viewport: Readonly<ViewportState>,
) {
  const halfW = viewport.width / camera.zoom / 2
  const halfH = viewport.height / camera.zoom / 2
  const margin = 240 / camera.zoom

  return (
    x + object.width / 2 >= camera.x - halfW - margin &&
    x - object.width / 2 <= camera.x + halfW + margin &&
    y + object.height / 2 >= camera.y - halfH - margin &&
    y - object.height / 2 <= camera.y + halfH + margin
  )
}

function roundedRect(
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

function drawObject(
  ctx: CanvasRenderingContext2D,
  object: SpaceObject,
  x: number,
  y: number,
  alpha: number,
  scale: number,
  zoom: number,
) {
  const width = object.width * scale
  const height = object.height * scale
  const left = x - width / 2
  const top = y - height / 2
  const projectedWidth = width * zoom

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = object.accent ?? '#e9e7e0'

  if (object.kind === 'audio') {
    ctx.beginPath()
    ctx.arc(x, y, Math.min(width, height) / 2, 0, Math.PI * 2)
    ctx.fill()
  } else if (object.kind === 'cluster') {
    for (let index = 4; index >= 0; index -= 1) {
      const offset = index * 7
      ctx.fillStyle = `hsl(${34 + index * 22} 12% ${18 + index * 4}%)`
      roundedRect(ctx, left + offset, top - offset, width * 0.58, height * 0.45, 3)
    }
  } else {
    roundedRect(ctx, left, top, width, height, object.kind === 'video' ? 6 : 3)
  }

  if (object.kind === 'paper' && projectedWidth > 90) {
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

  if (object.kind === 'repo' && projectedWidth > 80) {
    ctx.fillStyle = 'rgba(255,255,255,.78)'
    ctx.font = `${32 / zoom}px ui-monospace, monospace`
    ctx.fillText('{ }', left + 20, top + 46 / zoom)
  }

  if (object.kind === 'video' && projectedWidth > 90) {
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

  if (projectedWidth > 78) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(248,247,243,.92)'
    ctx.font = `600 ${11 / zoom}px system-ui`
    ctx.fillText(object.title, left, top + height + 10 / zoom)

    if (projectedWidth > 150) {
      ctx.fillStyle = 'rgba(248,247,243,.42)'
      ctx.font = `${9 / zoom}px system-ui`
      ctx.fillText(object.subtitle, left, top + height + 26 / zoom)
    }
  }

  ctx.restore()
}

export function renderSpaceScene({ frame, objects, query }: RenderInput) {
  const { ctx, camera, viewport } = frame

  ctx.fillStyle = '#080808'
  ctx.fillRect(0, 0, viewport.width, viewport.height)

  const tx = viewport.width * 0.5 - camera.x * camera.zoom
  const ty = viewport.height * 0.5 - camera.y * camera.zoom

  ctx.save()
  ctx.translate(tx, ty)
  ctx.scale(camera.zoom, camera.zoom)

  for (const object of objects) {
    const state = renderPosition(object, query)
    if (!visible(object, state.x, state.y, camera, viewport)) continue
    drawObject(
      ctx,
      object,
      state.x,
      state.y,
      state.alpha,
      state.scale,
      camera.zoom,
    )
  }

  ctx.restore()
}

export function hitTestSpaceObject(
  worldX: number,
  worldY: number,
  objects: SpaceObject[],
  query: string,
) {
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
