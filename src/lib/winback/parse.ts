/**
 * LLM 응답 파싱 — 코드펜스·앞뒤 잡담이 섞여 오는 걸 전제로 JSON만 뽑아 zod로 검증한다.
 * 라우트에 인라인하지 않고 순수 함수로 둔 이유: 이 부분이 실제로 깨지는 지점이라 테스트가 필요하다.
 */
import { z } from 'zod';

/** 파싱·스키마 위반. 라우트에서 502로 매핑한다. */
export class AiResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiResponseError';
  }
}

const PickSchema = z.object({
  id: z.string(),
  fit: z.number().int().min(1).max(5),
  reason: z.string().min(2),
  angle: z.string().optional(),
  risk: z.string().optional(),
});

const RecommendSchema = z.object({
  picks: z.array(PickSchema),
  excluded: z.array(z.object({ id: z.string(), why: z.string() })).optional(),
});

export type WinbackPick = z.infer<typeof PickSchema>;

/**
 * 텍스트에서 가장 바깥 JSON 객체를 추출. 못 찾으면 AiResponseError.
 * max_tokens 초과로 뒤가 잘린 응답(닫는 괄호 없음)은 마지막 완결 원소까지 살려서 복구한다 —
 * 20명 중 12명까지만 판정된 응답을 전부 버리는 것보다 낫다.
 */
function extractJsonObject(raw: string): unknown {
  const start = raw.indexOf('{');
  if (start < 0) throw new AiResponseError('AI 응답에서 JSON을 찾지 못했습니다.');

  const end = raw.lastIndexOf('}');
  if (end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {
      /* 아래 절단 복구로 넘어간다 */
    }
  }

  const recovered = recoverTruncatedPicks(raw.slice(start));
  if (recovered) return recovered;
  throw new AiResponseError('AI 응답 JSON 파싱에 실패했습니다.');
}

/** 잘린 `{"picks":[{...},{...},{...` 에서 완결된 원소만 모아 되살린다. */
function recoverTruncatedPicks(body: string): unknown | null {
  const arrayStart = body.indexOf('[');
  if (arrayStart < 0) return null;

  const items: string[] = [];
  let depth = 0;
  let itemStart = -1;
  for (let i = arrayStart; i < body.length; i++) {
    const ch = body[i];
    if (ch === '{') {
      if (depth === 0) itemStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && itemStart >= 0) {
        items.push(body.slice(itemStart, i + 1));
        itemStart = -1;
      }
    }
  }
  if (items.length === 0) return null;

  try {
    return { picks: items.map((raw) => JSON.parse(raw)) };
  } catch {
    return null;
  }
}

/**
 * 재랭킹 응답 → 유효한 pick 목록.
 * @param validIds 후보로 실제 보낸 학생 id 집합 — LLM이 만들어낸 id를 버리기 위함
 * @param minFit 이 적합도 미만은 제외(기본 3: 1~2는 "제안 부적합")
 */
export function parseRecommendResponse(
  raw: string,
  validIds: Set<string>,
  minFit = 3
): { picks: WinbackPick[]; excluded: { id: string; why: string }[] } {
  const parsed = RecommendSchema.safeParse(extractJsonObject(raw));
  if (!parsed.success) {
    throw new AiResponseError(`AI 응답 형식이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  return {
    picks: parsed.data.picks.filter((p) => validIds.has(p.id) && p.fit >= minFit),
    excluded: (parsed.data.excluded ?? []).filter((e) => validIds.has(e.id)),
  };
}
