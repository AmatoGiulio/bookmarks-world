import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type MouseEvent,
} from 'react'
import type { SpaceObject } from '../space/spaceTypes'

type Props = {
  object: SpaceObject
  origin: DOMRect
  onClose: () => void
}

export function FocusLayer({ object, origin, onClose }: Props) {
  const panelRef = useRef<HTMLElement | null>(null)
  const backdropRef = useRef<HTMLDivElement | null>(null)
  const detailRef = useRef<HTMLDivElement | null>(null)
  const closingRef = useRef(false)

  useLayoutEffect(() => {
    const panel = panelRef.current
    const backdrop = backdropRef.current
    const detail = detailRef.current
    if (!panel || !backdrop || !detail) return

    const target = panel.getBoundingClientRect()
    const dx = origin.left - target.left
    const dy = origin.top - target.top
    const sx = origin.width / target.width
    const sy = origin.height / target.height

    panel.animate(
      [
        {
          transform: `translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})`,
          borderRadius: '3px',
        },
        {
          transform: 'translate3d(0,0,0) scale(1)',
          borderRadius: '8px',
        },
      ],
      {
        duration: 520,
        easing: 'cubic-bezier(.16,.84,.22,1)',
        fill: 'both',
      },
    )

    backdrop.animate(
      [{ backgroundColor: 'rgba(4,4,4,0)' }, { backgroundColor: 'rgba(4,4,4,.34)' }],
      { duration: 360, easing: 'ease-out', fill: 'both' },
    )

    detail.animate(
      [
        { opacity: 0, transform: 'translate3d(22px,0,0)' },
        { opacity: 1, transform: 'translate3d(0,0,0)' },
      ],
      {
        duration: 420,
        delay: 190,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'both',
      },
    )
  }, [origin])

  const close = useCallback(async () => {
    if (closingRef.current) return

    const panel = panelRef.current
    const backdrop = backdropRef.current
    const detail = detailRef.current
    if (!panel || !backdrop || !detail) {
      onClose()
      return
    }

    closingRef.current = true

    const target = panel.getBoundingClientRect()
    const dx = origin.left - target.left
    const dy = origin.top - target.top
    const sx = origin.width / target.width
    const sy = origin.height / target.height

    detail.animate(
      [
        { opacity: 1, transform: 'translate3d(0,0,0)' },
        { opacity: 0, transform: 'translate3d(14px,0,0)' },
      ],
      { duration: 150, fill: 'both' },
    )

    const animation = panel.animate(
      [
        {
          transform: 'translate3d(0,0,0) scale(1)',
          borderRadius: '8px',
        },
        {
          transform: `translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})`,
          borderRadius: '3px',
        },
      ],
      {
        duration: 390,
        easing: 'cubic-bezier(.5,0,.2,1)',
        fill: 'both',
      },
    )

    backdrop.animate(
      [{ backgroundColor: 'rgba(4,4,4,.34)' }, { backgroundColor: 'rgba(4,4,4,0)' }],
      { duration: 280, fill: 'both' },
    )

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
    <div
      ref={backdropRef}
      className="focus-backdrop"
      onMouseDown={() => void close()}
    >
      <article
        ref={panelRef}
        className="focus-panel"
        onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}
      >
        <div className="focus-media">
          {object.image ? (
            <img src={object.image} alt="" />
          ) : (
            <div
              className="focus-placeholder"
              style={{ background: object.accent ?? '#d8d5cc' }}
            />
          )}
        </div>

        <div ref={detailRef} className="focus-detail">
          <header>
            <div>
              <span>{object.kind}</span>
              <h2>{object.title}</h2>
              <p>{object.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => void close()}
              aria-label="Close"
            >
              ×
            </button>
          </header>

          <div className="focus-copy">
            <p>
              {object.meta ??
                'A living bookmark keeps the identity of its source instead of collapsing into a generic card.'}
            </p>

            <div className="focus-tags">
              {object.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
