import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import {
  computeStageFlow,
  FUNNEL_FLOW_ORDER,
  type StageFlowRow,
  type StageHistoryEntry,
} from '@/lib/funnel-stats';
import { FUNNEL_STAGE_LABELS, type FunnelStage } from '@/types/crm';
import { MAX_LEAD_ROWS } from '@/lib/crm-stats-core';

// 영업 진행중 = 세일즈 단계(수업중 '8' 제외). churned는 FUNNEL_FLOW_ORDER에 없음.
const ACTIVE_SALES_STAGES = FUNNEL_FLOW_ORDER.filter((s) => s !== '8');
const ACTIVE_SET = new Set<string>(ACTIVE_SALES_STAGES);

export interface B2bPipelineStageCount {
  stage: FunnelStage;
  label: string;
  count: number;
}

export interface B2bPipelineCompany {
  company_id: string;
  company_name: string;
  in_sales: boolean;
  active_lead_count: number;
  enrolled_count: number;
  lost_count: number;
  by_stage: B2bPipelineStageCount[];
  stage_flow: StageFlowRow[];
  latest_activity_at: string | null;
}

export interface B2bPipelineData {
  companies: B2bPipelineCompany[];
  overview: {
    companies_in_sales: number;
    total_active_leads: number;
    by_stage: B2bPipelineStageCount[];
  };
  stage_flow: StageFlowRow[];
}

interface PipeStudent {
  id: string;
  name: string;
  company_id: string | null;
  funnel_stage: string;
  funnel_stage_updated_at: string | null;
  stage_history: StageHistoryEntry[] | null;
  lead_status: string;
  created_at: string;
}

const emptyStageCounts = (): B2bPipelineStageCount[] =>
  ACTIVE_SALES_STAGES.map((stage) => ({ stage, label: FUNNEL_STAGE_LABELS[stage], count: 0 }));

/**
 * GET /api/crm/b2b/pipeline
 * 현재 영업 진행중인 업체 스냅샷(기간 없음). 활성 리드가 세일즈 단계(0~7)에 있는 업체만.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: companies, error: cErr } = await supabaseAdmin
    .from('companies')
    .select('id,name')
    .order('name');
  if (cErr) {
    console.error('[b2b/pipeline companies]', cErr);
    return NextResponse.json({ error: '업체 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
  const companyName = new Map<string, string>((companies ?? []).map((c) => [c.id, c.name]));

  const { data: students, error: sErr } = await supabaseAdmin
    .from('students')
    .select('id,name,company_id,funnel_stage,funnel_stage_updated_at,stage_history,lead_status,created_at')
    .not('company_id', 'is', null)
    .limit(MAX_LEAD_ROWS);
  if (sErr) {
    console.error('[b2b/pipeline students]', sErr);
    return NextResponse.json({ error: 'B2B 리드를 불러오지 못했습니다.' }, { status: 500 });
  }
  const rows = (students ?? []) as PipeStudent[];

  type Acc = {
    active: PipeStudent[];
    enrolled: number;
    lost: number;
    byStage: Map<string, number>;
    latest: string | null;
  };
  const acc = new Map<string, Acc>();
  const ensure = (cid: string): Acc => {
    if (!acc.has(cid)) acc.set(cid, { active: [], enrolled: 0, lost: 0, byStage: new Map(), latest: null });
    return acc.get(cid)!;
  };

  for (const s of rows) {
    if (!s.company_id) continue;
    const a = ensure(s.company_id);
    if (s.funnel_stage === '8') a.enrolled++;
    else if (s.funnel_stage === 'churned') a.lost++;
    // 영업 진행중 = 활성 리드 && 세일즈 단계
    if (s.lead_status === 'active' && ACTIVE_SET.has(s.funnel_stage)) {
      a.active.push(s);
      a.byStage.set(s.funnel_stage, (a.byStage.get(s.funnel_stage) ?? 0) + 1);
      if (s.funnel_stage_updated_at && (!a.latest || s.funnel_stage_updated_at > a.latest)) {
        a.latest = s.funnel_stage_updated_at;
      }
    }
  }

  const companiesOut: B2bPipelineCompany[] = [];
  const overallByStage = new Map<string, number>();
  const allActive: PipeStudent[] = [];

  for (const [cid, a] of acc) {
    if (a.active.length === 0) continue; // in_sales 업체만
    for (const [st, n] of a.byStage) overallByStage.set(st, (overallByStage.get(st) ?? 0) + n);
    allActive.push(...a.active);
    companiesOut.push({
      company_id: cid,
      company_name: companyName.get(cid) ?? '(알 수 없음)',
      in_sales: true,
      active_lead_count: a.active.length,
      enrolled_count: a.enrolled,
      lost_count: a.lost,
      by_stage: ACTIVE_SALES_STAGES.map((stage) => ({
        stage,
        label: FUNNEL_STAGE_LABELS[stage],
        count: a.byStage.get(stage) ?? 0,
      })),
      stage_flow: computeStageFlow(a.active),
      latest_activity_at: a.latest,
    });
  }
  companiesOut.sort((x, y) => y.active_lead_count - x.active_lead_count || x.company_name.localeCompare(y.company_name));

  const overview = {
    companies_in_sales: companiesOut.length,
    total_active_leads: allActive.length,
    by_stage: emptyStageCounts().map((s) => ({ ...s, count: overallByStage.get(s.stage) ?? 0 })),
  };

  const data: B2bPipelineData = { companies: companiesOut, overview, stage_flow: computeStageFlow(allActive) };
  return NextResponse.json({ data });
}
