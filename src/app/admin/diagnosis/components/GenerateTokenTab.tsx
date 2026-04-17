'use client';

import { useState, useEffect, useRef } from 'react';
import { TokenListTable, CodeRecord, TestVersion } from './TokenListTable';
import { TimezoneSelect } from '@/components/admin/TimezoneSelect';
import { localToUTC, utcToLocal } from '@/lib/timezone-utils';

interface GenerateTokenTabProps {
  adminKey: string;
  prefillName?: string;
  prefillPhone?: string;
  onPrefillClear?: () => void;
}

interface SuccessResult {
  code: string;
  studentName: string;
  expiresAt: string;
}

function generate6DigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function formatExpiryKo(utcIso: string, timezone: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: timezone,
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(utcIso));
}

function formatExpiryEn(utcIso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(utcIso));
}

function buildKoTemplate(code: string, expiryKo: string): string {
  return `진단테스트 안내 드리도록 하겠습니다.

[진단테스트 안내]
- 응시 페이지: tutoring.superfastsat.com/diagnosis
- 코드 번호: ${code}

[응시 방법]
1. 응시 페이지 링크 접속하여 코드 6자리입력
2. ${expiryKo}까지 진행 가능
3. 응시 시간은 총 30분, 25문항입니다. (RW+Math 포함)
4. 각 문항별로 '내가 얼마나 정답을 확신하는지' Confidence Level도 함께 체크하며 최종 제출해주세요!
5. Math 시험의 경우 계산이 필요하기 때문에 Desmos를 사용해도 되며 아직 어렵다면 노트와 필기구를 준비해주세요!`;
}

function buildEnTemplate(code: string, expiryEn: string): string {
  return `Here is your SAT Diagnostic Test information.

[Diagnostic Test Info]
- Test page: tutoring.superfastsat.com/diagnosis
- Access code: ${code}

[How to Take the Test]
1. Go to the test page and enter your 6-digit code
2. You have until ${expiryEn} to complete the test
3. Total time: 30 minutes, 25 questions (RW + Math)
4. For each question, please also check your Confidence Level — how sure you are about your answer — before submitting!
5. For Math questions, you may use Desmos if needed. If you're not comfortable with it yet, have a notebook and pencil ready!`;
}

function getPreferredTimezone(): string {
  try { return sessionStorage.getItem('admin_preferred_timezone') ?? 'Asia/Seoul'; } catch { return 'Asia/Seoul'; }
}

function getDefaultExpiresAt(timezone: string): string {
  const utc = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return utcToLocal(utc, timezone);
}

export function GenerateTokenTab({ adminKey, prefillName, prefillPhone, onPrefillClear }: GenerateTokenTabProps) {
  const [studentName, setStudentName] = useState(prefillName ?? '');
  const [studentPhone, setStudentPhone] = useState(prefillPhone ?? '');
  const [code, setCode] = useState(generate6DigitCode());
  const [selectedTimezone, setSelectedTimezone] = useState<string>(getPreferredTimezone);
  const [expiresAt, setExpiresAt] = useState(() => getDefaultExpiresAt(getPreferredTimezone()));
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<SuccessResult | null>(null);
  const [activeTab, setActiveTab] = useState<'ko' | 'en'>('ko');
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [codes, setCodes] = useState<CodeRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [versions, setVersions] = useState<TestVersion[]>([]);

  const fetchVersions = async () => {
    try {
      const res = await fetch('/api/admin/diagnosis/versions', {
        headers: { 'x-admin-key': adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        const vList: TestVersion[] = data.versions ?? [];
        setVersions(vList);
        const current = vList.find((v) => v.is_current);
        if (current) setSelectedVersionId(current.id);
      }
    } catch {
      // silently fail
    }
  };

  const fetchCodes = async () => {
    setListLoading(true);
    try {
      const response = await fetch('/api/admin/diagnosis/tokens', {
        headers: { 'x-admin-key': adminKey },
      });
      if (response.ok) {
        const data = await response.json();
        setCodes(data.codes || []);
      }
    } catch {
      // silently fail
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
    fetchCodes();
  }, []);

  useEffect(() => {
    if (prefillName) setStudentName(prefillName);
    if (prefillPhone) setStudentPhone(prefillPhone);
  }, [prefillName, prefillPhone]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWarning(null);
    setSuccessResult(null);
    setActiveTab('ko');
    setCopied(false);
    setLoading(true);

    if (!studentName.trim()) {
      setError('학생명을 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/diagnosis/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          studentName: studentName.trim(),
          studentPhone: studentPhone.trim() || undefined,
          code: code.trim(),
          expiresAt: localToUTC(expiresAt, selectedTimezone),
          testVersionId: selectedVersionId || undefined,
          timeLimitMinutes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '코드 생성 실패');
      }

      const data = await response.json();
      setWarning(data.warning ?? null);
      setSuccessResult({ code: data.code, studentName: data.studentName, expiresAt: data.expiresAt });
      setActiveTab('ko');
      setStudentName('');
      setStudentPhone('');
      setCode(generate6DigitCode());
      setExpiresAt(getDefaultExpiresAt(selectedTimezone));
      onPrefillClear?.();
      fetchCodes();
    } catch (err) {
      const message = err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Code Generation Form */}
      <div>
        <h2 className="text-xl font-bold mb-6">새 코드 생성</h2>
        <form onSubmit={handleGenerate} className="space-y-5 max-w-2xl">
          <div>
            <label className="block text-sm font-semibold mb-2">학생명</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="예: 홍길동"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">전화번호 <span className="text-gray-400 font-normal">(선택)</span></label>
            <input
              type="tel"
              value={studentPhone}
              onChange={(e) => setStudentPhone(e.target.value)}
              placeholder="예: +1 234 567 8900 / 010-1234-5678"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">픽셀 최적화용. 입력 시 Meta CAPI 이벤트 전송.</p>
          </div>

          {versions.length > 0 && (
            <div>
              <label className="block text-sm font-semibold mb-2">진단테스트 버전</label>
              <select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version_number}{v.is_current ? ' (현재 버전)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2">시험 시간 (분)</label>
            <input
              type="number"
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(Math.max(5, Math.min(180, Number(e.target.value))))}
              min={5}
              max={180}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">기본값 30분. 5~180분 사이로 설정하세요.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">6자리 접속 코드</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setCode(generate6DigitCode())}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm font-semibold transition-colors"
              >
                새로 생성
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">만료 일시</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">학생 시간대</label>
              <TimezoneSelect
                value={selectedTimezone}
                onChange={(tz) => {
                  setSelectedTimezone(tz);
                  try { sessionStorage.setItem('admin_preferred_timezone', tz); } catch { /* ignore */ }
                }}
                disabled={loading}
              />
              <p className="text-xs text-gray-400 mt-1">학생이 위치한 국가 시간대를 선택하세요.</p>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {warning && (
            <div className="p-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 text-sm">
              <div className="font-semibold mb-1">주의: 중복 결과 가능성</div>
              <p>{warning}</p>
              <button
                type="button"
                onClick={() => setWarning(null)}
                className="mt-2 text-xs text-yellow-400 underline"
              >
                확인 (닫기)
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !studentName.trim() || code.length !== 6}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '생성 중...' : '코드 생성'}
          </button>
        </form>
      </div>

      {/* Copy Message Panel */}
      {successResult && (() => {
        const expiryKo = formatExpiryKo(successResult.expiresAt, selectedTimezone);
        const expiryEn = formatExpiryEn(successResult.expiresAt, selectedTimezone);
        const koMessage = buildKoTemplate(successResult.code, expiryKo);
        const enMessage = buildEnTemplate(successResult.code, expiryEn);
        const message = activeTab === 'ko' ? koMessage : enMessage;
        return (
          <div className="p-5 rounded-xl border border-green-500/40 bg-green-900/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-green-400 font-semibold text-sm">✓ 코드 생성 완료</span>
                <span className="text-gray-400 text-sm ml-2">— {successResult.studentName} / {successResult.code}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessResult(null)}
                className="text-gray-400 hover:text-white text-lg leading-none px-1"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => { setActiveTab('ko'); setCopied(false); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'ko' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                한국어
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('en'); setCopied(false); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'en' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                English
              </button>
            </div>

            <textarea
              readOnly
              value={message}
              rows={12}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 font-mono resize-none focus:outline-none"
            />

            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={() => handleCopy(message)}
                className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
              >
                {copied ? '복사됨! / Copied!' : '복사하기 / Copy'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Code List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">발급된 코드 목록</h2>
          <button
            onClick={fetchCodes}
            disabled={listLoading}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {listLoading ? '로딩...' : '새로고침'}
          </button>
        </div>

        {codes.length === 0 && !listLoading && (
          <p className="text-gray-400">발급된 코드가 없습니다.</p>
        )}

        {codes.length > 0 && (
          <TokenListTable
            codes={codes}
            versions={versions}
            adminKey={adminKey}
            onRefresh={fetchCodes}
          />
        )}
      </div>
    </div>
  );
}
