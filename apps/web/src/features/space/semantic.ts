import type { SpaceObject } from './spaceTypes'

export function semanticScore(object: SpaceObject, query: string): number {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return 1

  const haystack = `${object.title} ${object.subtitle} ${object.tags.join(' ')}`.toLowerCase()
  let hits = 0
  for (const term of terms) {
    if (haystack.includes(term)) hits += 1
  }
  return hits / terms.length
}
