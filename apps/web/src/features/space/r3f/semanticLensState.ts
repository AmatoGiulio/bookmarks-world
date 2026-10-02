export const semanticLensState = {
  active: false,
  pointerX: 0,
  pointerY: 0,
  targetId: null as string | null,
  targetTags: [] as string[],
}

export function semanticRelation(
  objectId: string,
  objectTags: string[],
): number {
  if (!semanticLensState.targetId) return 1
  if (semanticLensState.targetId === objectId) return 1

  const targetTags = new Set(semanticLensState.targetTags)
  const shared = objectTags.filter((tag) => targetTags.has(tag)).length

  if (shared === 0) return 0.045

  const union = new Set([
    ...semanticLensState.targetTags,
    ...objectTags,
  ]).size

  return 0.16 + (shared / Math.max(1, union)) * 0.84
}
