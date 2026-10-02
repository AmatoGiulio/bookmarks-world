import { useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from 'react'
import { semanticScore } from './semantic'
import type { SpaceObject } from './spaceTypes'

const stackItems = ['A', 'B', 'C', 'D', 'E']

type Props = {
  object: SpaceObject
  query: string
  onOpen: (object: SpaceObject, origin: DOMRect) => void
}

export function LivingObject({ object, query, onOpen }: Props) {
  const [expanded, setExpanded] = useState(false)
  const score = semanticScore(object, query)
  const searching = query.trim().length > 0
  const dimmed = searching && score === 0
  const semanticScale = searching ? 0.9 + score * 0.16 : 1

  const style = {
    '--x': `${object.x}px`,
    '--y': `${object.y}px`,
    '--w': `${object.width}px`,
    '--h': `${object.height}px`,
    '--accent': object.accent ?? '#eceae4',
    '--semantic-scale': semanticScale,
  } as CSSProperties

  const open = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    if (object.kind === 'cluster') {
      setExpanded((value) => !value)
      return
    }
    onOpen(object, event.currentTarget.getBoundingClientRect())
  }

  return (
    <article
      className={`living-object kind-${object.kind}${dimmed ? ' dimmed' : ''}${expanded ? ' expanded' : ''}`}
      style={style}
      data-space-interactive="true"
      data-lens-target="true"
      data-title={object.title}
      data-tags={object.tags.join(' · ')}
      onClick={open}
      tabIndex={0}
      onKeyDown={(event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter') return
        const rect = event.currentTarget.getBoundingClientRect()
        if (object.kind === 'cluster') setExpanded((value) => !value)
        else onOpen(object, rect)
      }}
    >
      <div className="object-surface">
        {object.image ? <img src={object.image} alt="" draggable={false} /> : null}
        {object.kind === 'video' ? <span className="play">▶</span> : null}
        {object.kind === 'repo' ? <span className="repo-mark">{'{ }'}</span> : null}
        {object.kind === 'paper' ? <div className="paper-lines"><i/><i/><i/><i/></div> : null}
        {object.kind === 'audio' ? <div className="wave">{Array.from({ length: 20 }, (_, i) => <i key={i}/>)}</div> : null}
        {object.kind === 'cluster' ? (
          <div className="cluster-stack">
            {stackItems.map((item, index) => (
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
