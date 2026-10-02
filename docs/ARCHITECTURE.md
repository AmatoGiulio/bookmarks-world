# Bookmarks World architecture

The first slice validates one thing: a spatial bookmark world must feel native at pointer speed before backend or social features.

`apps/web` owns React composition and rich bookmark renderers.
`packages/spatial-engine` owns the hot path: camera, input, inertia, scheduling and transforms.

React is not allowed to drive pan, zoom or inertia frame-by-frame.

## Invariants

- No React state updates in the animation loop.
- `requestAnimationFrame` sleeps when motion stops.
- Pointer input never waits for React reconciliation.
- Camera state is mutable and engine-owned.
- Object focus is a continuity transition, not a navigation reset.
- Expensive media gets explicit runtime budgets before real ingestion lands.
- New visual effects do not enter the hot path without profiling.
