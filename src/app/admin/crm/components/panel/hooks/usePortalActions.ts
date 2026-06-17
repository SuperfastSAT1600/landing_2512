'use client';

import { useState } from 'react';


interface Params {
  studentId: string;
  studentName: string;
  adminKey: string;
  initialPortalToken?: string | null;
  onPortalIssued?: (token: string) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function usePortalActions({ studentId, studentName, adminKey, initialPortalToken, onPortalIssued, onDelete, onClose }: Params) {
  const [issuedToken, setIssuedToken] = useState<string | null>(initialPortalToken ?? null);
  const [portalCopied, setPortalCopied] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  const hasPortal = !!issuedToken;

  async function fetchPortalToken(): Promise<string | null> {
    const res = await fetch(`/api/crm/students/${studentId}/portal-token`, {
      method: 'POST', headers,
    });
    if (!res.ok) return null;
    const { portal_token } = await res.json();
    setIssuedToken(portal_token);
    onPortalIssued?.(portal_token);
    return portal_token;
  }

  async function handleIssuePortal() {
    if (issuedToken || portalLoading) return;
    setPortalLoading(true);
    try {
      const token = await fetchPortalToken();
      if (!token) throw new Error('failed');
    } catch {
      alert('포털 발급에 실패했습니다.');
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleCopyPortalLink() {
    const token = issuedToken;
    if (!token) return;
    setPortalLoading(true);
    try {
      const url = `${window.location.origin}/portal/${token}`;
      await navigator.clipboard.writeText(url);
      setPortalCopied(true);
      setTimeout(() => setPortalCopied(false), 2500);
    } catch {
      alert('링크 복사에 실패했습니다.');
    } finally {
      setPortalLoading(false);
    }
  }

  function handlePreviewPortal() {
    const token = issuedToken;
    if (!token) return;
    const newWindow = window.open('', '_blank');
    if (newWindow) newWindow.location.href = `${window.location.origin}/portal/${token}?preview=admin`;
  }

  async function handleDelete() {
    if (!window.confirm(`"${studentName}" 리드를 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/crm/students/${studentId}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('failed');
      onDelete?.(studentId);
      onClose();
    } catch {
      alert('삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  }

  return { hasPortal, portalCopied, portalLoading, deleting, handleIssuePortal, handleCopyPortalLink, handlePreviewPortal, handleDelete };
}
