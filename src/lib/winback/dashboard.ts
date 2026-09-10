import type { WinbackResponse } from '@/types/crm';

export interface DashboardTarget {
  status: string;
  variant_id: string | null;
  sent_at: string | null;
  response: WinbackResponse | null;
  reconnected_at: string | null;
  converted_at: string | null;
  conversion_amount: number | null;
}

export interface DashboardVariant {
  id: string;
  name: string;
}

export interface FunnelMetrics {
  targeted: number;
  sent: number;
  responded: number;
  reconnected: number;
  converted: number;
  revenue: number;
  send_rate: number | null;
  response_rate: number | null;
  reconnection_rate: number | null;
  conversion_rate: number | null;
}

export interface WinbackDashboard {
  overall: FunnelMetrics;
  variants: Array<FunnelMetrics & { id: string; name: string }>;
}

function rate(value: number, denominator: number): number | null {
  return denominator > 0 ? Math.round((value / denominator) * 1000) / 10 : null;
}

function aggregate(targets: DashboardTarget[]): FunnelMetrics {
  const active = targets.filter((target) => target.status !== 'skipped');
  const sent = active.filter((target) => Boolean(target.sent_at));
  const responded = sent.filter((target) => target.response && target.response !== 'none');
  const reconnected = sent.filter((target) => Boolean(target.reconnected_at));
  const converted = sent.filter((target) => Boolean(target.converted_at));
  const revenue = converted.reduce((sum, target) => sum + (target.conversion_amount ?? 0), 0);
  return {
    targeted: active.length,
    sent: sent.length,
    responded: responded.length,
    reconnected: reconnected.length,
    converted: converted.length,
    revenue,
    send_rate: rate(sent.length, active.length),
    response_rate: rate(responded.length, sent.length),
    reconnection_rate: rate(reconnected.length, sent.length),
    conversion_rate: rate(converted.length, sent.length),
  };
}

export function aggregateWinbackDashboard(
  targets: DashboardTarget[],
  variants: DashboardVariant[]
): WinbackDashboard {
  return {
    overall: aggregate(targets),
    variants: variants.map((variant) => ({ id: variant.id, name: variant.name, ...aggregate(targets.filter((target) => target.variant_id === variant.id)) })),
  };
}
