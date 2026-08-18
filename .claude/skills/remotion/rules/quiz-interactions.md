# Quiz & Answer-Choice Reveals

Patterns for SAT/AP/multiple-choice video segments: show a question, hold for
the viewer to attempt, reveal the correct answer, then explain *why* the
distractors are wrong.

## Standard 4-choice timeline (30 fps)

| Phase            | Frames     | Duration | What happens                          |
|------------------|------------|----------|---------------------------------------|
| Question fade-in | 0–15       | 0.5s     | Stem appears                          |
| Choices stagger  | 15–75      | 2s       | A/B/C/D fade in 15 frames apart       |
| Think pause      | 75–255     | 6s       | Hold static so viewer commits         |
| Correct reveal   | 255–285    | 1s       | Right answer turns green, scales 1.1× |
| Distractor X-out | 285–375    | 3s       | Wrong choices fade to 30% + red strike|
| Explanation      | 375+       | rest     | Voiceover walks through reasoning     |

## Implementation

See [Multiple Choice](assets/quiz-interactions-multiple-choice.tsx) for a full
runnable 4-choice reveal: stem fade-in, staggered choice appearance, 6s think
pause, spring-pop correct highlight, and strike-through distractors.

## Think pause indicator

Show a subtle countdown so viewers know how long to think:

```tsx
const remaining = Math.ceil((255 - frame) / 30);
if (frame >= 75 && frame < 255) {
  return <div style={{ fontSize: 32, opacity: 0.5 }}>⏱ {remaining}s</div>;
}
```

Or use a thin progress bar at the bottom that drains over 6s.

## Multi-question quizzes

Use one `<Sequence>` per question. Pass a `Question` schema via Zod (see
`rules/parameters.md`) so a single composition can render any quiz from JSON:

```ts
const questionSchema = z.object({
  stem: z.string(),
  choices: z.array(z.string()).length(4),
  correctIndex: z.number().min(0).max(3),
  explanation: z.string(),
});
```

## Audio cues

- Soft "ding" SFX on correct reveal — see `rules/sfx.md`.
- Lower the BGM volume by 50% during the explanation phase so the voiceover
  cuts through.

## Common mistakes

- Don't reveal the correct answer immediately — the 6s think pause is
  pedagogically load-bearing. Cutting it removes the whole point of the format.
- Don't strike out distractors *before* highlighting the correct answer — it
  spoils the reveal.
- Keep distractor text legible even when faded (≥30% opacity), so viewers can
  still read *what* was wrong during the explanation.
