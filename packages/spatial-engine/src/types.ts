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
}

export type PerformanceSnapshot = {
  fps: number
  frameMs: number
  idle: boolean
}

export type SpatialEngineOptions = {
  minZoom?: number
  maxZoom?: number
  friction?: number
  wheelPanScale?: number
  zoomSensitivity?: number
  initialCamera?: Partial<Pick<CameraState, 'x' | 'y' | 'zoom'>>
  onPerformanceSample?: (snapshot: PerformanceSnapshot) => void
}

export type SpatialEngine = {
  destroy: () => void
  getCamera: () => Readonly<CameraState>
  getViewport: () => Readonly<ViewportState>
  getPerformance: () => Readonly<PerformanceSnapshot>
  focusWorldPoint: (x: number, y: number, zoom?: number) => void
  requestRender: () => void
}
