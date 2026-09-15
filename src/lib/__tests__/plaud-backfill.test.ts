import { describe, it, expect } from 'vitest';
import {
  PLAUD_MEMO_MARKER,
  toKstDisplay,
  parsePlaudMemoHeader,
  selectBackfillCandidates,
  matchRecording,
} from '@/lib/plaud-backfill';
import type { PlaudRecording } from '@/lib/plaud-client';
import type { ConsultationEntry } from '@/types/crm';

// 픽스처는 전부 가상이다. 이 저장소는 공개이므로 실제 학생 이름·전사를 넣지 않는다.
const memo = (header: string, body = '[핵심 요약]\n상담 진행.') => `${header}\n\n${body}`;

const entry = (id: string, raw_memo: string): ConsultationEntry => ({
  id,
  created_at: '2026-08-01T00:00:00Z',
  raw_memo,
  published: false,
});

const rec = (id: string, name: string, start_at?: string): PlaudRecording => ({
  id,
  name,
  start_at,
  duration: 1_260_000,
});

describe('toKstDisplay', () => {
  it('타임존 없는 문자열은 UTC로 간주해 +9h 한다', () => {
    expect(toKstDisplay('2026-07-31T07:39:18')).toBe('2026-07-31 16:39');
  });

  it('Z/offset이 붙으면 그 인스턴트를 KST로 변환한다', () => {
    expect(toKstDisplay('2026-07-31T07:39:18Z')).toBe('2026-07-31 16:39');
    expect(toKstDisplay('2026-07-31T16:39:18+09:00')).toBe('2026-07-31 16:39');
  });

  it('자정을 넘기면 날짜가 넘어간다', () => {
    expect(toKstDisplay('2026-07-31T15:30:00Z')).toBe('2026-08-01 00:30');
  });

  it('파싱 불가하거나 빈 값이면 원본을 그대로 돌려준다', () => {
    expect(toKstDisplay('not-a-date')).toBe('not-a-date');
    expect(toKstDisplay('')).toBe('');
  });
});

describe('parsePlaudMemoHeader', () => {
  it('이름과 시각이 모두 있는 헤더를 분해한다', () => {
    const r = parsePlaudMemoHeader(memo(`${PLAUD_MEMO_MARKER} · 8월 상담 녹음 · 2026-08-01 10:05`));
    expect(r).toEqual({ recordingName: '8월 상담 녹음', recordedAtKst: '2026-08-01 10:05' });
  });

  it('이름만 있는 헤더를 분해한다', () => {
    const r = parsePlaudMemoHeader(memo(`${PLAUD_MEMO_MARKER} · 8월 상담 녹음`));
    expect(r).toEqual({ recordingName: '8월 상담 녹음', recordedAtKst: '' });
  });

  it('시각만 있는 헤더를 분해한다', () => {
    const r = parsePlaudMemoHeader(memo(`${PLAUD_MEMO_MARKER} · 2026-08-01 10:05`));
    expect(r).toEqual({ recordingName: '', recordedAtKst: '2026-08-01 10:05' });
  });

  it('메타 없는 맨 헤더도 파싱된다(값은 비어 있다)', () => {
    const r = parsePlaudMemoHeader(memo(PLAUD_MEMO_MARKER));
    expect(r).toEqual({ recordingName: '', recordedAtKst: '' });
  });

  it('이름 자체에 구분자가 들어 있어도 이름으로 되붙인다', () => {
    // 정규식 한 방이 아니라 split 후 재조립하는 이유가 바로 이 경우다.
    const r = parsePlaudMemoHeader(memo(`${PLAUD_MEMO_MARKER} · A · B 상담 · 2026-08-01 10:05`));
    expect(r).toEqual({ recordingName: 'A · B 상담', recordedAtKst: '2026-08-01 10:05' });
  });

  it('마지막 조각이 시각 형식이 아니면 이름의 일부로 남는다', () => {
    const r = parsePlaudMemoHeader(memo(`${PLAUD_MEMO_MARKER} · 8월 상담 · 2026-08-01`));
    expect(r).toEqual({ recordingName: '8월 상담 · 2026-08-01', recordedAtKst: '' });
  });

  it('마지막 조각이 ISO 타임스탬프여도 시각으로 인정하고 KST로 정규화한다', () => {
    // 옛 메모는 toKstDisplay 이전 형식이라 헤더에 원본 ISO가 그대로 박혀 있다.
    // 읽는 쪽이 흡수하지 않으면 시각 조각이 이름 뒤에 붙어 영영 매칭되지 않는다.
    const r = parsePlaudMemoHeader(memo(`${PLAUD_MEMO_MARKER} · 8월 상담 녹음 · 2026-08-04T08:04:46`));
    expect(r).toEqual({ recordingName: '8월 상담 녹음', recordedAtKst: '2026-08-04 17:04' });
  });

  it('ISO에 Z나 오프셋이 붙어도 같은 인스턴트로 정규화한다', () => {
    const z = parsePlaudMemoHeader(memo(`${PLAUD_MEMO_MARKER} · 녹음 · 2026-08-04T08:04:46Z`));
    const off = parsePlaudMemoHeader(memo(`${PLAUD_MEMO_MARKER} · 녹음 · 2026-08-04T17:04:46+09:00`));
    expect(z?.recordedAtKst).toBe('2026-08-04 17:04');
    expect(off?.recordedAtKst).toBe('2026-08-04 17:04');
  });

  it('이름 자체가 시각으로 끝나도 ISO 조각만 시각으로 떼어낸다', () => {
    // 실제로 발생한 형태 — 녹음 이름에 시각이 들어가고 헤더 시각은 ISO였다.
    const r = parsePlaudMemoHeader(
      memo(`${PLAUD_MEMO_MARKER} · 김가나 어머님_유선 전화_2026-08-04 17:04:46 · 2026-08-04T08:04:46`)
    );
    expect(r).toEqual({
      recordingName: '김가나 어머님_유선 전화_2026-08-04 17:04:46',
      recordedAtKst: '2026-08-04 17:04',
    });
  });

  it('Plaud 메모가 아니면 null', () => {
    expect(parsePlaudMemoHeader(memo('직접 작성한 상담 메모'))).toBeNull();
    expect(parsePlaudMemoHeader('')).toBeNull();
  });

  it('첫 줄만 본다 — 본문에 마커가 있어도 헤더로 치지 않는다', () => {
    expect(parsePlaudMemoHeader(`직접 메모\n\n${PLAUD_MEMO_MARKER} · 인용`)).toBeNull();
  });
});

describe('selectBackfillCandidates', () => {
  const timeline = [
    entry('e1', memo(`${PLAUD_MEMO_MARKER} · 녹음 A · 2026-08-01 10:05`)),
    entry('e2', memo('직접 작성 메모')),
    entry('e3', memo(`${PLAUD_MEMO_MARKER} · 녹음 B · 2026-08-02 11:00`)),
  ];

  it('Plaud 메모만 고르고 헤더를 함께 돌려준다', () => {
    const out = selectBackfillCandidates(timeline, new Set());
    expect(out.map((c) => c.entryId)).toEqual(['e1', 'e3']);
    expect(out[0].header.recordingName).toBe('녹음 A');
  });

  it('이미 전사가 저장된 엔트리는 제외한다', () => {
    const out = selectBackfillCandidates(timeline, new Set(['e1']));
    expect(out.map((c) => c.entryId)).toEqual(['e3']);
  });

  it('빈 타임라인이면 빈 배열', () => {
    expect(selectBackfillCandidates([], new Set())).toEqual([]);
  });
});

describe('matchRecording', () => {
  // 2026-08-01 10:05 KST == 2026-08-01T01:05:00 UTC
  const a = rec('file_a', '녹음 A', '2026-08-01T01:05:00');
  const b = rec('file_b', '녹음 B', '2026-08-02T02:00:00');
  // 같은 이름, 다른 시각 — 시각이 결정한다
  const aLater = rec('file_a2', '녹음 A', '2026-08-05T01:05:00');

  it('이름과 시각이 모두 일치하면 매칭', () => {
    const r = matchRecording({ recordingName: '녹음 A', recordedAtKst: '2026-08-01 10:05' }, [a, b]);
    expect(r).toEqual({ status: 'matched', recording: a });
  });

  it('이름이 겹쳐도 시각으로 정확히 갈라낸다', () => {
    const r = matchRecording({ recordingName: '녹음 A', recordedAtKst: '2026-08-05 10:05' }, [a, aLater, b]);
    expect(r).toEqual({ status: 'matched', recording: aLater });
  });

  it('시각이 없고 이름이 유일하면 매칭', () => {
    const r = matchRecording({ recordingName: '녹음 B', recordedAtKst: '' }, [a, b]);
    expect(r).toEqual({ status: 'matched', recording: b });
  });

  it('시각이 없고 이름이 중복이면 추측하지 않고 ambiguous', () => {
    const r = matchRecording({ recordingName: '녹음 A', recordedAtKst: '' }, [a, aLater]);
    expect(r.status).toBe('ambiguous');
    expect(r.status === 'ambiguous' && r.candidates.map((c) => c.id)).toEqual(['file_a', 'file_a2']);
  });

  it('맨 헤더는 식별자가 없으므로 매칭하지 않는다', () => {
    const r = matchRecording({ recordingName: '', recordedAtKst: '' }, [a, b]);
    expect(r).toEqual({ status: 'unmatched', reason: 'no_identifiers' });
  });

  it('해당 녹음이 목록에 없으면 unmatched', () => {
    const r = matchRecording({ recordingName: '녹음 C', recordedAtKst: '2026-08-09 10:05' }, [a, b]);
    expect(r).toEqual({ status: 'unmatched', reason: 'not_found' });
  });

  it('이름은 맞지만 시각이 어긋나면 매칭하지 않는다', () => {
    const r = matchRecording({ recordingName: '녹음 A', recordedAtKst: '2026-08-03 10:05' }, [a, b]);
    expect(r).toEqual({ status: 'unmatched', reason: 'not_found' });
  });

  describe('Plaud에서 녹음 이름이 바뀐 경우', () => {
    // 시각(분 단위)은 녹음 자신의 start_at에서 온 값이라 개명에 영향받지 않는다.
    const renamed = rec('file_r', '김카나 어머님_첫 세일즈콜', '2026-08-26T02:39:40');

    it('시각이 유일하게 일치하고 이름이 유사하면 매칭하고 원래 이름을 남긴다', () => {
      const r = matchRecording(
        { recordingName: '김가나 어머님_첫 세일즈콜', recordedAtKst: '2026-08-26 11:39' },
        [renamed, b]
      );
      expect(r.status).toBe('matched');
      expect(r.status === 'matched' && r.recording.id).toBe('file_r');
      expect(r.status === 'matched' && r.renamedFrom).toBe('김가나 어머님_첫 세일즈콜');
    });

    it('공백·구분자만 다른 경우도 같은 녹음으로 본다', () => {
      const spaced = rec('file_s', '녹음A', '2026-08-01T01:05:00');
      const r = matchRecording({ recordingName: '녹음 A', recordedAtKst: '2026-08-01 10:05' }, [spaced]);
      expect(r.status).toBe('matched');
    });

    it('이름 뒤에 말이 덧붙은 경우도 같은 녹음으로 본다', () => {
      const suffixed = rec('file_x', '녹음 A (재통화)', '2026-08-01T01:05:00');
      const r = matchRecording({ recordingName: '녹음 A', recordedAtKst: '2026-08-01 10:05' }, [suffixed]);
      expect(r.status).toBe('matched');
    });

    it('시각만 같고 이름이 전혀 다르면 매칭하지 않는다', () => {
      // 원본이 삭제되고 같은 분에 시작한 남의 통화가 남아 있는 상황.
      // 여기서 붙이면 학생 기록에 남의 상담이 들어간다.
      const other = rec('file_o', '전혀 다른 학부모_상담', '2026-08-01T01:05:00');
      const r = matchRecording({ recordingName: '녹음 A', recordedAtKst: '2026-08-01 10:05' }, [other]);
      expect(r).toEqual({ status: 'unmatched', reason: 'not_found' });
    });

    it('시각이 같은 후보가 둘 이상이면 추측하지 않고 ambiguous', () => {
      const twin = rec('file_t', '녹음 A 2', '2026-08-01T01:05:00');
      const twin2 = rec('file_u', '녹음 A 3', '2026-08-01T01:05:00');
      const r = matchRecording({ recordingName: '녹음 A', recordedAtKst: '2026-08-01 10:05' }, [twin, twin2]);
      expect(r.status).toBe('ambiguous');
    });

    it('이름 완전일치가 되는 한 개명 경로는 타지 않는다', () => {
      const r = matchRecording({ recordingName: '녹음 A', recordedAtKst: '2026-08-01 10:05' }, [a, b]);
      expect(r.status === 'matched' && r.renamedFrom).toBeUndefined();
    });

    it('시각이 없으면 개명 보정을 하지 않는다', () => {
      // 시각이 없으면 유일성을 보증할 근거가 이름뿐이라 완화가 곧 추측이 된다.
      const r = matchRecording({ recordingName: '김가나 어머님_첫 세일즈콜', recordedAtKst: '' }, [renamed]);
      expect(r).toEqual({ status: 'unmatched', reason: 'not_found' });
    });
  });

  it('여러 계정 목록을 합쳐 넘겨도 계정 태그를 유지한 채 매칭한다', () => {
    const owned = { ...a, account_key: 'wooyoung' };
    const r = matchRecording({ recordingName: '녹음 A', recordedAtKst: '2026-08-01 10:05' }, [owned]);
    expect(r.status === 'matched' && r.recording.account_key).toBe('wooyoung');
  });
});
