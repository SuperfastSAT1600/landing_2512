# Math Equations (LaTeX / KaTeX)

For educational videos covering math, physics, chemistry, SAT/AP, or any STEM
content, render equations with **KaTeX** via `react-katex`. KaTeX is faster than
MathJax and renders synchronously, which is what Remotion needs (no async layout
shifts mid-frame).

## Setup

```bash
npm i react-katex katex
```

Import the KaTeX CSS once in your `Root.tsx` (or top-level composition file):

```tsx
import "katex/dist/katex.min.css";
```

## Inline and block math

```tsx
import { InlineMath, BlockMath } from "react-katex";

<BlockMath math={String.raw`\int_{0}^{\pi} \sin(x)\,dx = 2`} />
<InlineMath math={String.raw`E = mc^2`} />
```

Use `String.raw` so backslashes survive without double-escaping.

## Animating equations

Equations are plain DOM, so wrap them in normal Remotion animation primitives:

```tsx
const frame = useCurrentFrame();
const opacity = interpolate(frame, [0, 20], [0, 1], {
  extrapolateRight: "clamp",
});

return (
  <div style={{ opacity, fontSize: 80 }}>
    <BlockMath math={String.raw`a^2 + b^2 = c^2`} />
  </div>
);
```

## Step-by-step derivations

For SAT-style "reveal each line" derivations, render one `<Sequence>` per
equation step and stagger them. See
[assets/katex-math-step-derivation.tsx](assets/katex-math-step-derivation.tsx)
for a runnable example.

## Highlighting a token

KaTeX accepts `\color{red}{...}` and `\boxed{...}`:

```tsx
<BlockMath math={String.raw`2x + \color{red}{6} = 14`} />
<BlockMath math={String.raw`x = \boxed{4}`} />
```

See [Step Derivation](assets/katex-math-step-derivation.tsx) for a full runnable example: 5 algebra steps revealed sequentially with a `\boxed{}` final answer.

## Gotchas

- KaTeX CSS must be imported globally or fonts will fall back and equations
  will reflow on first frame.
- Do NOT use MathJax — its async typesetting causes flicker during Remotion
  rendering.
- For chemistry, use the `mhchem` extension (`\ce{H2O}`): import
  `katex/contrib/mhchem` once before first render.
