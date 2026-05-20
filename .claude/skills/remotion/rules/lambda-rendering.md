# Remotion Lambda — Cloud Rendering at Scale

For producing a course (dozens to thousands of videos), local rendering does
not scale. **Remotion Lambda** renders compositions on AWS Lambda in parallel,
finishing a 5-minute 1080p video in ~30–60s instead of 5–15 min locally.

When you need this: producing a per-student personalized video, batch-rendering
a 100-video SAT course from JSON, or any pipeline that turns prompts → videos.

## Setup (one-time)

```bash
npm i @remotion/lambda
npx remotion lambda policies role     # prints required IAM policy
npx remotion lambda policies user     # prints required user policy
```

Create an AWS user with those policies, then:

```bash
export REMOTION_AWS_ACCESS_KEY_ID=...
export REMOTION_AWS_SECRET_ACCESS_KEY=...

npx remotion lambda functions deploy   # deploys the renderer
npx remotion lambda sites create src/index.ts --site-name=my-course
```

The "site" is your bundled Remotion project; the "function" is the renderer.
Re-run `sites create` after every code change. The function rarely changes.

## Triggering a render

```ts
import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";

const { renderId, bucketName } = await renderMediaOnLambda({
  region: "us-east-1",
  functionName: "remotion-render-...", // from `functions ls`
  serveUrl: "https://....s3.amazonaws.com/sites/my-course/index.html",
  composition: "SatLesson",
  inputProps: { questionId: "q-001" },
  codec: "h264",
  framesPerLambda: 80,            // tune: lower = more parallelism, more cost
  maxRetries: 1,
  privacy: "public",              // or "private" + signed URL
});

const progress = await getRenderProgress({ renderId, bucketName, ... });
// progress.outputFile is the final MP4 when done
```

## Cost model (rough, 2026)

- 1080p, 5 minutes, 30 fps, 60-frame chunks ≈ ~$0.07–0.12 per video
- Cost scales with `framesPerLambda` (lower = more functions, more parallel,
  same total cost) and resolution (4K ≈ 4× the cost of 1080p)
- S3 storage + egress is separate but cheap for MP4s

## Batch rendering a course

```ts
const questions = JSON.parse(fs.readFileSync("course.json", "utf-8"));

const results = await Promise.all(
  questions.map((q) =>
    renderMediaOnLambda({
      region, functionName, serveUrl,
      composition: "SatLesson",
      inputProps: q,
      codec: "h264",
      privacy: "private",
      outName: `lessons/${q.id}.mp4`,
    }),
  ),
);
```

Lambda concurrency limit per account is 1000 by default; for a 100-video
course this is fine. For 10,000+ videos, request a limit increase first.

## Pairing with calculateMetadata

Lambda runs `calculateMetadata` server-side per render. This means you can:

- Hit an LLM in `calculateMetadata` to generate the script from a topic
- Call ElevenLabs TTS for voiceover, attach the audio file
- Pre-tokenize code via Shiki
- Compute equation lengths for handwriting animations

The renderer then produces the final MP4 with everything baked in.

## Webhooks for completion

Pass `webhook` to `renderMediaOnLambda` to get a POST when the render finishes
— better than polling for batch jobs:

```ts
webhook: {
  url: "https://api.mycourse.com/remotion/done",
  secret: process.env.WEBHOOK_SECRET!,
}
```

## Local emulator

`npx remotion lambda functions deploy` requires AWS. For local dev, render
locally with `npx remotion render` against the same composition. Lambda is
only needed for production batch jobs.

## When NOT to use Lambda

- One-off video → render locally, no AWS overhead.
- Hot iteration on a single composition → use `npx remotion studio`.
- Need GPU effects (Three.js fragment shaders, very heavy WebGL) → consider
  Remotion Cloud Run / a self-hosted GPU renderer instead; Lambda is CPU-only.

## Common mistakes

- Forgetting to re-run `sites create` after a code change — Lambda keeps
  rendering the old bundle.
- Setting `framesPerLambda` too low (e.g. 10) — overhead dominates, slower
  and more expensive than higher values like 60–100.
- Using `privacy: "public"` for student-specific videos — leaks PII via the
  S3 URL. Always use `private` + signed URLs for personalized content.
