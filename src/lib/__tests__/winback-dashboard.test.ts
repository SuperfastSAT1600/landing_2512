import { describe, expect, it } from 'vitest';
import { aggregateWinbackDashboard } from '@/lib/winback/dashboard';

describe('aggregateWinbackDashboard', () => {
  it('excludes skipped targets and calculates funnel rates and revenue', () => {
    const result = aggregateWinbackDashboard([
      { status: 'queued', variant_id: 'a', sent_at: '2026-08-01', response: 'positive', reconnected_at: '2026-08-02', converted_at: '2026-08-03', conversion_amount: 100000 },
      { status: 'skipped', variant_id: 'a', sent_at: null, response: 'none', reconnected_at: null, converted_at: null, conversion_amount: null },
      { status: 'sent', variant_id: 'b', sent_at: '2026-08-01', response: 'none', reconnected_at: null, converted_at: null, conversion_amount: null },
    ], [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]);
    expect(result.overall).toMatchObject({ targeted: 2, sent: 2, responded: 1, reconnected: 1, converted: 1, revenue: 100000, conversion_rate: 50 });
    expect(result.variants[0]).toMatchObject({ name: 'A', targeted: 1, converted: 1 });
  });

  it('returns null rates for empty denominators', () => {
    expect(aggregateWinbackDashboard([], []).overall).toMatchObject({ targeted: 0, sent: 0, conversion_rate: null });
  });
});
