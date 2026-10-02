import { useState, type ChangeEvent } from 'react'
import { FocusLayer } from '../focus/FocusLayer'
import { InfiniteBookmarksCanvas } from './r3f/InfiniteBookmarksCanvas'
import { spaceObjects } from './spaceData'
import type { SpaceObject } from './spaceTypes'

type FocusState = {
  object: SpaceObject
  origin: DOMRect
} | null

export function CanvasSpace() {
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState<FocusState>(null)

  return (
    <main className="space-shell">
      <InfiniteBookmarksCanvas
        objects={spaceObjects}
        query={query}
        onOpen={(object, origin) => setFocus({ object, origin })}
      />

      <header className="space-chrome">
        <div className="space-identity">
          <strong>Giulio</strong>
          <span>{spaceObjects.length} saved things</span>
        </div>

        <label className="semantic-search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setQuery(event.target.value)}
            placeholder="Search this space"
            autoComplete="off"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')}>×</button>
          ) : (
            <kbd>/</kbd>
          )}
        </label>

        <div className="space-actions">
          <button type="button">Explore</button>
          <button type="button" className="add">+</button>
        </div>
      </header>

      <div className="space-help">
        drag to move · scroll / pinch through depth · WASD + QE
      </div>

      {focus ? (
        <FocusLayer
          object={focus.object}
          origin={focus.origin}
          onClose={() => setFocus(null)}
        />
      ) : null}
    </main>
  )
}
