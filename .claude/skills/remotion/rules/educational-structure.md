# Educational Video Structure

Pedagogical scaffolding for K-12, SAT/ACT/AP, and undergrad content. Apply
these patterns at the composition level so each video has predictable pacing
and learning beats.

## Default segment order

| Segment       | Duration (s) | Purpose                                              |
|---------------|--------------|------------------------------------------------------|
| Hook          | 3–8          | Pose the question, surprising fact, or wrong answer  |
| Objective     | 2–5          | "By the end of this video you'll be able to…"        |
| Concept       | 30–90        | Core explanation — one idea per video                |
| Worked example| 30–60        | Step-by-step on a representative problem             |
| Common trap   | 10–20        | Most frequent student mistake + why it's wrong       |
| You-try       | 10–20        | Show a problem, hold on screen for ~6s, then reveal  |
| Recap         | 5–10         | 2–3 bullet takeaways                                 |

Encode each as a top-level `<Sequence>` with `name` set so the Remotion
timeline reads like a lesson plan. See
[assets/educational-structure-segment-template.tsx](assets/educational-structure-segment-template.tsx)
for a runnable 7-segment skeleton with timed `<Sequence>`s and segment labels —
drop your content into each segment.

## Cognitive load rules

- **One concept per video.** If a worksheet item needs two ideas, make two
  videos and chain them.
- **Cap on-screen text at ~12 words per moment.** Anything longer means it
  should be spoken, not read.
- **Color-code roles consistently across a series**: e.g. blue = given, green
  = answer, red = mistake/trap. Pick once and lock it.
- **Pause before each reveal.** Hold the question frame ~2s before the answer
  appears so the viewer commits to a guess.

## Audience-specific defaults

- **K-12 (elementary)**: 1080p portrait (1080×1920) for shorts, large font
  (≥80px), brighter palette, voiceover ≤120 wpm.
- **SAT/ACT/AP**: 1920×1080, monospace for math (KaTeX), show the bubble
  sheet / answer choices A-D on screen during reveals.
- **Undergrad**: 1920×1080, denser text allowed (≤20 words/moment), include
  citations as bottom-right footnotes for theorems.

## Voiceover script conventions

- Write the script first, then time animations to it. Use
  `rules/voiceover.md` (ElevenLabs) for TTS.
- Mark `[PAUSE 1s]` between segments so SFX/breath gaps line up.
- Read aloud at target wpm before generating audio — cuts re-renders.

## Accessibility

- **Captions are mandatory** for educational content. Use
  `rules/display-captions.md` and `rules/transcribe-captions.md`.
- Keep contrast ratio ≥ 4.5:1 for any on-screen text.
- Avoid red/green as the only signal — pair with shape or label.

## Series consistency

When producing a course, create a single `Theme.ts` exporting colors, font
sizes, and segment durations. Every composition imports from it. Changing
the brand or pacing later becomes a one-file edit.

```ts
export const theme = {
  colors: { given: "#3B82F6", answer: "#10B981", trap: "#EF4444" },
  font: { body: "Inter", math: "KaTeX_Main", code: "Fira Code" },
  fps: 30,
  segmentFrames: { hook: 180, concept: 1800, recap: 240 },
};
```
