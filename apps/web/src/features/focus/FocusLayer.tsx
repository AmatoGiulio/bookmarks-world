import { useCallback, useEffect, useLayoutEffect, useRef, type MouseEvent } from 'react'
import type { SpaceObject } from '../space/spaceTypes'

type Props = {
  object: SpaceObject
  origin: DOMRect
  onClose: () => void
}

const OPEN_DURATION = 420

export function FocusLayer({ object, origin, onClose }: Props) {
  const panelRef = useRef<HTMLElement | null>(null)
  const backdropRef = useRef<HTMLDivElement | null>(null)
  const closingRef = useRef(false)

  useLayoutEffect(() => {
    const panel = panelRef.current
    const backdrop = backdropRef.current
    if (!panel || !backdrop) return

    const target = panel.getBoundingClientRect()
    const dx = origin.left - target.left
    const dy = origin.top - target.top
    const sx = origin.width / target.width
    const sy = origin.height / target.height

    panel.animate(
      [
        { transform: `translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})`, borderRadius: '4px' },
        { transform: 'translate3d(0,0,0) scale(1)', borderRadius: '18px' },
      ],
      { duration: OPEN_DURATION, easing: 'cubic-bezier(.2,.82,.2,1)', fill: 'both' },
    )
    backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'ease-out', fill: 'both' })
  }, [origin])

  const close = useCallback(async () => {
    if (closingRef.current) return
    const panel = panelRef.current
    const backdrop = backdropRef.current
    if (!panel || !backdrop) return onClose()

    closingRef.current = true
    const target = panel.getBoundingClientRect()
    const dx = origin.left - target.left
    const dy = origin.top - target.top
    const sx = origin.width / target.width
    const sy = origin.height / target.height

    const animation = panel.animate(
      [
        { transform: 'translate3d(0,0,0) scale(1)', borderRadius: '18px' },
        { transform: `translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})`, borderRadius: '4px' },
      ],
      { duration: 330, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' },
    )
    backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'both' })
    await animation.finished.catch(() => undefined)
    onClose()
  }, [onClose, origin])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  return (
    <div ref={backdropRef} className="focus-backdrop" onMouseDown={() => void close()}>
      <article
        ref={panelRef}
        className="focus-panel"
        onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>{object.kind}</span>
            <h2>{object.title}</h2>
            <p>{object.subtitle}</p>
          </div>
          <button type="button" onClick={() => void close()} aria-label="Close">×</button>
        </header>
        <div className="focus-content">
          {object.image ? <img src={object.image} alt="" /> : <div className="focus-placeholder" />}
          <aside>
            <p>{object.meta ?? 'A living bookmark keeps the identity of its source instead of collapsing into a generic card.'}</p>
            <div className="focus-tags">{object.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </aside>
        </div>
      </article>
    </div>
  )
}
