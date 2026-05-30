/**
 * 전체 리드풀 임베딩 일괄 생성
 * 실행: npx tsx scripts/generate-embeddings.ts
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildText(student: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push(`이름: ${student.name}`);
  if (student.grade) lines.push(`학년: ${student.grade}`);
  if (student.school_type) lines.push(`학제: ${student.school_type}`);
  if (student.desired_subjects) lines.push(`과목: ${student.desired_subjects}`);
  const rw = student.previous_rw_score as number | null;
  const math = student.previous_math_score as number | null;
  if (rw != null && math != null) lines.push(`직전 점수: RW ${rw} / Math ${math} (합계 ${rw + math})`);
  else if (rw != null) lines.push(`직전 RW: ${rw}`);
  else if (math != null) lines.push(`직전 Math: ${math}`);
  if (student.target_score) lines.push(`목표 점수: ${student.target_score}`);
  if (student.churn_type || student.churn_tag) lines.push(`이탈: ${student.churn_type ?? '-'} / ${student.churn_tag ?? '-'}`);
  if (student.traffic_source) lines.push(`유입: ${student.traffic_source}`);
  if (student.b2b_partner) lines.push(`B2B: ${student.b2b_partner}`);

  const timeline = ((student.consultation_timeline as Array<Record<string, string>>) ?? [])
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  if (timeline.length > 0) {
    lines.push('\n[상담 기록]');
    for (const e of timeline) {
      const date = e.created_at?.slice(0, 10) ?? '';
      const memo = (e.ai_purified ?? e.raw_memo ?? '').trim();
      if (memo) lines.push(`${date}: ${memo}`);
    }
  }
  return lines.join('\n').slice(0, 8000);
}

async function main() {
  // 임베딩 없는 비활성 학생만 대상
  let offset = 0;
  const BATCH = 100;
  let totalProcessed = 0;
  let totalFailed = 0;

  while (true) {
    // 항상 offset 0 — 처리 완료된 레코드는 embedding IS NULL 필터에서 제외되므로
    const { data: students, error } = await supabase
      .from('students')
      .select('id, name, grade, school_type, desired_subjects, previous_rw_score, previous_math_score, target_score, churn_type, churn_tag, traffic_source, b2b_partner, lead_status, consultation_timeline, reactivation_log')
      .in('lead_status', ['inactive', 'reactivating'])
      .is('embedding', null)
      .limit(BATCH);

    if (error) { console.error('fetch error', error); break; }
    if (!students || students.length === 0) break;

    console.log(`처리 중: ${totalProcessed + 1} ~ ${totalProcessed + students.length}번째`);

    for (const student of students) {
      try {
        const text = buildText(student as Record<string, unknown>);
        const res = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text,
        });
        const embedding = res.data[0].embedding;

        await supabase
          .from('students')
          .update({ embedding: JSON.stringify(embedding) })
          .eq('id', student.id);

        totalProcessed++;
      } catch (err) {
        console.error(`실패: ${student.id} (${(student as Record<string,string>).name})`, err);
        totalFailed++;
      }
    }

    // Rate limit 준수: 100건마다 1초 대기
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n완료: 성공 ${totalProcessed}건 / 실패 ${totalFailed}건`);
}

main().catch(console.error);
