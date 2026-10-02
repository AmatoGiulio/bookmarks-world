export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function damp(value: number, friction: number, dtSeconds: number): number {
  return value * Math.exp(-friction * dtSeconds)
}
