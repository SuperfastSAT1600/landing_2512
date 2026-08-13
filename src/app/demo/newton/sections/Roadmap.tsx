'use client';

import { Section } from '../components/Section';
import { brand } from '../theme';

// 신규 개발·공급 기준의 단계 구분. 기존 시스템 이관이 아니다.
//
// 로드맵의 메시지는 두 개고, 순서가 곧 강조다.
//  1) 납품하고 빠지는 외주사가 아니라 운영 지표 개선까지 붙는다 → HOW / METRICS 를 맨 위로
//  2) SIS·LMS·진학이 하나로 합쳐지는 지점까지 간다 → 마지막 단계 강조
//
// 단계 순서의 근거:
//  - 기록이 쌓이지 않으면 AI가 낼 판단이 없다 → 상담 기록(1) 이 AI 업무 제안(2) 보다 먼저.
//  - 원서 준비물은 수업·활동 데이터에서 나온다 → LMS(3) 와 원서를 같은 단계에.
//  - 기간은 적지 않는다. 바뀔 수 있고, 숫자가 박히면 그게 약속으로 읽힌다.
//  - 특정 경쟁 제품명은 쓰지 않는다.

const HOW = [
  '제가 뉴튼 프로젝트 전담 책임자로 전 과정을 직접 챙깁니다. 티켓을 받아 처리하는 외주 방식이 아닙니다.',
  '정기적으로 뉴튼에 직접 방문해 진행 상황을 함께 확인합니다.',
  '방문·화상 미팅·Slack 등 여러 채널로 실시간 기술 지원을 제공합니다. 시차를 기다릴 일이 없습니다.',
  '무엇을 개선할지 운영 지표로 함께 정하고, 그 숫자로 성과를 확인합니다.',
];

/** 개선 대상 지표 — 앞 데모 화면에서 보여준 것과 직접 연결된다. */
const METRICS = [
  '신규 담당자가 학생을 파악하는 데 걸리는 시간',
  '상담 준비에 드는 시간',
  '원서 서류 재입력 건수',
  '학부모 회신 지연',
];

const PHASES = [
  {
    phase: 'Phase 1',
    title: '학생 기록과 상담',
    items: [
      '학생·보호자 정보, 뉴튼 학년·과정 구조 반영',
      '상담 기록 작성·검색·타임라인, 역할별 권한',
      '출결 관리, 영문 전용 UI',
    ],
  },
  {
    phase: 'Phase 2',
    title: '기록을 판단으로',
    items: [
      '쌓인 상담 기록으로 이번 주·이번 달·이번 분기 업무 제안',
      '성적·평가와 리포트카드',
      '학부모 공유 리포트',
    ],
  },
  {
    phase: 'Phase 3',
    title: '수업과 진학까지 한 시스템',
    items: [
      '시간표·수업 운영, 과제 배포·제출·채점·피드백',
      '대학 원서 관리 — 준비물이 학적·수업·상담에서 자동 수집',
    ],
    highlight: true,
  },
];

export function Roadmap() {
  return (
    <Section
      id="roadmap"
      eyebrow="How we work"
      title="개발 로드맵"
    >
      {/* 핵심 1 — 어떻게 붙는가 */}
      <div
        className="rounded-2xl border-2 bg-white px-5 py-5 sm:px-7 sm:py-6"
        style={{ borderColor: brand.primary }}
      >
        <ul className="space-y-2">
          {HOW.map(item => (
            <li key={item} className="flex gap-2.5 text-[13.5px] leading-relaxed text-gray-700">
              <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: brand.accent }} />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="text-[12px] sm:text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            함께 정할 운영 지표 예시
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {METRICS.map(m => (
              <span
                key={m}
                className="rounded-md border px-2.5 py-1 text-[12px] text-gray-600"
                style={{ borderColor: '#e0e3ee', background: '#fafbff' }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 단계 — 기간 없이 순서만, Phase 3이 도착점으로 보이게 */}
      <div className="mt-10 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {PHASES.map(p => (
          <div
            key={p.phase}
            className="rounded-xl border px-5 py-4"
            style={
              p.highlight
                ? { background: brand.primary, borderColor: brand.primary }
                : { background: '#fff', borderColor: '#eceef3' }
            }
          >
            <p
              className="text-[12px] sm:text-[11px] font-bold uppercase tracking-wide"
              style={{ color: p.highlight ? 'rgba(255,255,255,0.55)' : brand.accent }}
            >
              {p.phase}
            </p>
            <p
              className="mt-1.5 text-[15px] font-bold leading-snug"
              style={{ color: p.highlight ? '#fff' : '#1f2430' }}
            >
              {p.title}
            </p>
            <ul className="mt-3 space-y-1.5">
              {p.items.map(i => (
                <li
                  key={i}
                  className="flex gap-2 text-[12.5px] leading-relaxed"
                  style={{ color: p.highlight ? 'rgba(255,255,255,0.8)' : '#6b7180' }}
                >
                  <span
                    className="mt-[7px] h-1 w-1 shrink-0 rounded-full"
                    style={{ background: p.highlight ? 'rgba(255,255,255,0.5)' : '#d4d7e0' }}
                  />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

    </Section>
  );
}
