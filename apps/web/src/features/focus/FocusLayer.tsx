import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import type { SpaceObject } from '../space/spaceTypes'

type Props = {
  object: SpaceObject
  origin: DOMRect
  onClose: () => void
}

function sourceStyle(object: SpaceObject): CSSProperties {
  return {
    background: object.accent ?? '#d8d5cc',
  }
}

export function FocusLayer({
  object,
  origin,
  onClose,
}: Props) {
  const heroRef = useRef<HTMLDivElement | null>(null)
  const backdropRef = useRef<HTMLDivElement | null>(null)
  const detailRef = useRef<HTMLElement | null>(null)
  const closingRef = useRef(false)

  useLayoutEffect(() => {
    const hero = heroRef.current
    const backdrop = backdropRef.current
    const detail = detailRef.current

    if (!hero || !backdrop || !detail) return

    const target = hero.getBoundingClientRect()
    const dx = origin.left - target.left
    const dy = origin.top - target.top
    const sx = origin.width / Math.max(1, target.width)
    const sy = origin.height / Math.max(1, target.height)

    hero.animate(
      [
        {
          transform: `translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})`,
          borderRadius: '3px',
        },
        {
          transform: 'translate3d(0,0,0) scale(1)',
          borderRadius: '7px',
        },
      ],
      {
        duration: 900,
        easing: 'cubic-bezier(.76,0,.24,1)',
        fill: 'both',
      },
    )

    backdrop.animate(
      [
        { backgroundColor: 'rgba(4,4,4,0)' },
        { backgroundColor: 'rgba(4,4,4,.18)' },
      ],
      {
        duration: 620,
        easing: 'ease-out',
        fill: 'both',
      },
    )

    detail.animate(
      [
        {
          opacity: 0,
          transform: 'translate3d(-20px,0,0)',
        },
        {
          opacity: 1,
          transform: 'translate3d(0,0,0)',
        },
      ],
      {
        duration: 720,
        delay: 360,
        easing: 'cubic-bezier(.16,1,.3,1)',
        fill: 'both',
      },
    )
  }, [origin])

  const close = useCallback(async () => {
    if (closingRef.current) return

    const hero = heroRef.current
    const backdrop = backdropRef.current
    const detail = detailRef.current

    if (!hero || !backdrop || !detail) {
      onClose()
      return
    }

    closingRef.current = true

    const target = hero.getBoundingClientRect()
    const dx = origin.left - target.left
    const dy = origin.top - target.top
    const sx = origin.width / Math.max(1, target.width)
    const sy = origin.height / Math.max(1, target.height)

    detail.animate(
      [
        { opacity: 1, transform: 'translate3d(0,0,0)' },
        { opacity: 0, transform: 'translate3d(-12px,0,0)' },
      ],
      {
        duration: 220,
        easing: 'ease-in',
        fill: 'both',
      },
    )

    backdrop.animate(
      [
        { backgroundColor: 'rgba(4,4,4,.18)' },
        { backgroundColor: 'rgba(4,4,4,0)' },
      ],
      {
        duration: 500,
        easing: 'ease-in',
        fill: 'both',
      },
    )

    const animation = hero.animate(
      [
        {
          transform: 'translate3d(0,0,0) scale(1)',
          borderRadius: '7px',
        },
        {
          transform: `translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})`,
          borderRadius: '3px',
        },
      ],
      {
        duration: 760,
        easing: 'cubic-bezier(.76,0,.24,1)',
        fill: 'both',
      },
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
      <section
        ref={detailRef}
        className="focus-detail"
        onMouseDown={(event: MouseEvent<HTMLElement>) =>
          event.stopPropagation()}
      >
        <span className="focus-eyebrow">
          {object.source ?? object.kind}
        </span>

        <h2>{object.title}</h2>
        <p className="focus-subtitle">{object.subtitle}</p>

        <p className="focus-description">
          {object.meta ??
            'A living bookmark keeps the identity of its source instead of collapsing into a generic card.'}
        </p>

        <div className="focus-tags">
          {object.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <button
          type="button"
          className="focus-close"
          onClick={() => void close()}
        >
          Back to space
        </button>
      </section>

      <div
        ref={heroRef}
        className={`focus-hero focus-hero--${object.kind}`}
        style={{
          aspectRatio: `${object.width} / ${object.height}`,
          ...sourceStyle(object),
        }}
        onMouseDown={(event: MouseEvent<HTMLDivElement>) =>
          event.stopPropagation()}
      >
        {object.image ? (
          <img src={object.image} alt="" />
        ) : (
          <div className="focus-hero__generated">
            <span>{object.source ?? object.kind}</span>
            <strong>{object.title}</strong>
            <small>{object.subtitle}</small>
          </div>
        )}
      </div>
    </div>
  )
}
