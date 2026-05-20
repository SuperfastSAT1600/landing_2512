# Code Highlighting in Videos

For CS, programming tutorials, or any video showing source code, use **Shiki**
for syntax highlighting. Shiki uses the same TextMate grammars as VS Code, so
the colors match what students see in their editor.

## Setup

```bash
npm i shiki
```

## Render at build time via `calculateMetadata`

Highlight code in `calculateMetadata` (build/prep step), pass the resulting
HTML or token tree as a prop. Do NOT call Shiki inside the component — it is
async and Remotion components must render synchronously.

```tsx
import { codeToHtml } from "shiki";

export const calculateMetadata: CalculateMetadataFunction<Props> = async ({
  props,
}) => {
  const html = await codeToHtml(props.code, {
    lang: "typescript",
    theme: "github-dark",
  });
  return { props: { ...props, html } };
};
```

In the component:

```tsx
<div
  style={{ fontSize: 36, fontFamily: "Fira Code" }}
  dangerouslySetInnerHTML={{ __html: props.html }}
/>
```

## Highlighting a specific line

Use Shiki's `transformers` to mark lines, then style via CSS:

```ts
import { transformerNotationHighlight } from "@shikijs/transformers";

await codeToHtml(code, {
  lang: "ts",
  theme: "github-dark",
  transformers: [transformerNotationHighlight()],
});
```

```css
.highlighted { background: rgba(255, 255, 0, 0.15); display: block; }
```

## Animated typing effect

For a "typed line by line" feel, slice the code by frame:

```tsx
const frame = useCurrentFrame();
const charsPerFrame = 4;
const visible = props.code.slice(0, frame * charsPerFrame);
```

Then highlight `visible` (not the full code) via Shiki inside
`calculateMetadata` — but since metadata runs once, prefer pre-tokenizing the
full code and rendering only the first N tokens per frame.

See [Line Reveal](assets/code-highlighting-line-reveal.tsx) for a runnable self-contained code reveal: line-by-line slide-in with a pulsing highlight on a focus line. Use Shiki for production-grade colors.

## Fonts

Load a monospace font (Fira Code, JetBrains Mono, Cascadia Code) via
`@remotion/google-fonts` — see `rules/google-fonts.md`. Ligatures look great
on screen at 30+ px.

## Diff / before-after

Render two `<Code>` blocks in adjacent `<Sequence>`s with a slide or fade
transition (see `rules/transitions.md`).
