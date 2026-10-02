import type { SpaceObject } from './spaceTypes'

function relationScore(a: SpaceObject, b: SpaceObject): number {
  if (a.id === b.id) return -1
  const aTags = new Set(a.tags)
  const shared = b.tags.filter((tag) => aTags.has(tag)).length
  if (shared === 0) return 0

  const union = new Set([...a.tags, ...b.tags]).size
  return shared / union
}

export function relatedTitlesFor(
  object: SpaceObject,
  objects: SpaceObject[],
  limit = 3,
): string[] {
  return objects
    .map((candidate) => ({
      candidate,
      score: relationScore(object, candidate),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.candidate.title)
}
