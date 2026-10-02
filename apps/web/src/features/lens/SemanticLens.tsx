import { useEffect, useRef, type RefObject } from 'react'

type Props = {
  viewportRef: RefObject<HTMLElement | null>
}

export function SemanticLens({ viewportRef }: Props) {
  const lensRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLElement | null>(null)
  const tagsRef = useRef<HTMLSpanElement | null>(null)
  const relatedRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    const lens = lensRef.current
    if (!viewport || !lens) return

    let active = false
    let x = 0
    let y = 0
    let rafId = 0

    const paint = () => {
      rafId = 0
      lens.style.transform = `translate3d(${x - 92}px,${y - 92}px,0)`
      const target = document
        .elementFromPoint(x, y)
        ?.closest<HTMLElement>('[data-lens-target="true"]')

      if (titleRef.current) {
        titleRef.current.textContent = target?.dataset.title ?? 'semantic lens'
      }
      if (tagsRef.current) {
        tagsRef.current.textContent = target?.dataset.tags ?? 'hold Shift and move'
      }
      if (relatedRef.current) {
        const related = target?.dataset.related
        relatedRef.current.textContent = related ? `near · ${related}` : ''
      }
    }

    const schedule = () => {
      if (rafId === 0) rafId = requestAnimationFrame(paint)
    }

    const move = (event: PointerEvent) => {
      x = event.clientX
      y = event.clientY
      if (active) schedule()
    }

    const down = (event: KeyboardEvent) => {
      if (event.key !== 'Shift' || active) return
      active = true
      lens.dataset.visible = 'true'
      schedule()
    }

    const up = (event: KeyboardEvent) => {
      if (event.key !== 'Shift') return
      active = false
      lens.dataset.visible = 'false'
    }

    viewport.addEventListener('pointermove', move)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)

    return () => {
      viewport.removeEventListener('pointermove', move)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      if (rafId !== 0) cancelAnimationFrame(rafId)
    }
  }, [viewportRef])

  return (
    <div ref={lensRef} className="semantic-lens" data-visible="false" aria-hidden="true">
      <div className="lens-glass" />
      <div className="lens-label">
        <strong ref={titleRef}>semantic lens</strong>
        <span ref={tagsRef}>hold Shift and move</span>
        <span ref={relatedRef} className="lens-related" />
      </div>
    </div>
  )
}
