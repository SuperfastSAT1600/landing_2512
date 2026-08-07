import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import {
  listPlaudRecordings,
  listPlaudAccountKeys,
  getAccountLabel,
  type PlaudRecording,
} from '@/lib/plaud-client';

/**
 * GET /api/crm/plaud/recordings
 * Plaud 녹음 목록을 반환한다(관리자 인증 필요). 각 항목에 account_key/owner_label을 태깅한다.
 * account_key가 오면 해당 직원 계정만 조회하고(2단계 UI: 직원 선택 후), 없으면 설정된
 * 모든 계정을 병합해 시간순으로 반환한다. 일부 계정 실패는 건너뛰고(로그), 조회 대상 계정이
 * 모두 실패할 때만 502로 실제 원인을 노출한다.
 * Query: account_key(직원 계정), q(이름검색), date_from, date_to (YYYY-MM-DD), page, page_size.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || undefined;
  const date_from = searchParams.get('date_from')?.trim() || undefined;
  const date_to = searchParams.get('date_to')?.trim() || undefined;
  const page = Number(searchParams.get('page')) || 1;
  const page_size = Number(searchParams.get('page_size')) || 20;

  const opts = { query, date_from, date_to, page, page_size };
  // account_key가 오면 그 직원 계정만, 없으면 설정된 전 계정 병합.
  const accountParam = searchParams.get('account_key')?.trim();
  const keys = accountParam ? [accountParam] : listPlaudAccountKeys();

  const merged: PlaudRecording[] = [];
  const errors: string[] = [];
  let okCount = 0;

  await Promise.all(
    keys.map(async (key) => {
      try {
        const recs = await listPlaudRecordings(opts, key);
        const owner_label = getAccountLabel(key);
        for (const r of recs) merged.push({ ...r, account_key: key, owner_label });
        okCount += 1;
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        console.error(`[crm/plaud/recordings GET ${key}]`, e);
        errors.push(`${key}: ${reason}`);
      }
    })
  );

  // 성공한 계정이 하나도 없을 때만 실패로 취급(빈 결과여도 성공은 200). 원인을 노출해 진단 가능하게.
  if (okCount === 0) {
    const reason = errors.length
      ? errors.join('; ')
      : '설정된 Plaud 계정이 없습니다(seed env 미설정).';
    return NextResponse.json(
      { error: `Plaud 녹음 목록을 불러오지 못했습니다: ${reason}` },
      { status: 502 }
    );
  }

  // start_at(없으면 created_at) 기준 내림차순 병합. ISO/naive 문자열은 사전식 비교로 시간순 정렬됨.
  merged.sort((a, b) => {
    const ka = a.start_at || a.created_at || '';
    const kb = b.start_at || b.created_at || '';
    return kb.localeCompare(ka);
  });

  return NextResponse.json({ data: merged });
}
