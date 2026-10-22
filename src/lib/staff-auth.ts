// SFv2 계정으로 직원 로그인. 서버 전용.
import { createClient } from '@supabase/supabase-js';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { isStaffRole, type StaffUser } from '@/lib/staff-session';

/** 이메일·비밀번호가 맞고 SFv2 프로필이 활성 staff/admin이면 직원 정보를, 아니면 null. */
export async function authenticateStaff(email: string, password: string): Promise<StaffUser | null> {
  const url = process.env.SUPERFASTSAT_V2_SUPABASE_URL || process.env.SMS_SUPABASE_URL;
  const key = process.env.SUPERFASTSAT_V2_SUPABASE_SERVICE_KEY || process.env.SMS_SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SFv2 Supabase is not configured');

  // 공용 서비스 클라이언트에 로그인하면 이후 요청이 그 사용자 권한으로 바뀌므로 일회용 클라이언트를 쓴다
  const authClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;

  const { data: profile, error: profileError } = await supabaseSFv2
    .from('profiles')
    .select('id, full_name, role, status')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profileError) throw new Error(`profiles: ${profileError.message}`);
  if (!profile || profile.status !== 'active' || !isStaffRole(profile.role)) return null;

  return { id: profile.id as string, name: (profile.full_name as string | null) || email, role: profile.role };
}
