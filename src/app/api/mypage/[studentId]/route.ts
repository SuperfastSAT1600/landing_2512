import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import type { ParentStudentView } from '@/types/crm';
import { getParentStatus } from '@/types/crm';

const BCRYPT_ROUNDS = 12;
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

/**
 * Verifies the x-passcode header against the stored hash.
 * Returns { ok: true } or { ok: false, reason: string }.
 */
async function verifyPasscode(
  storedHash: string | null,
  lockedUntil: string | null,
  attempts: number,
  passcode: string
): Promise<{ ok: boolean; reason?: string }> {
  if (!storedHash) return { ok: false, reason: 'needs_setup' };

  if (lockedUntil && new Date(lockedUntil) > new Date()) {
    return { ok: false, reason: 'locked' };
  }

  const match = await bcrypt.compare(passcode, storedHash);
  return match ? { ok: true } : { ok: false, reason: 'invalid' };
}

/**
 * GET /api/mypage/[studentId]
 * Returns parent-facing student view.
 * Authentication: x-passcode header (bcrypt compared to stored hash).
 */
export async function GET(
  request: NextRequest,
  { params: _pstudentId }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await _pstudentId;
  type StudentRow = {
    id: string;
    name: string;
    grade: string;
    lead_status: import('@/types/crm').LeadStatus;
    funnel_stage: import('@/types/crm').FunnelStage;
    passcode_hash: string | null;
    passcode_attempts: number;
    passcode_locked_until: string | null;
    ot_datetime: string | null;
    weekly_schedule: import('@/types/crm').WeeklySlot[] | null;
    parent_timezone: string | null;
    consultation_timeline: import('@/types/crm').ConsultationEntry[];
  };

  const { data: studentRaw, error: fetchError } = await supabaseAdmin
    .from('students')
    .select(
      'id, name, grade, lead_status, funnel_stage, passcode_hash, ' +
      'passcode_attempts, passcode_locked_until, ' +
      'ot_datetime, weekly_schedule, parent_timezone, consultation_timeline'
    )
    .eq('id', studentId)
    .single();

  if (fetchError || !studentRaw) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const student = studentRaw as unknown as StudentRow;

  // No passcode set yet
  if (!student.passcode_hash) {
    return NextResponse.json({ data: { needs_setup: true } });
  }

  const passcode = request.headers.get('x-passcode');
  if (!passcode) {
    return NextResponse.json({ error: 'x-passcode header required' }, { status: 401 });
  }

  const verification = await verifyPasscode(
    student.passcode_hash,
    student.passcode_locked_until,
    student.passcode_attempts,
    passcode
  );

  if (!verification.ok) {
    if (verification.reason === 'locked') {
      return NextResponse.json({ error: 'Passcode locked. Try again later.' }, { status: 423 });
    }

    // Increment attempts on invalid passcode
    const newAttempts = (student.passcode_attempts ?? 0) + 1;
    const lockedUntil =
      newAttempts >= MAX_ATTEMPTS
        ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString()
        : null;

    await supabaseAdmin
      .from('students')
      .update({
        passcode_attempts: newAttempts,
        ...(lockedUntil ? { passcode_locked_until: lockedUntil } : {}),
      })
      .eq('id', studentId);

    return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 });
  }

  // Build timeline: only published entries, strip sensitive raw_memo
  const timeline = (student.consultation_timeline ?? [])
    .filter((e: { published: boolean }) => e.published)
    .map((e: { id: string; created_at: string; ai_purified?: string }) => ({
      id: e.id,
      created_at: e.created_at,
      ai_purified: e.ai_purified,
    }));

  // Fetch diagnostic result id if available
  const { data: diagResult } = await supabaseAdmin
    .from('diagnostic_test_results')
    .select('id')
    .eq('student_id', studentId)
    .limit(1)
    .maybeSingle();

  const view: ParentStudentView = {
    id: student.id,
    name: student.name,
    grade: student.grade,
    parent_status: getParentStatus(student.lead_status),
    has_passcode: true,
    ot_datetime: student.ot_datetime ?? null,
    weekly_schedule: student.weekly_schedule ?? null,
    parent_timezone: student.parent_timezone ?? null,
    timeline,
    diagnostic_result_id: diagResult?.id ?? undefined,
  };

  return NextResponse.json({ data: view });
}

/**
 * POST /api/mypage/[studentId]
 * Sets or verifies a passcode.
 * Body: { action: 'setup' | 'verify', passcode: string }
 */
export async function POST(
  request: NextRequest,
  { params: _pstudentId }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await _pstudentId;
  let body: { action: 'setup' | 'verify'; passcode: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, passcode } = body;

  if (!action || !['setup', 'verify'].includes(action)) {
    return NextResponse.json({ error: "action must be 'setup' or 'verify'" }, { status: 400 });
  }

  if (!passcode || typeof passcode !== 'string' || passcode.trim().length === 0) {
    return NextResponse.json({ error: 'passcode is required' }, { status: 400 });
  }

  type PasscodeRow = {
    id: string;
    passcode_hash: string | null;
    passcode_attempts: number;
    passcode_locked_until: string | null;
  };

  const { data: studentRaw2, error: fetchError } = await supabaseAdmin
    .from('students')
    .select('id, passcode_hash, passcode_attempts, passcode_locked_until')
    .eq('id', studentId)
    .single();

  if (fetchError || !studentRaw2) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const student = studentRaw2 as unknown as PasscodeRow;

  // ── setup ──────────────────────────────────────────────────────────────────
  if (action === 'setup') {
    if (student.passcode_hash) {
      return NextResponse.json(
        { error: 'Passcode already configured. Use verify to authenticate.' },
        { status: 409 }
      );
    }

    const hash = await bcrypt.hash(passcode, BCRYPT_ROUNDS);

    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update({ passcode_hash: hash, passcode_attempts: 0, passcode_locked_until: null })
      .eq('id', studentId);

    if (updateError) {
      console.error('[mypage POST setup]', updateError);
      return NextResponse.json({ error: 'Failed to set passcode' }, { status: 500 });
    }

    return NextResponse.json({ data: { setup: true } });
  }

  // ── verify ─────────────────────────────────────────────────────────────────
  if (action === 'verify') {
    if (!student.passcode_hash) {
      return NextResponse.json({ data: { needs_setup: true } });
    }

    // Check lock
    if (
      student.passcode_locked_until &&
      new Date(student.passcode_locked_until) > new Date()
    ) {
      return NextResponse.json({ error: 'Passcode locked. Try again later.' }, { status: 423 });
    }

    const match = await bcrypt.compare(passcode, student.passcode_hash);

    if (!match) {
      const newAttempts = (student.passcode_attempts ?? 0) + 1;
      const lockedUntil =
        newAttempts >= MAX_ATTEMPTS
          ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString()
          : null;

      await supabaseAdmin
        .from('students')
        .update({
          passcode_attempts: newAttempts,
          ...(lockedUntil ? { passcode_locked_until: lockedUntil } : {}),
        })
        .eq('id', studentId);

      return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 });
    }

    // Reset attempts on success
    await supabaseAdmin
      .from('students')
      .update({ passcode_attempts: 0, passcode_locked_until: null })
      .eq('id', studentId);

    return NextResponse.json({ data: { verified: true } });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
