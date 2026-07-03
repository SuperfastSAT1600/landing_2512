// @vitest-environment node
/// <reference types="vitest/globals" />

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import { logLeadEvent, LEAD_EVENT_DEDUP_MINUTES } from '../lead-events';

// Fluent chain mock: select().eq().eq().gte().limit().maybeSingle() + insert()
function makeChain(opts: {
  recentEvent?: unknown;
  insertError?: { message: string } | null;
}) {
  const insertSpy = vi.fn().mockResolvedValue({ error: opts.insertError ?? null });
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  ['select', 'eq', 'gte', 'limit'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain['maybeSingle'] = vi.fn().mockResolvedValue({ data: opts.recentEvent ?? null, error: null });
  chain['insert'] = insertSpy;
  return { chain, insertSpy };
}

describe('logLeadEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts an event and returns true', async () => {
    const { chain, insertSpy } = makeChain({});
    mockFrom.mockReturnValue(chain);

    const ok = await logLeadEvent('stu-1', 'portal_viewed');
    expect(ok).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('lead_events');
    expect(insertSpy).toHaveBeenCalledWith([
      { student_id: 'stu-1', event_type: 'portal_viewed', metadata: {} },
    ]);
  });

  it('passes metadata through', async () => {
    const { chain, insertSpy } = makeChain({});
    mockFrom.mockReturnValue(chain);

    await logLeadEvent('stu-1', 'diagnostic_submitted', {
      metadata: { matched_by: 'token', result_id: 'r-1' },
    });
    expect(insertSpy.mock.calls[0][0][0].metadata).toEqual({
      matched_by: 'token',
      result_id: 'r-1',
    });
  });

  it('skips insert when a same-type event exists within the dedup window', async () => {
    const { chain, insertSpy } = makeChain({ recentEvent: { id: 'ev-1' } });
    mockFrom.mockReturnValue(chain);

    const ok = await logLeadEvent('stu-1', 'portal_viewed', {
      dedupMinutes: LEAD_EVENT_DEDUP_MINUTES,
    });
    expect(ok).toBe(false);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('inserts when no recent event exists within the dedup window', async () => {
    const { chain, insertSpy } = makeChain({ recentEvent: null });
    mockFrom.mockReturnValue(chain);

    const ok = await logLeadEvent('stu-1', 'portal_viewed', { dedupMinutes: 30 });
    expect(ok).toBe(true);
    expect(insertSpy).toHaveBeenCalled();
  });

  it('returns false without throwing when the insert fails', async () => {
    const { chain } = makeChain({ insertError: { message: 'boom' } });
    mockFrom.mockReturnValue(chain);

    await expect(logLeadEvent('stu-1', 'portal_viewed')).resolves.toBe(false);
  });

  it('returns false without throwing when the query throws', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('connection lost');
    });

    await expect(logLeadEvent('stu-1', 'portal_viewed')).resolves.toBe(false);
  });
});
