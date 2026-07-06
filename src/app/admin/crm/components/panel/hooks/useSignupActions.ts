'use client';

import { useState } from 'react';
import type { Student } from '@/types/crm';

interface Params {
  studentId: string;
  adminKey: string;
  initialSignupToken?: string | null;
  signupDoneAt?: string | null;
  onUpdate: (id: string, updates: Partial<Student>) => void;
}

/**
 * 회원가입 링크 보기·복사·재생성 (usePortalActions 미러).
 * - 링크 URL은 플랫폼 base(서버 env)로 조립되므로 클라이언트에서 못 만든다 →
 *   idempotent POST 응답의 signup_url을 사용/캐시한다.
 * - 재생성: 새 토큰 + signup_done_at 리셋 (링크 즉시 재사용 가능).
 */
export function useSignupActions({ studentId, adminKey, initialSignupToken, signupDoneAt, onUpdate }: Params) {
  const [signupToken, setSignupToken] = useState<string | null>(initialSignupToken ?? null);
  const [signupUrl, setSignupUrl] = useState<string | null>(null);
  const [signupCopied, setSignupCopied] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  const hasSignup = !!signupToken;
  const isConsumed = !!signupDoneAt;

  // get-or-create: 링크 URL 확보 (토큰 없으면 생성). 실패 시 null.
  async function ensureUrl(): Promise<string | null> {
    if (signupUrl) return signupUrl;
    const res = await fetch(`/api/crm/students/${studentId}/signup-token`, { method: 'POST', headers });
    if (!res.ok) return null;
    const { signup_token, signup_url } = await res.json();
    setSignupToken(signup_token);
    setSignupUrl(signup_url);
    if (signup_token !== initialSignupToken) onUpdate(studentId, { signup_token } as Partial<Student>);
    return signup_url;
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setSignupCopied(true);
    setTimeout(() => setSignupCopied(false), 2500);
  }

  async function handleCopySignupLink() {
    setSignupLoading(true);
    try {
      const url = await ensureUrl();
      if (!url) throw new Error('failed');
      await copyUrl(url);
    } catch {
      alert('회원가입 링크 복사에 실패했습니다.');
    } finally {
      setSignupLoading(false);
    }
  }

  async function handleRegenerate() {
    if (!window.confirm('회원가입 링크를 재생성하시겠습니까?\n기존 링크는 무효화되고, "회원가입 확인" 상태가 해제됩니다.')) return;
    setSignupLoading(true);
    try {
      const res = await fetch(`/api/crm/students/${studentId}/signup-token`, {
        method: 'POST', headers, body: JSON.stringify({ regenerate: true }),
      });
      if (!res.ok) throw new Error('failed');
      const { signup_token, signup_url } = await res.json();
      setSignupToken(signup_token);
      setSignupUrl(signup_url);
      onUpdate(studentId, { signup_token, signup_done_at: null } as Partial<Student>);
      await copyUrl(signup_url); // 재생성 후 바로 복사
    } catch {
      alert('회원가입 링크 재생성에 실패했습니다.');
    } finally {
      setSignupLoading(false);
    }
  }

  return { hasSignup, isConsumed, signupCopied, signupLoading, handleCopySignupLink, handleRegenerate };
}
