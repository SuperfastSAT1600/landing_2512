'use client';

import { useState, useEffect } from 'react';

export interface DiagCandidate {
  id: string;
  student_name: string;
  student_email: string;
  submitted_at: string;
  test_id: string;
  total_time_seconds: number;
}

interface Params {
  studentId: string;
  adminKey: string;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
}

export function useDiagnostic({ studentId, adminKey, onUpdate }: Params) {
  const [diagLinked, setDiagLinked] = useState<DiagCandidate | null>(null);
  const [diagCandidates, setDiagCandidates] = useState<DiagCandidate[]>([]);
  const [showDiagPicker, setShowDiagPicker] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagSearchQuery, setDiagSearchQuery] = useState('');
  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  async function fetchDiagLinked() {
    const res = await fetch(`/api/crm/students/${studentId}/diagnostic-link`, { headers });
    if (res.ok) {
      const { linked } = await res.json();
      setDiagLinked(linked);
    }
  }

  async function searchDiagCandidates(q: string) {
    setDiagLoading(true);
    const res = await fetch(
      `/api/crm/students/${studentId}/diagnostic-link?search=${encodeURIComponent(q)}`,
      { headers }
    );
    if (res.ok) {
      const { candidates } = await res.json();
      setDiagCandidates(candidates);
    }
    setDiagLoading(false);
  }

  async function handleDiagLink(resultId: string | null) {
    setDiagLoading(true);
    await fetch(`/api/crm/students/${studentId}/diagnostic-link`, {
      method: 'POST', headers,
      body: JSON.stringify({ resultId }),
    });
    await fetchDiagLinked();
    setDiagCandidates([]);
    setDiagSearchQuery('');
    setShowDiagPicker(false);
    onUpdate(studentId, { diagnostic_result_id: resultId });
    setDiagLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDiagLinked(); }, [studentId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!showDiagPicker) return;
    if (diagSearchQuery.length < 2) { setDiagCandidates([]); return; }
    const timer = setTimeout(() => searchDiagCandidates(diagSearchQuery), 300);
    return () => clearTimeout(timer);
  }, [diagSearchQuery, showDiagPicker]);

  return {
    diagLinked, diagCandidates, showDiagPicker, setShowDiagPicker,
    diagLoading, diagSearchQuery, setDiagSearchQuery,
    handleDiagLink,
  };
}
