import { clamp, damp } from './math'
import { createFrameScheduler } from './scheduler'
import type {
  CameraState,
  PerformanceSnapshot,
  SpatialEngine,
  SpatialEngineOptions,
  ViewportState,
} from './types'

const STOP_EPSILON = 0.002
const TAP_THRESHOLD = 4
const SAMPLE_WINDOW_MS = 500

export function createSpatialEngine(
  canvas: HTMLCanvasElement,
  options: SpatialEngineOptions,
): SpatialEngine {
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  const minZoom = options.minZoom ?? 0.28
  const maxZoom = options.maxZoom ?? 2.6
  const friction = options.friction ?? 9.5
  const wheelPanScale = options.wheelPanScale ?? 1
  const zoomSensitivity = options.zoomSensitivity ?? 0.0024
  const maxDpr = options.maxDpr ?? 2

  const camera: CameraState = {
    x: options.initialCamera?.x ?? 0,
    y: options.initialCamera?.y ?? 0,
    zoom: clamp(options.initialCamera?.zoom ?? 0.72, minZoom, maxZoom),
    velocityX: 0,
    velocityY: 0,
  }

  const viewport: ViewportState = { width: 1, height: 1, dpr: 1 }
  const metrics: PerformanceSnapshot = { fps: 0, frameMs: 0, idle: true }

  let pointerId: number | null = null
  let pointerStartX = 0
  let pointerStartY = 0
  let dragCameraX = camera.x
  let dragCameraY = camera.y
  let lastPointerX = 0
  let lastPointerY = 0
  let lastPointerTime = 0
  let lastFrameTime = 0
  let sampleStartedAt = performance.now()
  let sampleFrames = 0
  let sampleFrameTotal = 0
  let destroyed = false

  const syncCanvasSize = () => {
    const rect = canvas.getBoundingClientRect()
    viewport.width = Math.max(1, rect.width)
    viewport.height = Math.max(1, rect.height)
    viewport.dpr = Math.min(maxDpr, Math.max(1, window.devicePixelRatio || 1))

    const width = Math.max(1, Math.round(viewport.width * viewport.dpr))
    const height = Math.max(1, Math.round(viewport.height * viewport.dpr))
    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height
    requestRender()
  }

  const clientToWorld = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect()
    const sx = clientX - rect.left - viewport.width * 0.5
    const sy = clientY - rect.top - viewport.height * 0.5
    return {
      x: camera.x + sx / camera.zoom,
      y: camera.y + sy / camera.zoom,
    }
  }

  const worldToClient = (x: number, y: number) => {
    const rect = canvas.getBoundingClientRect()
    return {
      x: rect.left + viewport.width * 0.5 + (x - camera.x) * camera.zoom,
      y: rect.top + viewport.height * 0.5 + (y - camera.y) * camera.zoom,
    }
  }

  const samplePerformance = (frameMs: number, now: number) => {
    sampleFrames += 1
    sampleFrameTotal += frameMs
    if (now - sampleStartedAt < SAMPLE_WINDOW_MS) return

    const duration = Math.max(1, now - sampleStartedAt)
    metrics.fps = Math.round((sampleFrames * 1000) / duration)
    metrics.frameMs = sampleFrameTotal / Math.max(1, sampleFrames)
    metrics.idle = false
    options.onPerformanceSample?.(metrics)
    sampleStartedAt = now
    sampleFrames = 0
    sampleFrameTotal = 0
  }

  const draw = (now: number) => {
    ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0)
    ctx.clearRect(0, 0, viewport.width, viewport.height)
    options.render({ ctx, camera, viewport, now })
  }

  const scheduler = createFrameScheduler((now) => {
    if (destroyed) return false

    const dtMs = lastFrameTime === 0 ? 16.67 : Math.min(40, now - lastFrameTime)
    lastFrameTime = now
    const dtSeconds = dtMs / 1000

    if (pointerId === null) {
      camera.x += camera.velocityX * dtMs
      camera.y += camera.velocityY * dtMs
      camera.velocityX = damp(camera.velocityX, friction, dtSeconds)
      camera.velocityY = damp(camera.velocityY, friction, dtSeconds)

      if (Math.abs(camera.velocityX) < STOP_EPSILON) camera.velocityX = 0
      if (Math.abs(camera.velocityY) < STOP_EPSILON) camera.velocityY = 0
    }

    draw(now)
    samplePerformance(dtMs, now)

    const moving = pointerId !== null || camera.velocityX !== 0 || camera.velocityY !== 0
    if (!moving) {
      metrics.idle = true
      options.onPerformanceSample?.(metrics)
      lastFrameTime = 0
    }
    return moving
  })

  const requestRender = () => {
    if (metrics.idle) {
      sampleStartedAt = performance.now()
      sampleFrames = 0
      sampleFrameTotal = 0
    }
    metrics.idle = false
    scheduler.request()
  }

  const resizeObserver = new ResizeObserver(syncCanvasSize)
  resizeObserver.observe(canvas)

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return

    pointerId = event.pointerId
    pointerStartX = event.clientX
    pointerStartY = event.clientY
    dragCameraX = camera.x
    dragCameraY = camera.y
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    lastPointerTime = event.timeStamp
    camera.velocityX = 0
    camera.velocityY = 0

    canvas.setPointerCapture(event.pointerId)
    canvas.dataset.dragging = 'true'
    requestRender()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return

    const dx = event.clientX - pointerStartX
    const dy = event.clientY - pointerStartY
    camera.x = dragCameraX - dx / camera.zoom
    camera.y = dragCameraY - dy / camera.zoom

    const dt = Math.max(1, event.timeStamp - lastPointerTime)
    camera.velocityX = -(event.clientX - lastPointerX) / camera.zoom / dt
    camera.velocityY = -(event.clientY - lastPointerY) / camera.zoom / dt
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    lastPointerTime = event.timeStamp
    requestRender()
  }

  const releasePointer = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }

    const travel = Math.hypot(
      event.clientX - pointerStartX,
      event.clientY - pointerStartY,
    )

    pointerId = null
    canvas.dataset.dragging = 'false'

    if (travel <= TAP_THRESHOLD) {
      const world = clientToWorld(event.clientX, event.clientY)
      options.onTap?.({
        clientX: event.clientX,
        clientY: event.clientY,
        worldX: world.x,
        worldY: world.y,
      })
    }

    requestRender()
  }

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    camera.velocityX = 0
    camera.velocityY = 0

    if (event.ctrlKey || event.metaKey) {
      const rect = canvas.getBoundingClientRect()
      const sx = event.clientX - rect.left - viewport.width * 0.5
      const sy = event.clientY - rect.top - viewport.height * 0.5
      const worldX = camera.x + sx / camera.zoom
      const worldY = camera.y + sy / camera.zoom
      const nextZoom = clamp(
        camera.zoom * Math.exp(-event.deltaY * zoomSensitivity),
        minZoom,
        maxZoom,
      )

      camera.zoom = nextZoom
      camera.x = worldX - sx / nextZoom
      camera.y = worldY - sy / nextZoom
    } else {
      const horizontal = event.shiftKey ? event.deltaY : event.deltaX
      const vertical = event.shiftKey ? 0 : event.deltaY
      camera.x += (horizontal * wheelPanScale) / camera.zoom
      camera.y += (vertical * wheelPanScale) / camera.zoom
    }

    requestRender()
  }

  const focusWorldPoint = (x: number, y: number, zoom = camera.zoom) => {
    camera.x = x
    camera.y = y
    camera.zoom = clamp(zoom, minZoom, maxZoom)
    camera.velocityX = 0
    camera.velocityY = 0
    requestRender()
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', releasePointer)
  canvas.addEventListener('pointercancel', releasePointer)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  syncCanvasSize()

  return {
    destroy: () => {
      destroyed = true
      scheduler.stop()
      resizeObserver.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', releasePointer)
      canvas.removeEventListener('pointercancel', releasePointer)
      canvas.removeEventListener('wheel', onWheel)
    },
    getCamera: () => camera,
    getViewport: () => viewport,
    getPerformance: () => metrics,
    focusWorldPoint,
    requestRender,
    clientToWorld,
    worldToClient,
  }
}
