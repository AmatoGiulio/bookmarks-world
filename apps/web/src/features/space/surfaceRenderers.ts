import type { SpaceObject } from './spaceTypes'

type Bounds = {
  left: number
  top: number
  width: number
  height: number
  x: number
  y: number
}

type RenderArgs = {
  ctx: CanvasRenderingContext2D
  object: SpaceObject
  bounds: Bounds
  zoom: number
  image: HTMLImageElement | null
  hovered: boolean
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

  let sw = image.naturalWidth
  let sh = image.naturalHeight
  let sx = 0
  let sy = 0

  if (imageRatio > targetRatio) {
    sw = image.naturalHeight * targetRatio
    sx = (image.naturalWidth - sw) / 2
  } else {
    sh = image.naturalWidth / targetRatio
    sy = (image.naturalHeight - sh) / 2
  }

  ctx.drawImage(image, sx, sy, sw, sh, left, top, width, height)
}

function clipSurface(
  ctx: CanvasRenderingContext2D,
  bounds: Bounds,
  radius: number,
) {
  ctx.beginPath()
  ctx.roundRect(
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    radius,
  )
  ctx.clip()
}

function drawMedia(
  ctx: CanvasRenderingContext2D,
  object: SpaceObject,
  bounds: Bounds,
  image: HTMLImageElement | null,
) {
  ctx.fillStyle = object.accent ?? '#d9d5ca'
  fillRoundedRect(ctx, bounds.left, bounds.top, bounds.width, bounds.height, 5)

  if (!image) return

  ctx.save()
  clipSurface(ctx, bounds, 5)
  drawImageCover(
    ctx,
    image,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
  )
  ctx.restore()
}

function drawEditorial(
  ctx: CanvasRenderingContext2D,
  object: SpaceObject,
  bounds: Bounds,
  image: HTMLImageElement | null,
  projectedWidth: number,
  zoom: number,
) {
  if (image) {
    drawMedia(ctx, object, bounds, image)

    if (projectedWidth > 180) {
      const gradient = ctx.createLinearGradient(
        0,
        bounds.top + bounds.height * 0.42,
        0,
        bounds.top + bounds.height,
      )
      gradient.addColorStop(0, 'rgba(0,0,0,0)')
      gradient.addColorStop(1, 'rgba(0,0,0,.72)')

      ctx.save()
      clipSurface(ctx, bounds, 5)
      ctx.fillStyle = gradient
      ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height)
      ctx.restore()

      ctx.fillStyle = 'rgba(255,255,255,.95)'
      ctx.font = `600 ${17 / zoom}px system-ui`
      ctx.textBaseline = 'bottom'
      ctx.fillText(
        object.title,
        bounds.left + 20 / zoom,
        bounds.top + bounds.height - 38 / zoom,
        bounds.width - 40 / zoom,
      )

      ctx.fillStyle = 'rgba(255,255,255,.58)'
      ctx.font = `${9 / zoom}px system-ui`
      ctx.fillText(
        object.source ?? object.subtitle,
        bounds.left + 20 / zoom,
        bounds.top + bounds.height - 19 / zoom,
      )
    }

    return
  }

  ctx.fillStyle = object.accent ?? '#efede7'
  fillRoundedRect(ctx, bounds.left, bounds.top, bounds.width, bounds.height, 4)

  if (projectedWidth < 90) return

  ctx.fillStyle = '#151513'
  ctx.textBaseline = 'top'
  ctx.font = `500 ${24 / zoom}px system-ui`
  ctx.fillText(
    object.title,
    bounds.left + 24 / zoom,
    bounds.top + 28 / zoom,
    bounds.width - 48 / zoom,
  )

  if (projectedWidth > 190) {
    ctx.fillStyle = 'rgba(21,21,19,.48)'
    ctx.font = `${9 / zoom}px system-ui`
    ctx.fillText(
      object.subtitle,
      bounds.left + 24 / zoom,
      bounds.top + bounds.height - 34 / zoom,
    )
  }
}

function drawPaper(
  ctx: CanvasRenderingContext2D,
  object: SpaceObject,
  bounds: Bounds,
  projectedWidth: number,
  zoom: number,
) {
  ctx.fillStyle = object.accent ?? '#d7d4ca'
  fillRoundedRect(ctx, bounds.left, bounds.top, bounds.width, bounds.height, 2)

  if (projectedWidth < 70) return

  ctx.fillStyle = 'rgba(17,17,15,.42)'
  ctx.font = `600 ${8 / zoom}px ui-monospace, monospace`
  ctx.textBaseline = 'top'
  ctx.fillText(
    (object.source ?? 'RESEARCH').toUpperCase(),
    bounds.left + 22 / zoom,
    bounds.top + 22 / zoom,
  )

  ctx.fillStyle = '#11110f'
  ctx.font = `600 ${20 / zoom}px system-ui`
  ctx.fillText(
    object.title,
    bounds.left + 22 / zoom,
    bounds.top + 52 / zoom,
    bounds.width - 44 / zoom,
  )

  if (projectedWidth > 165) {
    ctx.fillStyle = 'rgba(17,17,15,.5)'
    ctx.font = `${9 / zoom}px system-ui`
    ctx.fillText(
      object.subtitle,
      bounds.left + 22 / zoom,
      bounds.top + 92 / zoom,
      bounds.width - 44 / zoom,
    )

    ctx.strokeStyle = 'rgba(17,17,15,.15)'
    ctx.lineWidth = 1 / zoom

    for (let index = 0; index < 5; index += 1) {
      const y = bounds.top + bounds.height - (28 + index * 18) / zoom
      ctx.beginPath()
      ctx.moveTo(bounds.left + 22 / zoom, y)
      ctx.lineTo(
        bounds.left + bounds.width - (28 + (index % 2) * 46) / zoom,
        y,
      )
      ctx.stroke()
    }
  }
}

function drawRepo(
  ctx: CanvasRenderingContext2D,
  object: SpaceObject,
  bounds: Bounds,
  image: HTMLImageElement | null,
  projectedWidth: number,
  zoom: number,
) {
  if (image) {
    drawMedia(ctx, object, bounds, image)
    return
  }

  ctx.fillStyle = '#111110'
  fillRoundedRect(ctx, bounds.left, bounds.top, bounds.width, bounds.height, 5)

  if (projectedWidth < 70) return

  ctx.fillStyle = 'rgba(255,255,255,.42)'
  ctx.font = `600 ${8 / zoom}px ui-monospace, monospace`
  ctx.textBaseline = 'top'
  ctx.fillText('GITHUB / MAIN', bounds.left + 22 / zoom, bounds.top + 22 / zoom)

  ctx.fillStyle = 'rgba(255,255,255,.94)'
  ctx.font = `600 ${21 / zoom}px system-ui`
  ctx.fillText(
    object.title,
    bounds.left + 22 / zoom,
    bounds.top + 53 / zoom,
    bounds.width - 44 / zoom,
  )

  if (projectedWidth > 165) {
    const widths = [0.72, 0.58, 0.82, 0.48]
    for (let index = 0; index < widths.length; index += 1) {
      ctx.fillStyle = index === 0
        ? 'rgba(135,189,255,.52)'
        : 'rgba(255,255,255,.14)'
      fillRoundedRect(
        ctx,
        bounds.left + 22 / zoom,
        bounds.top + (112 + index * 24) / zoom,
        (bounds.width * widths[index]) - 22 / zoom,
        5 / zoom,
        2 / zoom,
      )
    }
  }
}

function drawAudio(
  ctx: CanvasRenderingContext2D,
  object: SpaceObject,
  bounds: Bounds,
  projectedWidth: number,
  zoom: number,
) {
  ctx.fillStyle = '#171411'
  fillRoundedRect(ctx, bounds.left, bounds.top, bounds.width, bounds.height, 5)

  const radius = Math.min(bounds.width, bounds.height) * 0.34
  ctx.fillStyle = object.accent ?? '#9d8267'
  ctx.beginPath()
  ctx.arc(bounds.x, bounds.y, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(13,11,10,.62)'
  ctx.beginPath()
  ctx.arc(bounds.x, bounds.y, radius * 0.42, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(244,235,218,.82)'
  ctx.beginPath()
  ctx.arc(bounds.x, bounds.y, radius * 0.08, 0, Math.PI * 2)
  ctx.fill()

  if (projectedWidth > 160) {
    ctx.fillStyle = 'rgba(255,255,255,.9)'
    ctx.font = `600 ${15 / zoom}px system-ui`
    ctx.textBaseline = 'bottom'
    ctx.fillText(
      object.title,
      bounds.left + 20 / zoom,
      bounds.top + bounds.height - 34 / zoom,
    )

    ctx.fillStyle = 'rgba(255,255,255,.42)'
    ctx.font = `${9 / zoom}px system-ui`
    ctx.fillText(
      object.subtitle,
      bounds.left + 20 / zoom,
      bounds.top + bounds.height - 17 / zoom,
    )
  }
}

export function drawSpaceObject({
  ctx,
  object,
  bounds,
  zoom,
  image,
  hovered,
}: RenderArgs) {
  const projectedWidth = bounds.width * zoom

  ctx.save()

  if (hovered) {
    ctx.shadowColor = 'rgba(0,0,0,.42)'
    ctx.shadowBlur = 34 / zoom
    ctx.shadowOffsetY = 13 / zoom
  }

  switch (object.kind) {
    case 'paper':
      drawPaper(ctx, object, bounds, projectedWidth, zoom)
      break
    case 'repo':
      drawRepo(ctx, object, bounds, image, projectedWidth, zoom)
      break
    case 'audio':
      drawAudio(ctx, object, bounds, projectedWidth, zoom)
      break
    case 'article':
      drawEditorial(ctx, object, bounds, image, projectedWidth, zoom)
      break
    case 'video':
    case 'image':
      drawMedia(ctx, object, bounds, image)
      break
    default:
      break
  }

  if (object.kind === 'video' && projectedWidth > 105) {
    ctx.fillStyle = 'rgba(0,0,0,.48)'
    ctx.beginPath()
    ctx.arc(bounds.x, bounds.y, 20 / zoom, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,.92)'
    ctx.font = `${12 / zoom}px system-ui`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('▶', bounds.x + 1 / zoom, bounds.y)
  }

  if (
    (object.kind === 'video' || object.kind === 'image') &&
    projectedWidth > 155
  ) {
    const gradient = ctx.createLinearGradient(
      0,
      bounds.top + bounds.height * 0.62,
      0,
      bounds.top + bounds.height,
    )
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(1, 'rgba(0,0,0,.66)')

    ctx.save()
    clipSurface(ctx, bounds, 5)
    ctx.fillStyle = gradient
    ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height)
    ctx.restore()

    ctx.fillStyle = 'rgba(255,255,255,.94)'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.font = `600 ${14 / zoom}px system-ui`
    ctx.fillText(
      object.title,
      bounds.left + 18 / zoom,
      bounds.top + bounds.height - 27 / zoom,
      bounds.width - 36 / zoom,
    )

    if (projectedWidth > 260) {
      ctx.fillStyle = 'rgba(255,255,255,.5)'
      ctx.font = `${8 / zoom}px system-ui`
      ctx.fillText(
        object.subtitle,
        bounds.left + 18 / zoom,
        bounds.top + bounds.height - 12 / zoom,
      )
    }
  }

  ctx.restore()
}
