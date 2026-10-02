import { createSpatialEngine, type PerformanceSnapshot } from '@bookmarks/spatial-engine'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { FocusLayer } from '../focus/FocusLayer'
import { SemanticLens } from '../lens/SemanticLens'
import { LivingObject } from './LivingObject'
import { spaceObjects } from './spaceData'
import type { SpaceObject } from './spaceTypes'

type FocusState = { object: SpaceObject; origin: DOMRect } | null

export function SpaceViewport() {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const worldRef = useRef<HTMLDivElement | null>(null)
  const hudRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState<FocusState>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    const world = worldRef.current
    if (!viewport || !world) return

    const engine = createSpatialEngine(viewport, world, {
      minZoom: 0.3,
      maxZoom: 2.2,
      initialCamera: { x: 80, y: 120, zoom: 0.68 },
      onPerformanceSample: (sample: PerformanceSnapshot) => {
        if (!hudRef.current) return
        hudRef.current.textContent = sample.idle
          ? 'idle · rAF off'
          : `${sample.fps} fps · ${sample.frameMs.toFixed(1)} ms`
      },
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'p' && hudRef.current) {
        hudRef.current.dataset.visible = hudRef.current.dataset.visible === 'true' ? 'false' : 'true'
      }
      if (event.key.toLowerCase() === 'h') engine.focusWorldPoint(80, 120, 0.68)
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault()
        document.querySelector<HTMLInputElement>('[data-semantic-search]')?.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      engine.destroy()
    }
  }, [])

  return (
    <main className="space-shell">
      <div ref={viewportRef} className="space-viewport" data-dragging="false">
        <div ref={worldRef} className="space-world">
          {spaceObjects.map((object) => (
            <LivingObject
              key={object.id}
              object={object}
              query={query}
              onOpen={(selected, origin) => setFocus({ object: selected, origin })}
            />
          ))}
        </div>

        <header className="space-chrome" data-space-interactive="true">
          <div className="space-identity">
            <strong>Giulio</strong>
            <span>12 objects</span>
          </div>

          <label className="semantic-search">
            <span>⌕</span>
            <input
              data-semantic-search
              value={query}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder="Search this space"
              autoComplete="off"
            />
            {query ? <button type="button" onClick={() => setQuery('')}>×</button> : <kbd>/</kbd>}
          </label>

          <div className="space-actions">
            <button type="button">Explore</button>
            <button type="button" className="add">+</button>
          </div>
        </header>

        <div className="space-help">drag · wheel · pinch · Shift lens · H home · P perf</div>
        <div ref={hudRef} className="performance-hud" data-visible="false">idle · rAF off</div>
        <SemanticLens viewportRef={viewportRef} />
      </div>

      {focus ? <FocusLayer object={focus.object} origin={focus.origin} onClose={() => setFocus(null)} /> : null}
    </main>
  )
}
