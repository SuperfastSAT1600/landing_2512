# Whiteboard & Handwriting Animations

For the "teacher writing on a board" effect — drawing equations, diagrams, or
underlines stroke-by-stroke. Implemented via SVG `stroke-dasharray` /
`stroke-dashoffset`, no external library needed.

## Core trick

Any SVG path can be animated as if being drawn by setting its total length
as the dash array, then animating the dash offset from `length` (invisible)
down to `0` (fully drawn).

See [Drawn Path](assets/whiteboard-handwriting-drawn-path.tsx) for a runnable
`DrawnPath` component animating an arbitrary SVG path.
See [Drawn Underline](assets/whiteboard-handwriting-drawn-underline.tsx) for
an animated underline emphasizing a word (uses the Caveat handwriting font).

## Getting `length` for any path

```tsx
// In Node / calculateMetadata — use svg-path-properties (npm)
import { svgPathProperties } from "svg-path-properties";
const length = new svgPathProperties(d).getTotalLength();
```

For inline SVG in the browser/render, ref the `<path>` and call
`pathRef.current.getTotalLength()` in a `useEffect`, then `setState`.
Prefer precomputing in `calculateMetadata` to avoid first-frame flicker.

## Handwritten fonts

Use a script/handwriting Google Font (Caveat, Kalam, Patrick Hand,
Architects Daughter) for headlines and labels. See `rules/google-fonts.md`.

```tsx
import { loadFont } from "@remotion/google-fonts/Caveat";
const { fontFamily } = loadFont();
```

## Multi-stroke characters (handwriting equations)

For an equation being "written," don't try to vectorize math text. Two options:

1. **KaTeX + sequential opacity** — render the equation, then fade in tokens
   left-to-right by wrapping each character in a `<span>` and staggering opacity.
   Faster, looks "appeared" rather than "drawn."
2. **Pre-exported SVG paths** — write the equation in Inkscape/Figma, export
   as SVG, then animate each path with `DrawnPath`. Slower to author but reads
   as genuinely handwritten.

For most lessons, option 1 is the right tradeoff.

## Pen cursor (optional)

Layer a pen tip image at the end of the drawing path. Compute position by
sampling the path at `length - offset`:

```tsx
const props = new svgPathProperties(d);
const drawn = length - offset;
const tip = props.getPointAtLength(drawn);
// render <img src="/pen.png" style={{ left: tip.x, top: tip.y }} />
```

Subtle but very effective. Use sparingly — only on the "feature" stroke per
scene, not every line.

## Common mistakes

- Forgetting to clamp `interpolate` — path will keep "drawing" past frame
  count and disappear again as offset goes negative.
- Measuring `getTotalLength()` on every frame — measure once, memoize.
- Using `stroke-dasharray` on a `<path>` with `fill` set — the fill appears
  instantly, defeating the drawn-in effect. Always `fill="none"`.
