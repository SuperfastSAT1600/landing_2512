/**
 * 인사이트 브리핑 areas 파싱/폴백 — fast(insight-brief)와 deep(insight-brief/deep) 라우트 공유.
 * deep 전용 필드(lens/evidence)는 있으면 싣고 없으면 생략 → fast 출력은 기존과 동일.
 */
import type { Signal } from '@/lib/strategy-health';
import type { InsightBriefArea as BriefArea, InsightBriefMode as BriefMode } from '@/types/crm';

const sev = (v: unknown): 'critical' | 'warn' => (v === 'critical' ? 'critical' : 'warn');
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);

/** LLM 미설정/실패 시 결정론적 폴백 — weakest 신호를 그대로 노출. */
export function fallbackAreas(weakest: Signal[], mode: BriefMode): BriefArea[] {
  return weakest.slice(0, 5).map((s) =>
    mode === 'weekly'
      ? {
          title: s.area,
          severity: s.severity,
          why: s.note,
          suggestion: '',
          question: `${s.area} — 이건 이번 주에 누가, 무엇부터 손대야 하지?`,
        }
      : {
          title: s.area,
          severity: s.severity,
          why: s.note,
          suggestion: '전략 AI에서 이어서 점검·해결책을 설계하세요.',
        },
  );
}

/** LLM JSON 응답에서 areas 추출·검증. 실패 시 fallbackAreas. */
export function parseAreas(text: string, weakest: Signal[], mode: BriefMode): BriefArea[] {
  try {
    const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('no json');
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    const areas: unknown[] = Array.isArray(parsed.areas) ? parsed.areas : [];
    const valid = areas
      .filter((a): a is Record<string, unknown> => {
        const o = a as Record<string, unknown>;
        if (!o || typeof o.title !== 'string' || typeof o.why !== 'string') return false;
        return mode === 'weekly' ? typeof o.question === 'string' : typeof o.suggestion === 'string';
      })
      .map((o): BriefArea => {
        const lens = str(o.lens);
        const evidence = str(o.evidence);
        const base = {
          title: o.title as string,
          severity: sev(o.severity),
          why: o.why as string,
          ...(lens ? { lens } : {}),
          ...(evidence ? { evidence } : {}),
        };
        return mode === 'weekly'
          ? { ...base, suggestion: '', question: o.question as string }
          : { ...base, suggestion: o.suggestion as string };
      })
      .slice(0, 5);
    return valid.length > 0 ? valid : fallbackAreas(weakest, mode);
  } catch {
    return fallbackAreas(weakest, mode);
  }
}
