# Reference translations

We use references as interaction research, not as templates to reproduce.

## Codrops — Infinite Canvas

Source: https://tympanus.net/codrops/2026/01/07/infinite-canvas-building-a-seamless-pan-anywhere-image-space/

What we take:

- chunked spatial lookup around the camera
- fixed-cost visibility work instead of scanning the whole world
- frame-based camera integration with inertia
- capped DPR for stable frame time
- LOD / don't render detail that cannot be perceived

What we reject:

- repeating a finite media set to fake infinity

Bookmarks have identity. The space may be unbounded, but a bookmark must not be duplicated just because the camera moved.

## Codrops — Grid Zoom Layout

Source: https://tympanus.net/codrops/2021/12/01/grid-zoom-layout/

What we take:

- source geometry is preserved
- focus begins at the exact selected object rect
- the object grows into the content view instead of navigating away
- closing reverses to the same source geometry
- context remains visible around the focused object

Our focus layer is therefore a promoted living object, not a modal route.

## Codrops — Thumbnail Flow

Source: https://tympanus.net/codrops/2026/06/04/creating-a-thumbnail-flow-animation-with-gsap-motionpath/

What we take:

- a pile can unfold into readable members
- trajectories are curved, not straight tweens
- a tiny per-item stagger makes one action read as material flow
- the compact and expanded states are the same objects

We implement the path mathematics in the canvas runtime rather than mounting DOM thumbnails or making GSAP the spatial engine.

## Codrops — Mouse-following Lens

Source: https://tympanus.net/codrops/2026/08/25/building-a-mouse-following-square-lens-effect-with-three-js-and-glsl/

What we take:

- one region can reveal a second interpretation of the same scene
- the lens follows the pointer and is spatial, not a detached panel

What we replace:

- RGB shift / image distortion becomes semantic contrast

Inside the Bookmarks lens, relation strength changes object visibility and exposes local metadata. The lens is an information instrument, not a decorative shader.
