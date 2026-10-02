export type CameraState = {
  x: number
  y: number
  zoom: number
  velocityX: number
  velocityY: number
}

export type ViewportState = {
  width: number
  height: number
  dpr: number
}

export type PerformanceSnapshot = {
  fps: number
  frameMs: number
  idle: boolean
}

export type CanvasFrame = {
  ctx: CanvasRenderingContext2D
  camera: Readonly<CameraState>
  viewport: Readonly<ViewportState>
  now: number
}

export type SpatialPointer = {
  clientX: number
  clientY: number
  screenX: number
  screenY: number
  worldX: number
  worldY: number
}

export type SpatialEngineOptions = {
  minZoom?: number
  maxZoom?: number
  friction?: number
  wheelPanScale?: number
  zoomSensitivity?: number
  maxDpr?: number
  initialCamera?: Partial<Pick<CameraState, 'x' | 'y' | 'zoom'>>
  render: (frame: CanvasFrame) => boolean | void
  onTap?: (pointer: SpatialPointer) => void
  onPointerMove?: (pointer: SpatialPointer) => boolean | void
  onPerformanceSample?: (snapshot: PerformanceSnapshot) => void
}

export type SpatialEngine = {
  destroy: () => void
  getCamera: () => Readonly<CameraState>
  getViewport: () => Readonly<ViewportState>
  getPerformance: () => Readonly<PerformanceSnapshot>
  focusWorldPoint: (x: number, y: number, zoom?: number) => void
  requestRender: () => void
  clientToWorld: (clientX: number, clientY: number) => { x: number; y: number }
  worldToClient: (x: number, y: number) => { x: number; y: number }
}
