import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { LeadPool } from '../LeadPool';
import type { Student } from '@/types/crm';

const DAY_MS = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

function student(over: Record<string, unknown>): Student {
  return {
    id: 'x',
    name: 'x',
    grade: '11',
    lead_status: 'inactive',
    churn_tag: null,
    churn_type: null,
    traffic_source: null,
    updated_at: ago(10),
    stage_history: [],
    consultation_timeline: [],
    reactivation_log: [],
    ...over,
  } as unknown as Student;
}

const KIM = student({
  id: 's1',
  name: '김가',
  grade: '11',
  churn_type: 'closed',
  churn_tag: '노쇼: 연락 두절',
  traffic_source: '소개',
  updated_at: ago(10),
  stage_history: [{ stage: '2' }, { stage: 'churned' }],
  consultation_timeline: [
    { id: 'c1', created_at: ago(12), raw_memo: '영어 학원 고민', ai_purified: null },
  ],
});
const LEE = student({
  id: 's2',
  name: '이나',
  grade: '10',
  churn_type: 'potential',
  churn_tag: '회신 없음',
  traffic_source: '인스타그램 광고',
  updated_at: ago(100),
});
const PARK = student({
  id: 's3',
  name: '박다',
  grade: '11',
  updated_at: ago(200),
  churn_stage_manual: '3a',
});
const CHOI = student({
  id: 's4',
  name: '최라',
  grade: '12',
  lead_status: 'reactivating',
  reactivation_log: [{ attempted_at: ago(3), outcome: 'reactivated' }],
});

type Call = { url: string; init?: RequestInit };
let calls: Call[];

function mockFetch(pool: Student[], extra: Record<string, unknown> = {}) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const ok = (data: unknown) => ({ ok: true, json: async () => ({ data }) });
      if (url.includes('stats_only')) return ok({ inactive: 3, reactivating: 1 });
      if (url.startsWith('/api/crm/students?pool=true')) return ok(pool);
      if (url === '/api/crm/retry-strategies') return ok(extra.strategies ?? []);
      if (url.includes('/retry-strategies/')) return { ok: true, json: async () => ({}) };
      return ok([]);
    })
  );
}

function renderPool(props: Partial<React.ComponentProps<typeof LeadPool>> = {}) {
  return render(
    <LeadPool
      adminKey="k"
      onStudentUpdate={vi.fn()}
      onStudentClick={vi.fn()}
      onRefetch={vi.fn()}
      {...props}
    />
  );
}

const shown = (name: string) => screen.queryByText(name) !== null;
const three = () => [shown('김가'), shown('이나'), shown('박다')];
const pick = (display: string, value: string) =>
  fireEvent.change(screen.getByDisplayValue(display), { target: { value } });

beforeEach(() => {
  localStorage.setItem('admin_key', 'k');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('LeadPool — 목록/탭', () => {
  it('이탈 탭은 inactive 학생만 카드로 보여주고 요약 카드에 통계 카운트를 쓴다', async () => {
    mockFetch([KIM, LEE, PARK, CHOI]);
    renderPool();
    expect(await screen.findByText('김가')).toBeTruthy();
    expect(three()).toEqual([true, true, true]);
    expect(shown('최라')).toBe(false);
    expect(await screen.findByText('이탈 학생 (3)')).toBeTruthy();
    expect(screen.getByText('재활성화 시도 중 (1)')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy(); // 성공률: reactivated 1 / decided 1
    expect(screen.getByText('전체 선택 (3명)')).toBeTruthy();
  });

  it('재활성화 탭은 reactivating 학생만 보여준다', async () => {
    mockFetch([KIM, LEE, PARK, CHOI]);
    renderPool();
    await screen.findByText('김가');
    fireEvent.click(screen.getByText('재활성화 시도 중 (1)'));
    expect(shown('최라')).toBe(true);
    expect(shown('김가')).toBe(false);
    expect(screen.getAllByText('재활성화').length).toBeGreaterThan(0); // OUTCOME_LABELS
  });

  it('조건에 맞는 학생이 없으면 안내 문구를 보여준다', async () => {
    mockFetch([CHOI]);
    renderPool();
    expect(await screen.findByText('조건에 맞는 이탈 학생이 없습니다.')).toBeTruthy();
  });

  it('카드 클릭은 onStudentClick을 호출한다', async () => {
    mockFetch([KIM]);
    const onStudentClick = vi.fn();
    renderPool({ onStudentClick });
    fireEvent.click(await screen.findByText('김가'));
    expect(onStudentClick).toHaveBeenCalledWith(KIM);
  });

  it('진입 시 빈 검색으로 전체 풀을 불러온다', async () => {
    mockFetch([KIM]);
    renderPool();
    await screen.findByText('김가');
    expect(calls.some((c) => c.url === '/api/crm/students?pool=true&search=')).toBe(true);
    expect(calls.some((c) => c.url === '/api/crm/students?pool=true&stats_only=true')).toBe(true);
  });

  it('풀 로드 실패 시 에러 메시지를 보여준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('stats_only')
          ? { ok: true, json: async () => ({ data: {} }) }
          : url.includes('pool=true&search')
            ? { ok: false, json: async () => ({}) }
            : { ok: true, json: async () => ({ data: [] }) }
      )
    );
    renderPool();
    expect(await screen.findByText('리드풀 데이터를 불러오지 못했습니다.')).toBeTruthy();
  });
});

describe('LeadPool — 필터', () => {
  async function setup() {
    mockFetch([KIM, LEE, PARK, CHOI]);
    renderPool();
    await screen.findByText('김가');
  }

  it('churnType', async () => {
    await setup();
    pick('이탈 유형 전체', 'closed');
    expect(three()).toEqual([true, false, false]);
  });

  it('churnTag는 prefix로 매칭한다', async () => {
    await setup();
    pick('이탈 사유 전체', '노쇼');
    expect(three()).toEqual([true, false, false]);
  });

  it('churnStage 셀렉트 (단계 / 미상)', async () => {
    await setup();
    pick('이탈 단계 전체', '3a');
    expect(three()).toEqual([false, false, true]);
    pick('진단테스트 대기 (콜 전) (1)', '__none__');
    expect(three()).toEqual([false, true, false]);
  });

  it('churnStage 칩은 토글된다', async () => {
    await setup();
    const chip = () => screen.getByRole('button', { name: /^세일즈 콜 예약 확정 1$/ });
    fireEvent.click(chip());
    expect(three()).toEqual([true, false, false]);
    fireEvent.click(chip());
    expect(three()).toEqual([true, true, true]);
  });

  it('grade 옵션은 이탈 학생 학년만 정렬해 보여주고 필터한다', async () => {
    await setup();
    const sel = screen.getByDisplayValue('학년 전체') as HTMLSelectElement;
    expect(Array.from(sel.options).map((o) => o.value)).toEqual(['', '10', '11']);
    pick('학년 전체', '10');
    expect(three()).toEqual([false, true, false]);
  });

  it('daysSinceChurn', async () => {
    await setup();
    pick('기간 전체', '30');
    expect(three()).toEqual([true, false, false]);
    pick('30일 이내', '180');
    expect(three()).toEqual([true, true, false]);
  });

  it('keyword는 상담 메모에서 찾는다', async () => {
    await setup();
    fireEvent.change(screen.getByPlaceholderText('상담 내용 키워드 검색...'), {
      target: { value: '학원' },
    });
    expect(three()).toEqual([true, false, false]);
  });

  it('초기화 버튼은 필터가 있을 때만 보이고 모두 되돌린다', async () => {
    await setup();
    expect(screen.queryByText('초기화')).toBeNull();
    pick('학년 전체', '10');
    fireEvent.click(screen.getByText('초기화'));
    expect(three()).toEqual([true, true, true]);
    expect(screen.queryByText('초기화')).toBeNull();
  });

  it('재활성화 탭에서는 필터 바가 없다', async () => {
    await setup();
    fireEvent.click(screen.getByText('재활성화 시도 중 (1)'));
    expect(screen.queryByPlaceholderText('상담 내용 키워드 검색...')).toBeNull();
  });
});

describe('LeadPool — 선택/일괄 액션', () => {
  it('카드를 선택하면 일괄 액션 바가 나타나고 탭 전환 시 선택이 비워진다', async () => {
    mockFetch([KIM, LEE, PARK, CHOI]);
    renderPool();
    await screen.findByText('김가');
    expect(screen.queryByText(/명 선택됨/)).toBeNull();
    const boxes = screen.getAllByRole('checkbox');
    fireEvent.click(boxes[1]); // [0]=전체 선택, [1]=첫 카드
    expect(screen.getByText('1명 선택됨')).toBeTruthy();
    expect(screen.getByText('연락 기록')).toBeTruthy();
    expect(screen.getByText('재활성화 시작')).toBeTruthy();
    expect(screen.getByText('재시도 배정')).toBeTruthy();
    fireEvent.click(screen.getByText('재활성화 시도 중 (1)'));
    expect(screen.queryByText(/명 선택됨/)).toBeNull();
  });

  it('전체 선택은 토글된다', async () => {
    mockFetch([KIM, LEE, PARK]);
    renderPool();
    await screen.findByText('김가');
    const all = screen.getAllByRole('checkbox')[0];
    fireEvent.click(all);
    expect(screen.getByText('3명 선택됨')).toBeTruthy();
    fireEvent.click(all);
    expect(screen.queryByText(/명 선택됨/)).toBeNull();
  });

  it('재시도 배정: 전략 선택 후 POST하고 성공 배너를 띄운다', async () => {
    mockFetch([KIM], { strategies: [{ id: 'st1', name: '봄 전략' }] });
    const onRetryAssignSuccess = vi.fn();
    renderPool({ onRetryAssignSuccess });
    await screen.findByText('김가');
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByText('재시도 배정'));
    fireEvent.click(await screen.findByText('봄 전략'));
    expect(await screen.findByText('1명이 "봄 전략" 전략에 배정되었습니다.')).toBeTruthy();
    const post = calls.find((c) => c.url === '/api/crm/retry-strategies/st1/students');
    expect(post?.init?.method).toBe('POST');
    expect(JSON.parse(post?.init?.body as string)).toEqual({ student_ids: ['s1'] });
    expect(onRetryAssignSuccess).toHaveBeenCalled();
    expect(screen.queryByText(/명 선택됨/)).toBeNull();
    fireEvent.click(screen.getByText('닫기'));
    expect(screen.queryByText(/전략에 배정되었습니다/)).toBeNull();
  });

  it('retryContext가 있으면 배너와 즉시 배정 버튼을 보여준다', async () => {
    mockFetch([KIM]);
    renderPool({ retryContext: { id: 'st9', name: '여름' } });
    await screen.findByText('김가');
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByText('"여름" 배정'));
    await waitFor(() =>
      expect(calls.some((c) => c.url === '/api/crm/retry-strategies/st9/students')).toBe(true)
    );
  });

  it('이탈 단계 수동 지정은 onStudentUpdate를 호출하고 카드에 반영한다', async () => {
    mockFetch([LEE]);
    const onStudentUpdate = vi.fn();
    renderPool({ onStudentUpdate });
    await screen.findByText('이나');
    fireEvent.change(screen.getByTitle('이탈 단계 수동 지정'), { target: { value: '1' } });
    expect(onStudentUpdate).toHaveBeenCalledWith('s2', { churn_stage_manual: '1' });
    expect(screen.getByText('✘ 첫 메시지 발송 이탈')).toBeTruthy();
  });
});

describe('LeadPool — 페이징', () => {
  it('50명 초과 시 페이지 이동이 동작한다', async () => {
    const many = Array.from({ length: 55 }, (_, i) =>
      student({ id: `m${i}`, name: `학생${String(i).padStart(2, '0')}` })
    );
    mockFetch(many);
    renderPool();
    await screen.findByText('학생00');
    expect(screen.getByText('1 / 2 페이지 · 총 55명')).toBeTruthy();
    expect(shown('학생54')).toBe(false);
    fireEvent.click(screen.getByText('다음'));
    expect(shown('학생54')).toBe(true);
    expect(shown('학생00')).toBe(false);
    expect(screen.getByText('2 / 2 페이지 · 총 55명')).toBeTruthy();
  });
});
