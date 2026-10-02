import * as THREE from 'three'
import type { SpaceObject } from '../spaceTypes'

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate
    } else {
      if (line) lines.push(line)
      line = word
    }
  }

  if (line) lines.push(line)
  return lines
}

export function createSurfaceTexture(object: SpaceObject) {
  const ratio = object.width / Math.max(1, object.height)
  const height = 768
  const width = Math.max(512, Math.round(height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable for bookmark texture')

  const background = object.accent ?? '#e8e3d7'
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  if (object.kind === 'repo') {
    ctx.fillStyle = '#10100f'
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(255,255,255,.42)'
    ctx.font = '600 24px ui-monospace, monospace'
    ctx.fillText('GITHUB / MAIN', 48, 54)

    ctx.fillStyle = '#f4f3ef'
    ctx.font = '600 54px system-ui'
    const title = wrap(ctx, object.title, width - 96)
    title.slice(0, 2).forEach((line, index) => {
      ctx.fillText(line, 48, 136 + index * 62)
    })

    const widths = [0.72, 0.58, 0.82, 0.48]
    widths.forEach((value, index) => {
      ctx.fillStyle = index === 0
        ? 'rgba(135,189,255,.58)'
        : 'rgba(255,255,255,.14)'
      ctx.fillRect(48, 315 + index * 52, (width - 96) * value, 10)
    })
  } else if (object.kind === 'audio') {
    ctx.fillStyle = '#171411'
    ctx.fillRect(0, 0, width, height)

    const x = width * 0.5
    const y = height * 0.43
    const radius = Math.min(width, height) * 0.27

    ctx.fillStyle = object.accent ?? '#a98a69'
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(13,11,10,.66)'
    ctx.beginPath()
    ctx.arc(x, y, radius * 0.42, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#f4ead8'
    ctx.beginPath()
    ctx.arc(x, y, radius * 0.08, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#f5f1e9'
    ctx.font = '600 42px system-ui'
    ctx.fillText(object.title, 48, height - 108)

    ctx.fillStyle = 'rgba(255,255,255,.46)'
    ctx.font = '24px system-ui'
    ctx.fillText(object.subtitle, 48, height - 66)
  } else if (object.kind === 'cluster') {
    ctx.fillStyle = '#0f0f0e'
    ctx.fillRect(0, 0, width, height)

    const fills = ['#ece7dc', '#34312c', '#91856f', '#171715', '#d1c9b8']
    fills.forEach((fill, index) => {
      const offset = index * 22
      ctx.fillStyle = fill
      ctx.fillRect(
        86 + offset,
        112 - offset,
        width * 0.58,
        height * 0.47,
      )
    })

    ctx.fillStyle = '#f5f1e9'
    ctx.font = '600 42px system-ui'
    ctx.fillText(object.title, 48, height - 108)

    ctx.fillStyle = 'rgba(255,255,255,.46)'
    ctx.font = '24px system-ui'
    ctx.fillText(object.subtitle, 48, height - 66)
  } else {
    ctx.fillStyle = 'rgba(17,17,15,.42)'
    ctx.font = '600 22px ui-monospace, monospace'
    ctx.fillText(
      (object.source ?? object.kind).toUpperCase(),
      48,
      58,
    )

    ctx.fillStyle = '#11110f'
    ctx.font = '600 56px system-ui'
    const title = wrap(ctx, object.title, width - 96)
    title.slice(0, 3).forEach((line, index) => {
      ctx.fillText(line, 48, 148 + index * 64)
    })

    ctx.fillStyle = 'rgba(17,17,15,.5)'
    ctx.font = '26px system-ui'
    ctx.fillText(object.subtitle, 48, height - 66)

    ctx.strokeStyle = 'rgba(17,17,15,.14)'
    ctx.lineWidth = 2
    for (let index = 0; index < 6; index += 1) {
      const y = height - 180 - index * 34
      ctx.beginPath()
      ctx.moveTo(48, y)
      ctx.lineTo(width - 48 - (index % 2) * 96, y)
      ctx.stroke()
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}
