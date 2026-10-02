# Bookmarks World architecture

## Canvas first

The spatial world is an actual HTML canvas. React does not mount one DOM node per bookmark.

React owns only product chrome and rich overlays such as a focused video, paper or repository. The infinite world, camera, hit testing, culling and level-of-detail rendering live outside React.

```text
React chrome / focused living object
              |
              v
        <canvas> stage
              |
              v
Spatial engine
  camera
  input
  inertia
  scheduler
  DPR sizing
              |
              v
Canvas scene renderer
  culling
  semantic deformation
  LOD
  hit testing
```

## Hot-path invariants

- zero React state updates during pan, zoom or inertia
- one canvas, one scheduler
- requestAnimationFrame sleeps at rest
- rendering is DPR aware
- only visible objects are drawn
- detail is selected from projected size
- DOM is promoted only for focused / interactive living content

The renderer backend can later move from Canvas 2D to WebGL2 without changing the product boundary.
