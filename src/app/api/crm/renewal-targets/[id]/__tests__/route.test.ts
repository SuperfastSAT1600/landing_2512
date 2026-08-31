import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

let lastBuilder: Record<string, ReturnType<typeof vi.fn>>;

function makeBuilder(result: { data: unknown; error: null | { message: string; code?: string } }) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'eq', 'in', 'is', 'lt', 'gte', 'insert', 'upsert', 'update', 'delete']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() => builder);
  builder.then = (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  lastBuilder = builder as Record<string, ReturnType<typeof vi.fn>>;
  return builder;
}

/** 직전 쿼리에 전달된 update payload. */
function updatePayload(): Record<string, unknown> {
  return lastBuilder.update.mock.calls[0][0] as Record<string, unknown>;
}

const mockFrom = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

const params = Promise.resolve({ id: 'rt-1' });

function makeReq(method: 'PATCH' | 'DELETE', body?: Record<string, unknown>, key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/renewal-targets/rt-1', {
    method,
    headers: { 'x-admin-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const baseTarget = {
  id: 'rt-1',
  student_id: 's-1',
  week_start: '2026-08-10',
  stage: '2',
  stage_updated_at: '2026-08-10T00:00:00Z',
  converted_payment_id: null,
  drop_reason: null,
  outcome_quality: null,
  created_by: null,
  created_at: '2026-08-10T00:00:00Z',
  updated_at: '2026-08-10T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/crm/renewal-targets/[id]', () => {
  it('rejects a wrong admin key → 401', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { stage: '3' }, 'nope'), { params });
    expect(res.status).toBe(401);
  });

  it('updates stage and refreshes stage_updated_at → 200', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({
        data: { ...baseTarget, stage: '3', stage_updated_at: '2026-08-11T00:00:00Z' },
        error: null,
      })
    );
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { stage: '3' }), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.stage).toBe('3');
  });

  it('stores converted_payment_id when stage is 4 → 200', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({
        data: { ...baseTarget, stage: '4', converted_payment_id: 'pay-1' },
        error: null,
      })
    );
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { stage: '4', converted_payment_id: 'pay-1' }), {
      params,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.converted_payment_id).toBe('pay-1');
  });

  it('stores drop_reason when stage is 5 (미전환) → 200', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({ data: { ...baseTarget, stage: '5', drop_reason: '예산' }, error: null })
    );
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { stage: '5', drop_reason: '예산' }), { params });
    expect(res.status).toBe(200);
    expect(updatePayload().drop_reason).toBe('예산');
    const json = await res.json();
    expect(json.data.stage).toBe('5');
  });

  it('ignores drop_reason on non-terminal stages', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: { ...baseTarget, stage: '2' }, error: null }));
    const { PATCH } = await import('../route');
    await PATCH(makeReq('PATCH', { stage: '2', drop_reason: '예산' }), { params });
    expect(updatePayload()).not.toHaveProperty('drop_reason');
  });

  it('clears drop_reason when reopening a 미전환 target', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: { ...baseTarget, stage: '2' }, error: null }));
    const { PATCH } = await import('../route');
    await PATCH(makeReq('PATCH', { stage: '2', clear_drop_reason: true }), { params });
    expect(updatePayload().drop_reason).toBeNull();
  });

  it('joins the student so the response shape matches GET/POST → 200', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({
        data: { ...baseTarget, stage: '3', student: { id: 's-1', name: '김학생' } },
        error: null,
      })
    );
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { stage: '3' }), { params });
    const json = await res.json();
    expect(json.data.student.name).toBe('김학생');
    expect(lastBuilder.select.mock.calls[0][0]).toContain('student:students(');
  });

  it('rejects an invalid stage → 400', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { stage: '9' }), { params });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/crm/renewal-targets/[id] — 결과 품질 (REQ-003)', () => {
  it('stores outcome_quality when stage is 4 → 200', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({ data: { ...baseTarget, stage: '4', outcome_quality: 'good' }, error: null })
    );
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { stage: '4', outcome_quality: 'good' }), { params });
    expect(res.status).toBe(200);
    expect(updatePayload().outcome_quality).toBe('good');
  });

  it('stores outcome_quality alongside drop_reason when stage is 5 → 200', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({
        data: { ...baseTarget, stage: '5', drop_reason: '예산', outcome_quality: 'bad' },
        error: null,
      })
    );
    const { PATCH } = await import('../route');
    const res = await PATCH(
      makeReq('PATCH', { stage: '5', drop_reason: '예산', outcome_quality: 'bad' }),
      { params }
    );
    expect(res.status).toBe(200);
    expect(updatePayload().outcome_quality).toBe('bad');
    expect(updatePayload().drop_reason).toBe('예산');
  });

  it('clears outcome_quality when leaving a terminal stage (되돌리기 5 → 2)', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: { ...baseTarget, stage: '2' }, error: null }));
    const { PATCH } = await import('../route');
    await PATCH(makeReq('PATCH', { stage: '2', clear_drop_reason: true }), { params });
    expect(updatePayload().outcome_quality).toBeNull();
  });

  it('keeps an existing quality when the pendingConversion retry re-sends stage 4', async () => {
    // 결제 후 단계 이동만 실패했을 때의 재시도 — 품질 필드를 안 보내므로 건드리면 안 된다.
    mockFrom.mockReturnValueOnce(
      makeBuilder({ data: { ...baseTarget, stage: '4' }, error: null })
    );
    const { PATCH } = await import('../route');
    await PATCH(makeReq('PATCH', { stage: '4', converted_payment_id: 'pay-1' }), { params });
    expect(updatePayload()).not.toHaveProperty('outcome_quality');
  });

  it('sets quality retroactively without touching stage_updated_at → 200', async () => {
    // 소급 경로는 from()을 두 번 부른다 — 현재 stage 조회용, 그다음 update용.
    mockFrom.mockReturnValueOnce(makeBuilder({ data: { stage: '4' }, error: null }));
    mockFrom.mockReturnValueOnce(
      makeBuilder({ data: { ...baseTarget, stage: '4', outcome_quality: 'good' }, error: null })
    );
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { outcome_quality: 'good' }), { params });
    expect(res.status).toBe(200);
    expect(updatePayload().outcome_quality).toBe('good');
    // D+N 경과일과 목록 정렬이 리셋되면 안 된다.
    expect(updatePayload()).not.toHaveProperty('stage_updated_at');
    expect(updatePayload()).not.toHaveProperty('stage');
  });

  it('clears quality retroactively when null is sent → 200', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: { stage: '5' }, error: null }));
    mockFrom.mockReturnValueOnce(
      makeBuilder({ data: { ...baseTarget, stage: '5', outcome_quality: null }, error: null })
    );
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { outcome_quality: null }), { params });
    expect(res.status).toBe(200);
    expect(updatePayload().outcome_quality).toBeNull();
  });

  it('rejects a retroactive quality on a non-terminal row → 400', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: { stage: '2' }, error: null }));
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { outcome_quality: 'good' }), { params });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('INVALID_OUTCOME_QUALITY');
  });

  it('returns 404 when the retroactive target does not exist', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'no rows' } }));
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { outcome_quality: 'good' }), { params });
    expect(res.status).toBe(404);
  });

  it('rejects an invalid outcome_quality → 400', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { stage: '4', outcome_quality: 'meh' }), { params });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('INVALID_OUTCOME_QUALITY');
  });

  it('rejects a body with no updatable field → 400', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', {}), { params });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('NO_UPDATABLE_FIELDS');
  });
});

describe('DELETE /api/crm/renewal-targets/[id]', () => {
  it('rejects a wrong admin key → 401', async () => {
    const { DELETE } = await import('../route');
    const res = await DELETE(makeReq('DELETE', undefined, 'nope'), { params });
    expect(res.status).toBe(401);
  });

  it('deletes the target and returns id → 200', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: [], error: null }));
    const { DELETE } = await import('../route');
    const res = await DELETE(makeReq('DELETE'), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe('rt-1');
  });
});

describe('PATCH /api/crm/renewal-targets/[id] — 이월된 행', () => {
  it('이월되지 않은 행만 수정한다', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: { ...baseTarget, stage: '3' }, error: null }));
    const { PATCH } = await import('../route');
    await PATCH(makeReq('PATCH', { stage: '3' }), { params });
    expect(lastBuilder.is).toHaveBeenCalledWith('carried_to_week', null);
  });

  it('이월된 행에 온 단계 변경은 500 이 아니라 409 다 (오래된 탭)', async () => {
    // 0행 매칭 → PGRST116. 가드가 없으면 carried_stage_check 위반으로 500 이 난다.
    mockFrom.mockReturnValueOnce(
      makeBuilder({ data: null, error: { message: 'no rows', code: 'PGRST116' } })
    );
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { stage: '4' }), { params });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe('ALREADY_CARRIED');
  });
});
