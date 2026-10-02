import { useEffect, useRef } from 'react'
import type { SpaceObject } from './spaceTypes'
import { semanticLensState } from './r3f/semanticLensState'

type Props = {
  objects: SpaceObject[]
  disabled: boolean
}

export function SemanticLensOverlay({
  objects,
  disabled,
}: Props) {
  const lensRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLStrongElement | null>(null)
  const metaRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const lens = lensRef.current
    const title = titleRef.current
    const meta = metaRef.current

    if (!lens || !title || !meta) return

    const map = new Map(objects.map((object) => [object.id, object]))
    let rafId = 0
    let lastTargetId: string | null = null

    const paintLabel = () => {
      rafId = 0

      const id = semanticLensState.targetId
      if (id !== lastTargetId) {
        lastTargetId = id
        const object = id ? map.get(id) : undefined
        title.textContent = object?.title ?? 'Semantic lens'
        meta.textContent = object
          ? object.tags.slice(0, 3).join(' · ')
          : 'move across the space'
      }

      if (semanticLensState.active) {
        rafId = requestAnimationFrame(paintLabel)
      }
    }

    const show = () => {
      if (disabled || semanticLensState.active) return
      semanticLensState.active = true
      lens.dataset.visible = 'true'
      if (rafId === 0) rafId = requestAnimationFrame(paintLabel)
    }

    const hide = () => {
      semanticLensState.active = false
      semanticLensState.targetId = null
      semanticLensState.targetTags = []
      lens.dataset.visible = 'false'

      if (rafId !== 0) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') show()
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') hide()
    }

    const onPointerMove = (event: PointerEvent) => {
      semanticLensState.pointerX = event.clientX
      semanticLensState.pointerY = event.clientY

      lens.style.transform =
        `translate3d(${event.clientX - 120}px,${event.clientY - 120}px,0)`
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    if (disabled) hide()

    return () => {
      hide()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [disabled, objects])

  return (
    <div
      ref={lensRef}
      className="semantic-lens"
      data-visible="false"
      aria-hidden="true"
    >
      <div className="semantic-lens__label">
        <strong ref={titleRef}>Semantic lens</strong>
        <span ref={metaRef}>move across the space</span>
      </div>
    </div>
  )
}
