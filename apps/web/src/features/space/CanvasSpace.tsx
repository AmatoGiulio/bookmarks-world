import {
  createSpatialEngine,
  type PerformanceSnapshot,
  type SpatialEngine,
} from '@bookmarks/spatial-engine'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { FocusLayer } from '../focus/FocusLayer'
import { createCanvasScene } from './canvasScene'
import { HOME_CAMERA, spaceObjects } from './spaceData'
import type { SpaceObject } from './spaceTypes'

type FocusState = {
  object: SpaceObject
  origin: DOMRect
} | null

function homeZoom(width: number) {
  return Math.min(1.02, Math.max(0.78, width / 2200))
}

export function CanvasSpace() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<SpatialEngine | null>(null)
  const sceneRef = useRef<ReturnType<typeof createCanvasScene> | null>(null)
  const queryRef = useRef('')
  const hudRef = useRef<HTMLDivElement | null>(null)

  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState<FocusState>(null)

  useEffect(() => {
    queryRef.current = query
    engineRef.current?.requestRender()
  }, [query])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const scene = createCanvasScene(
      spaceObjects,
      () => engineRef.current?.requestRender(),
    )
    sceneRef.current = scene

    const engine = createSpatialEngine(canvas, {
      minZoom: 0.26,
      maxZoom: 2.8,
      maxDpr: 1.5,
      initialCamera: {
        x: HOME_CAMERA.x,
        y: HOME_CAMERA.y,
        zoom: 0.86,
      },

      render: (frame) => scene.render(frame, queryRef.current),

      onPointerMove: (pointer) => {
        const state = scene.setPointer(pointer, queryRef.current)
        canvas.dataset.hovering = state.hovering ? 'true' : 'false'
        return state.needsRender
      },

      onTap: (tap) => {
        const hit = scene.hitTest(
          tap.worldX,
          tap.worldY,
          queryRef.current,
        )
        if (!hit) return

        if (hit.object.kind === 'cluster') {
          scene.toggleCluster(performance.now())
          engine.requestRender()
          return
        }

        const topLeft = engine.worldToClient(
          hit.x - hit.width / 2,
          hit.y - hit.height / 2,
        )
        const bottomRight = engine.worldToClient(
          hit.x + hit.width / 2,
          hit.y + hit.height / 2,
        )

        setFocus({
          object: hit.object,
          origin: new DOMRect(
            topLeft.x,
            topLeft.y,
            bottomRight.x - topLeft.x,
            bottomRight.y - topLeft.y,
          ),
        })
      },

      onPerformanceSample: (sample: PerformanceSnapshot) => {
        if (!hudRef.current) return
        hudRef.current.textContent = sample.idle
          ? 'idle · rAF off'
          : `${sample.fps} fps · ${sample.frameMs.toFixed(1)} ms`
      },
    })

    engineRef.current = engine
    engine.focusWorldPoint(
      HOME_CAMERA.x,
      HOME_CAMERA.y,
      homeZoom(engine.getViewport().width),
    )

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        scene.setLensActive(true)
        engine.requestRender()
      }

      if (event.key.toLowerCase() === 'p' && hudRef.current) {
        hudRef.current.dataset.visible =
          hudRef.current.dataset.visible === 'true' ? 'false' : 'true'
      }

      if (event.key.toLowerCase() === 'h') {
        engine.focusWorldPoint(
          HOME_CAMERA.x,
          HOME_CAMERA.y,
          homeZoom(engine.getViewport().width),
        )
      }

      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault()
        document
          .querySelector<HTMLInputElement>('[data-semantic-search]')
          ?.focus()
      }

      if (
        event.key === 'Escape' &&
        document.activeElement?.tagName === 'INPUT'
      ) {
        setQuery('')
        ;(document.activeElement as HTMLElement).blur()
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== 'Shift') return
      scene.setLensActive(false)
      engine.requestRender()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    engine.requestRender()

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      engineRef.current = null
      sceneRef.current = null
      engine.destroy()
    }
  }, [])

  return (
    <main className="space-shell">
      <canvas
        ref={canvasRef}
        className="space-canvas"
        data-dragging="false"
        data-hovering="false"
      />

      <header className="space-chrome">
        <div className="space-identity">
          <strong>Giulio</strong>
          <span>{spaceObjects.length} saved things</span>
        </div>

        <label className="semantic-search">
          <span>⌕</span>
          <input
            data-semantic-search
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
        drag · pinch / wheel · click a pile · Shift lens · / search
      </div>

      <div
        ref={hudRef}
        className="performance-hud"
        data-visible="false"
      >
        idle · rAF off
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
