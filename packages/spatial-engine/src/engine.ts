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
const SAMPLE_WINDOW_MS = 500

export function createSpatialEngine(
  viewportElement: HTMLElement,
  worldElement: HTMLElement,
  options: SpatialEngineOptions = {},
): SpatialEngine {
  const minZoom = options.minZoom ?? 0.28
  const maxZoom = options.maxZoom ?? 2.4
  const friction = options.friction ?? 9.5
  const wheelPanScale = options.wheelPanScale ?? 1
  const zoomSensitivity = options.zoomSensitivity ?? 0.0024

  const camera: CameraState = {
    x: options.initialCamera?.x ?? 0,
    y: options.initialCamera?.y ?? 0,
    zoom: clamp(options.initialCamera?.zoom ?? 0.72, minZoom, maxZoom),
    velocityX: 0,
    velocityY: 0,
  }

  const viewport: ViewportState = { width: 1, height: 1 }
  const metrics: PerformanceSnapshot = { fps: 0, frameMs: 0, idle: true }

  let pointerId: number | null = null
  let dragStartX = 0
  let dragStartY = 0
  let dragCameraX = camera.x
  let dragCameraY = camera.y
  let lastPointerX = 0
  let lastPointerY = 0
  let lastPointerTime = 0
  let lastFrameTime = 0
  let sampleStartedAt = window.performance.now()
  let sampleFrameCount = 0
  let sampleFrameTotal = 0
  let destroyed = false

  const applyTransform = () => {
    const tx = viewport.width * 0.5 - camera.x * camera.zoom
    const ty = viewport.height * 0.5 - camera.y * camera.zoom
    worldElement.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${camera.zoom})`
  }

  const samplePerformance = (frameMs: number, now: number) => {
    sampleFrameCount += 1
    sampleFrameTotal += frameMs
    if (now - sampleStartedAt < SAMPLE_WINDOW_MS) return

    const duration = Math.max(1, now - sampleStartedAt)
    metrics.fps = Math.round((sampleFrameCount * 1000) / duration)
    metrics.frameMs = sampleFrameTotal / Math.max(1, sampleFrameCount)
    metrics.idle = false
    options.onPerformanceSample?.(metrics)
    sampleStartedAt = now
    sampleFrameCount = 0
    sampleFrameTotal = 0
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

    applyTransform()
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
      sampleStartedAt = window.performance.now()
      sampleFrameCount = 0
      sampleFrameTotal = 0
    }
    metrics.idle = false
    scheduler.request()
  }

  const resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return
    viewport.width = Math.max(1, entry.contentRect.width)
    viewport.height = Math.max(1, entry.contentRect.height)
    applyTransform()
  })
  resizeObserver.observe(viewportElement)

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    if ((event.target as Element | null)?.closest('[data-space-interactive="true"]')) {
      camera.velocityX = 0
      camera.velocityY = 0
      requestRender()
      return
    }

    pointerId = event.pointerId
    dragStartX = event.clientX
    dragStartY = event.clientY
    dragCameraX = camera.x
    dragCameraY = camera.y
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    lastPointerTime = event.timeStamp
    camera.velocityX = 0
    camera.velocityY = 0
    viewportElement.setPointerCapture(event.pointerId)
    viewportElement.dataset.dragging = 'true'
    requestRender()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return

    const dx = event.clientX - dragStartX
    const dy = event.clientY - dragStartY
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
    if (viewportElement.hasPointerCapture(event.pointerId)) {
      viewportElement.releasePointerCapture(event.pointerId)
    }
    pointerId = null
    viewportElement.dataset.dragging = 'false'
    requestRender()
  }

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    camera.velocityX = 0
    camera.velocityY = 0

    if (event.ctrlKey || event.metaKey) {
      const rect = viewportElement.getBoundingClientRect()
      const sx = event.clientX - rect.left - viewport.width * 0.5
      const sy = event.clientY - rect.top - viewport.height * 0.5
      const worldX = camera.x + sx / camera.zoom
      const worldY = camera.y + sy / camera.zoom
      const nextZoom = clamp(camera.zoom * Math.exp(-event.deltaY * zoomSensitivity), minZoom, maxZoom)

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

  viewportElement.addEventListener('pointerdown', onPointerDown)
  viewportElement.addEventListener('pointermove', onPointerMove)
  viewportElement.addEventListener('pointerup', releasePointer)
  viewportElement.addEventListener('pointercancel', releasePointer)
  viewportElement.addEventListener('wheel', onWheel, { passive: false })
  applyTransform()

  return {
    destroy: () => {
      destroyed = true
      scheduler.stop()
      resizeObserver.disconnect()
      viewportElement.removeEventListener('pointerdown', onPointerDown)
      viewportElement.removeEventListener('pointermove', onPointerMove)
      viewportElement.removeEventListener('pointerup', releasePointer)
      viewportElement.removeEventListener('pointercancel', releasePointer)
      viewportElement.removeEventListener('wheel', onWheel)
    },
    getCamera: () => camera,
    getViewport: () => viewport,
    getPerformance: () => metrics,
    focusWorldPoint,
    requestRender,
  }
}
