export type FrameCallback = (time: number) => boolean

export function createFrameScheduler(onFrame: FrameCallback) {
  let rafId = 0

  const tick = (time: number) => {
    rafId = 0
    const needsAnotherFrame = onFrame(time)
    if (needsAnotherFrame) request()
  }

  const request = () => {
    if (rafId !== 0) return
    rafId = window.requestAnimationFrame(tick)
  }

  const stop = () => {
    if (rafId === 0) return
    window.cancelAnimationFrame(rafId)
    rafId = 0
  }

  return { request, stop, isScheduled: () => rafId !== 0 }
}
