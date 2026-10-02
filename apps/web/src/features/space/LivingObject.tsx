import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { semanticScore } from './semantic'
import type { SpaceObject } from './spaceTypes'

const clusterItems = ['Data Mountain', 'Pad++', 'Piles', 'Magic Lens', 'Chameleon']
const DRAG_THRESHOLD = 4

type Props = {
  object: SpaceObject
  query: string
  relatedTitles: string[]
  getCameraZoom: () => number
  onOpen: (object: SpaceObject, origin: DOMRect) => void
  onMove: (id: string, x: number, y: number) => void
}

type DragState = {
  pointerId: number
  startClientX: number
  startClientY: number
  startX: number
  startY: number
  moved: boolean
}

export function LivingObject({
  object,
  query,
  relatedTitles,
  getCameraZoom,
  onOpen,
  onMove,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const dragRef = useRef<DragState | null>(null)

  const score = semanticScore(object, query)
  const searching = query.trim().length > 0
  const dimmed = searching && score === 0
  const semanticScale = searching ? 0.9 + score * 0.18 : 1
  const pull = searching ? score * 0.22 : 0
  const semanticX = -object.x * pull
  const semanticY = -object.y * pull

  const style = {
    '--x': `${object.x}px`,
    '--y': `${object.y}px`,
    '--w': `${object.width}px`,
    '--h': `${object.height}px`,
    '--accent': object.accent ?? '#eceae4',
    '--semantic-scale': semanticScale,
    '--semantic-x': `${semanticX}px`,
    '--semantic-y': `${semanticY}px`,
  } as CSSProperties

  const openFromElement = (element: HTMLElement) => {
    if (object.kind === 'cluster') {
      setExpanded((value) => !value)
      return
    }
    onOpen(object, element.getBoundingClientRect())
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()

    const element = event.currentTarget
    element.setPointerCapture(event.pointerId)
    element.dataset.dragging = 'true'
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: object.x,
      startY: object.y,
      moved: false,
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || searching) return

    const dx = event.clientX - drag.startClientX
    const dy = event.clientY - drag.startClientY
    if (!drag.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD) drag.moved = true
    if (!drag.moved) return

    const zoom = Math.max(0.01, getCameraZoom())
    const nextX = drag.startX + dx / zoom
    const nextY = drag.startY + dy / zoom

    event.currentTarget.style.setProperty('--x', `${nextX}px`)
    event.currentTarget.style.setProperty('--y', `${nextY}px`)
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const element = event.currentTarget
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId)
    }
    element.dataset.dragging = 'false'
    dragRef.current = null

    const dx = event.clientX - drag.startClientX
    const dy = event.clientY - drag.startClientY

    if (!searching && drag.moved) {
      const zoom = Math.max(0.01, getCameraZoom())
      onMove(object.id, drag.startX + dx / zoom, drag.startY + dy / zoom)
      return
    }

    openFromElement(element)
  }

  return (
    <article
      className={`living-object kind-${object.kind}${dimmed ? ' dimmed' : ''}${expanded ? ' expanded' : ''}`}
      style={style}
      data-space-object="true"
      data-space-interactive="true"
      data-lens-target="true"
      data-title={object.title}
      data-tags={object.tags.join(' · ')}
      data-related={relatedTitles.join(' · ')}
      data-culled="false"
      data-dragging="false"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={(event) => {
        event.currentTarget.dataset.dragging = 'false'
        dragRef.current = null
      }}
      tabIndex={0}
      onKeyDown={(event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter') return
        openFromElement(event.currentTarget)
      }}
    >
      <div className="object-surface">
        {object.image ? <img src={object.image} alt="" draggable={false} /> : null}
        {object.kind === 'video' ? <span className="play">▶</span> : null}
        {object.kind === 'repo' ? <span className="repo-mark">{'{ }'}</span> : null}
        {object.kind === 'paper' ? <div className="paper-lines"><i/><i/><i/><i/></div> : null}
        {object.kind === 'audio' ? (
          <div className="wave">
            {Array.from({ length: 20 }, (_, index) => <i key={index}/>)}
          </div>
        ) : null}
        {object.kind === 'cluster' ? (
          <div className="cluster-stack">
            {clusterItems.map((item, index) => (
              <span key={item} style={{ '--i': index } as CSSProperties}>{item}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="object-caption">
        <strong>{object.title}</strong>
        <span>{object.subtitle}</span>
      </div>
    </article>
  )
}
