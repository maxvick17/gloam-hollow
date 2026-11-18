# Gloam Hollow — Design (build spec)

Implements `.kiro/specs/gloam-hollow/requirements.md` (requirements 1–8) under the
steering in `.kiro/steering/project.md`. Plain HTML/CSS/JS, no frameworks, no assets.

## Structure
- `index.html` — page shell: HUD (oil gauge, bell tolls, wisp count, carried slots),
  stage, dialogue panel, title / help / end overlays.
- `style.css` — coloring-book night theme (ink black, bone white, lantern amber);
  the darkness is a CSS radial-gradient layer keyed to CSS vars `--lx/--ly/--lr`.
- `game.js` — everything else: the WebAudio synth engine, the six scenes as inline
  SVG, game state, input (mouse / touch / keyboard / pinch / wheel), the main loop.

## Systems
- **Scenes (req 1):** tower → chapel → well → main → depot → arroyo, a linear walk.
  Each scene is layered SVG: sky/mesas, ground, bold-outline props. Well Square holds
  the town well (the return point).
- **Lantern (req 2):** the radial light follows the player's pointer/touch (the keeper
  walks toward the pointer's x); left alone it drifts back to the keeper, and in
  keyboard play it stays on the keeper. Wheel / pinch / W-S keys set the radius
  (70–280 scene px). Darkness = radial gradient, transparent inside the light, ~96%
  black outside; an amber glow layer sits under it.
- **Oil (req 3):** 100 units ≈ 7 minutes at the default radius; drain scales with
  radius^1.6. Three oil tins (+45 each) hide in the tower, well square, and main street.
  Oil at zero = the lantern dies (fail state, instant retry).
- **Bell (req 4):** one toll per 60 s of play (WebAudio synthesized bell with a simple
  feedback-delay "distance"). At the seventh toll, unreturned wisps scatter — midnight
  fail state, instant retry.
- **Wisps (req 5):** seven ember-wisps per run, drawn from a pool of 18 hiding spots
  (max 2 per scene, shuffled each run). A wisp is visible only inside the light (plus a
  faint periodic glimmer). Click/tap to carry, max 2; walking to the well deposits them.
- **Ghosts (req 6):** Marigold (depot; speaks in train schedules), the Undersheriff
  (main street; patrols his one street, gives patrol-report hints), Little June
  (arroyo; lost her paper crown — a fetch beat: find the crown among 3 arroyo spots,
  return it, and she marks one hidden wisp with a persistent sparkle).
- **Win (req 7):** all 7 wisps returned before the seventh toll → finale: the town
  lights scene by scene, the tower lantern ignites, ghosts take their bow (their
  closing lines appear as captions), completion time / bells / oil shown.
- **Art & audio (req 8):** all SVG drawn in code; all sound synthesized — wind
  (filtered noise + LFO), lantern hiss (gain follows radius), bell, pentatonic wisp
  chimes that rise as wisps come home, per-ghost motifs, oil-tin clink, paper rustle,
  finale chord.

## Tuning targets
- A deliberate, unhurried clear: ~4–6 minutes. A wide-light-only clear is impossible
  on oil alone (wide light ≈ 175 s of burn), forcing radius discipline and tin use.
- Replay = a fresh wisp layout and a fresh crown spot.
