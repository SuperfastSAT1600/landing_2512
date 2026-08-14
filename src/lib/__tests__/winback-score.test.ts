import { describe, it, expect } from 'vitest';
import { parseBrief } from '@/lib/winback/brief';
import { scoreWinbackCandidate, type WinbackScoreStudent } from '@/lib/winback/score';

const NOW = new Date('2026-08-11T00:00:00Z').getTime();
const AP_BRIEF = parseBrief({ brief: 'AP Calculus BC 16시간권, 9~11학년, 5월 시험 대비, 144만원' });

function student(over: Partial<WinbackScoreStudent> = {}): WinbackScoreStudent {
  return {
    id: 's1',
    name: '홍길동',
    grade: '10th',
    updated_at: '2026-05-01T00:00:00Z', // 이탈 약 102일 전
    ...over,
  };
}

function signalKeys(s: WinbackScoreStudent, brief = AP_BRIEF) {
  return scoreWinbackCandidate(s, brief, { similarity: null, now: NOW }).signals.map((x) => x.key);
}

describe('scoreWinbackCandidate', () => {
  it('desired_subjects는 점수에 전혀 영향을 주지 않는다 (자동 유입에서 Both로 강제 오염되는 필드)', () => {
    const base = student({ desired_subjects: 'Both' });
    const other = student({ desired_subjects: 'AP Calculus BC' });

    const a = scoreWinbackCandidate(base, AP_BRIEF, { similarity: null, now: NOW });
    const b = scoreWinbackCandidate(other, AP_BRIEF, { similarity: null, now: NOW });

    expect(b.score).toBe(a.score);
    expect(b.signals).toEqual(a.signals);
  });

  it('campaign_tags의 과목 의도를 최상위 신호로 가점한다', () => {
    const plain = scoreWinbackCandidate(student(), AP_BRIEF, { similarity: null, now: NOW });
    const tagged = scoreWinbackCandidate(
      student({ campaign_tags: ['AP 문의', 'Calculus AB / BC'] }),
      AP_BRIEF,
      { similarity: null, now: NOW }
    );

    expect(tagged.score).toBeGreaterThan(plain.score);
    expect(signalKeys(student({ campaign_tags: ['AP 문의'] }))).toContain('campaign_tag_intent');
    expect(signalKeys(student({ campaign_tags: ['Calculus AB / BC'] }))).toContain(
      'campaign_tag_subject'
    );
  });

  it('상담 메모의 과목 언급도 신호로 잡는다', () => {
    const keys = signalKeys(
      student({
        consultation_timeline: [{ created_at: '2026-04-01T00:00:00Z', raw_memo: 'AP Calculus 준비 문의' }],
      })
    );
    expect(keys).toContain('memo_subject_mention');
  });

  it('학년은 정확 일치와 인접(±1)을 구분한다', () => {
    expect(signalKeys(student({ grade: '10th' }))).toContain('grade_exact');
    expect(signalKeys(student({ grade: '12th' }))).toContain('grade_adjacent');
    expect(signalKeys(student({ grade: '7th' }))).not.toContain('grade_exact');
  });

  it('학제 적합(AP 상품 × AP/IB 학제)을 가점한다', () => {
    expect(signalKeys(student({ school_type: 'AP' }))).toContain('school_type_fit');
    expect(signalKeys(student({ school_type: '한국 학제' }))).not.toContain('school_type_fit');
  });

  it('목표 시험일이 상품 시험월 ±2개월이면 가점한다', () => {
    expect(signalKeys(student({ target_test_date: '2027-05-01' }))).toContain('exam_timing');
    expect(signalKeys(student({ target_test_date: '2027-11-01' }))).not.toContain('exam_timing');
  });

  it('이탈 사유를 카테고리로 정규화해 가감한다', () => {
    expect(signalKeys(student({ churn_tag: '미결제: 수업료 부담' }))).toContain('churn_unpaid');
    expect(signalKeys(student({ churn_tag: '환불: 잔여시간 환불' }))).toContain('churn_refunded');
  });

  it('이탈 경과일이 적정 구간이면 가점, 너무 오래되면 감점', () => {
    expect(signalKeys(student({ updated_at: '2026-06-01T00:00:00Z' }))).toContain('recency_sweet');
    expect(signalKeys(student({ updated_at: '2024-01-01T00:00:00Z' }))).toContain('recency_stale');
  });

  it('최근 컨택·무응답 누적은 피로도로 감점한다', () => {
    const fatigued = scoreWinbackCandidate(
      student({
        last_contacted_at: '2026-08-08T00:00:00Z',
        reactivation_log: [{ outcome: 'no_response' }, { outcome: 'no_response' }],
      }),
      AP_BRIEF,
      { similarity: null, now: NOW }
    );
    const keys = fatigued.signals.map((s) => s.key);

    expect(keys).toContain('fatigue_recent_contact');
    expect(keys).toContain('fatigue_no_response');
    expect(fatigued.signals.filter((s) => s.delta < 0).length).toBeGreaterThanOrEqual(2);
  });

  it('과거 재활성화 성공과 동일 계열 결제 이력은 가점한다', () => {
    expect(signalKeys(student({ reactivation_log: [{ outcome: 'reactivated' }] }))).toContain(
      'prior_reactivated'
    );
    expect(signalKeys(student({ paid_categories: ['AP 정규 1:1 수업'] }))).toContain('repeat_buyer');
  });

  it('임베딩 유사도는 있으면 가점, 없으면 신호 자체가 없다', () => {
    const withSim = scoreWinbackCandidate(student(), AP_BRIEF, { similarity: 0.55, now: NOW });
    const without = scoreWinbackCandidate(student(), AP_BRIEF, { similarity: null, now: NOW });

    expect(withSim.score).toBeGreaterThan(without.score);
    expect(withSim.signals.map((s) => s.key)).toContain('embedding_similarity');
    expect(without.signals.map((s) => s.key)).not.toContain('embedding_similarity');
    // 유사도가 낮으면 사실상 가점이 없다
    expect(scoreWinbackCandidate(student(), AP_BRIEF, { similarity: 0.1, now: NOW }).score).toBe(
      without.score
    );
  });

  it('유사도 차이가 점수 차이로 남는다 — 상위권이 만점으로 뭉개지면 랭킹이 죽는다', () => {
    const high = scoreWinbackCandidate(student(), AP_BRIEF, { similarity: 0.68, now: NOW });
    const mid = scoreWinbackCandidate(student(), AP_BRIEF, { similarity: 0.6, now: NOW });
    const low = scoreWinbackCandidate(student(), AP_BRIEF, { similarity: 0.5, now: NOW });

    expect(high.score).toBeGreaterThan(mid.score);
    expect(mid.score).toBeGreaterThan(low.score);
  });

  it('rule_score는 임베딩을 제외한 점수 — degrade 시 비교 기준이 된다', () => {
    const r = scoreWinbackCandidate(student({ campaign_tags: ['AP 문의'] }), AP_BRIEF, {
      similarity: 0.6,
      now: NOW,
    });
    expect(r.rule_score).toBeLessThan(r.score);
  });

  it('점수는 0~100으로 클램프된다', () => {
    const best = scoreWinbackCandidate(
      student({
        campaign_tags: ['AP 문의', 'Calculus AB / BC'],
        school_type: 'AP',
        target_test_date: '2027-05-01',
        churn_tag: '미결제: 수업료 부담',
        updated_at: '2026-06-01T00:00:00Z',
        paid_categories: ['AP 정규 1:1 수업'],
        reactivation_log: [{ outcome: 'reactivated' }],
        consultation_timeline: [{ created_at: '2026-04-01T00:00:00Z', raw_memo: 'AP Calculus 문의' }],
      }),
      AP_BRIEF,
      { similarity: 0.9, now: NOW }
    );
    const worst = scoreWinbackCandidate(
      student({
        grade: '졸업',
        churn_tag: '환불: 종료',
        updated_at: '2023-01-01T00:00:00Z',
        last_contacted_at: '2026-08-10T00:00:00Z',
        reactivation_log: [{ outcome: 'no_response' }, { outcome: 'no_response' }],
      }),
      AP_BRIEF,
      { similarity: null, now: NOW }
    );

    expect(best.score).toBeLessThanOrEqual(100);
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(best.score).toBeGreaterThan(worst.score);
  });

  it('같은 입력이면 signals 순서까지 동일하다', () => {
    const s = student({ campaign_tags: ['AP 문의'], school_type: 'AP' });
    const a = scoreWinbackCandidate(s, AP_BRIEF, { similarity: 0.5, now: NOW });
    const b = scoreWinbackCandidate(s, AP_BRIEF, { similarity: 0.5, now: NOW });
    expect(a.signals).toEqual(b.signals);
  });

  it('weights로 신호 가중치를 덮어쓸 수 있다', () => {
    const s = student({ campaign_tags: ['AP 문의'] });
    const dflt = scoreWinbackCandidate(s, AP_BRIEF, { similarity: null, now: NOW });
    const boosted = scoreWinbackCandidate(s, AP_BRIEF, {
      similarity: null,
      now: NOW,
      weights: { campaign_tag_intent: 50 },
    });
    expect(boosted.score).toBeGreaterThan(dflt.score);
  });
});
