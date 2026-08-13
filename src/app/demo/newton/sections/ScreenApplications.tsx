'use client';

import { useState } from 'react';
import { Check, GraduationCap } from 'lucide-react';
import { Section } from '../components/Section';
import { brand } from '../theme';
import { t, SOURCE_LABEL } from '../i18n';
import { SourceBar } from '../components/SourceBar';
import {
  APPLICANT,
  APPLICATIONS,
  daysUntil,
  type AppStatus,
  type Source,
} from '../fixtures/applications';

const STATUS_LABEL: Record<AppStatus, string> = {
  Submitted: t.appStatusSubmitted,
  'In progress': t.appStatusInProgress,
  'Not started': t.appStatusNotStarted,
};

const STATUS_STYLE: Record<AppStatus, string> = {
  Submitted: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  'In progress': 'text-blue-700 bg-blue-50 border-blue-100',
  'Not started': 'text-gray-500 bg-gray-50 border-gray-200',
};

// 출처 칩 — 이 화면의 핵심. 준비물이 어느 모듈에서 자동으로 왔는지 보여준다.
const SOURCE_STYLE: Record<Source, string> = {
  SIS: 'text-indigo-700 bg-indigo-50 border-indigo-100',
  LMS: 'text-teal-700 bg-teal-50 border-teal-100',
  Advising: 'text-violet-700 bg-violet-50 border-violet-100',
  Manual: 'text-gray-400 bg-white border-gray-200',
};

// 기준일 고정 — 렌더마다 D-day가 흔들리지 않게 한다(데모 자료라 값이 안정적이어야 한다).
const TODAY_MS = Date.parse('2026-08-10T00:00:00Z');

export function ScreenApplications() {
  const [selectedId, setSelectedId] = useState(APPLICATIONS[0].id);
  // 어느 모듈이 무엇을 채웠는지 짚어보는 상태 — 통합을 동작으로 보여주는 부분.
  const [focusSource, setFocusSource] = useState<Source | null>(null);
  const selected = APPLICATIONS.find(a => a.id === selectedId) ?? APPLICATIONS[0];

  const submitted = APPLICATIONS.filter(a => a.status === 'Submitted').length;
  const next = [...APPLICATIONS]
    .filter(a => a.status !== 'Submitted')
    .sort((a, b) => a.deadline.localeCompare(b.deadline))[0];

  return (
    <Section
      id="applications"
      eyebrow="Screen 3 — College applications"
      title="한 번 기록하면, 원서까지 따라옵니다"
      lead={[
        '성적표, 이수 과목, 활동 내역, 추천서 근거 — 전부 학교가 이미 갖고 있는 기록입니다.',
        '학적·수업·상담 기록이 한 시스템이면 이걸 새로 입력할 이유가 없습니다.',
      ]}
    >
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-blue-500" />
              <p className="text-[17px] font-bold text-gray-900">{APPLICANT.name}</p>
            </div>
            <p className="mt-1 text-[12px] text-gray-400">
              {APPLICANT.grade} · {APPLICANT.classOf} · Advisor {APPLICANT.advisor} · GPA {APPLICANT.gpa} · SAT{' '}
              {APPLICANT.sat}
            </p>
          </div>
          <span className="font-serif text-[12px] sm:text-[11px] tracking-[0.18em] text-gray-300">EDUMO</span>
        </div>

        <div className="border-b border-gray-100 px-5 py-4">
          <SourceBar selected={focusSource} onSelect={setFocusSource} />

          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-gray-100 pt-3 text-[12px] text-gray-400">
            <span>
              {t.applications} <span className="font-semibold text-gray-800">{APPLICATIONS.length}</span>
            </span>
            <span>
              {t.submitted} <span className="font-semibold text-gray-800">{submitted}</span>
            </span>
            {next && (
              <span>
                {t.nextDeadline}{' '}
                <span className="font-semibold text-gray-800">D-{daysUntil(next.deadline, TODAY_MS)}</span>{' '}
                <span className="text-gray-300">
                  {next.college.split(' ')[0]} · {next.deadline}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5">
          {/* 지원 목록 */}
          <div className="overflow-x-auto border-b border-gray-100 lg:col-span-3 lg:border-b-0 lg:border-r">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-[12px] sm:text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-2.5 font-medium">{t.colCollege}</th>
                  <th className="hidden px-3 py-2.5 font-medium sm:table-cell">{t.colRound}</th>
                  <th className="px-3 py-2.5 font-medium">{t.colDeadline}</th>
                  <th className="px-5 py-2.5 font-medium">{t.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {APPLICATIONS.map(a => {
                  const done = a.requirements.filter(r => r.done).length;
                  const isSel = a.id === selectedId;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedId(a.id)}
                      className={`cursor-pointer border-b border-gray-50 text-[13px] last:border-0 ${
                        isSel ? 'bg-blue-50/60' : 'hover:bg-gray-50/70'
                      }`}
                    >
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-900">{a.college}</p>
                        <p className="mt-0.5 text-[12px] sm:text-[11px] text-gray-400">
                          <span className="sm:hidden">{a.round} · </span>
                          {t.requirementsReady(done, a.requirements.length)}
                        </p>
                      </td>
                      <td className="hidden px-3 py-3 text-gray-600 sm:table-cell">{a.round}</td>
                      <td className="px-3 py-3 tabular-nums text-gray-500">{a.deadline}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded border px-1.5 py-0.5 text-[12px] sm:text-[11px] ${STATUS_STYLE[a.status]}`}>
                          {STATUS_LABEL[a.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 준비물 체크리스트 + 출처 */}
          <div className="lg:col-span-2">
            <div className="border-b border-gray-100 px-5 py-3">
              <p className="text-[13px] font-semibold text-gray-800">{selected.college}</p>
              <p className="mt-0.5 text-[12px] sm:text-[11px] text-gray-400">
                {selected.round} · {t.due} {selected.deadline}
              </p>
            </div>
            <ul className="divide-y divide-gray-50">
              {selected.requirements.map(r => {
                const dim = focusSource !== null && r.source !== focusSource;
                const hit = focusSource !== null && r.source === focusSource;
                return (
                <li
                  key={r.name}
                  className="px-5 py-3 transition-all"
                  style={{
                    opacity: dim ? 0.3 : 1,
                    background: hit ? '#f5f7ff' : undefined,
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                        r.done ? 'bg-emerald-500 text-white' : 'border border-gray-300 bg-white'
                      }`}
                    >
                      {r.done && <Check size={11} strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`text-[12.5px] ${r.done ? 'text-gray-800' : 'text-gray-500'}`}>
                          {r.name}
                        </span>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[11px] sm:text-[10px] font-medium ${SOURCE_STYLE[r.source]}`}
                        >
                          {r.source === 'Manual' ? t.manualEntry : t.fromSource(SOURCE_LABEL[r.source])}
                        </span>
                      </div>
                      {r.note && <p className="mt-1 text-[12px] sm:text-[11px] leading-relaxed text-gray-400">{r.note}</p>}
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed" style={{ color: brand.muted }}>
        성적표를 다시 옮겨 적거나, 추천서를 쓰려고 3년치 기록을 뒤질 일이 없습니다.
      </p>
    </Section>
  );
}
