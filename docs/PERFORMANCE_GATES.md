# Performance gates

The product gate is perceived zero-lag interaction, backed by measurable constraints.

- React commits per animation frame: **0**
- idle `requestAnimationFrame`: **0**
- input-to-visual response: **<= 1 frame**
- long tasks over 50 ms during a gesture: **0**
- no synchronous layout reads inside the frame loop
- world motion uses compositor transforms

At 120 Hz the total frame budget is 8.33 ms. Profile at 30, 100, 500, 1,000 and 5,000 objects.

Press `P` in the prototype to toggle the lightweight performance HUD.

If pan or zoom does not feel native, feature work stops.
