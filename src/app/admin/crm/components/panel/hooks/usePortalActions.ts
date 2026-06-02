'use client';

import { useState } from 'react';

interface Params {
  studentId: string;
  studentName: string;
  adminKey: string;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function usePortalActions({ studentId, studentName, adminKey, onDelete, onClose }: Params) {
  const [portalCopied, setPortalCopied] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  async function fetchPortalToken(): Promise<string | null> {
    const res = await fetch(`/api/crm/students/${studentId}/portal-token`, {
      method: 'POST', headers,
    });
    if (!res.ok) return null;
    const { portal_token } = await res.json();
    return portal_token;
  }

  async function handleCopyPortalLink() {
    setPortalLoading(true);
    try {
      const token = await fetchPortalToken();
      if (!token) throw new Error('failed');
      const url = `${window.location.origin}/portal/${token}`;
      await navigator.clipboard.writeText(url);
      setPortalCopied(true);
      setTimeout(() => setPortalCopied(false), 2500);
    } catch {
      alert('포털 링크 생성에 실패했습니다.');
    } finally {
      setPortalLoading(false);
    }
  }

  async function handlePreviewPortal() {
    setPortalLoading(true);
    try {
      const token = await fetchPortalToken();
      if (!token) throw new Error('failed');
      const url = `${window.location.origin}/portal/${token}?preview=admin`;
      window.open(url, '_blank');
    } catch {
      alert('포털 미리보기에 실패했습니다.');
    } finally {
      setPortalLoading(false);
    }
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

  return { portalCopied, portalLoading, deleting, handleCopyPortalLink, handlePreviewPortal, handleDelete };
}
