import { useCallback, useEffect, useState } from 'react'

type Position = { x: number; y: number }
type PositionMap = Record<string, Position>

const STORAGE_KEY = 'bookmarks-world:positions:v0'

function loadPositions(): PositionMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as PositionMap
  } catch {
    return {}
  }
}

export function useSpacePositions() {
  const [positions, setPositions] = useState<PositionMap>(loadPositions)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positions))
  }, [positions])

  const commitPosition = useCallback((id: string, x: number, y: number) => {
    setPositions((current) => ({
      ...current,
      [id]: { x, y },
    }))
  }, [])

  const resetPositions = useCallback(() => setPositions({}), [])

  return { positions, commitPosition, resetPositions }
}
