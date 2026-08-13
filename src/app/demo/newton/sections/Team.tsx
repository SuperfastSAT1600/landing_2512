'use client';

import { Section } from '../components/Section';
import { brand } from '../theme';

// 첨부 장표(Team)의 카드. 창업자·공동 창업자를 앞에 둬서 앞 섹션의 창업자 이력과 이어지게 한다.
const MEMBERS = [
  { name: '배병윤', role: '창업자', lines: ['밀당PT 이사', '서울대 지리학과'] },
  { name: '이민재', role: '공동 창업자', lines: ['튜블릿코리아 총괄'] },
  { name: '김재연', role: '개발', lines: ['UCLA 철학과'] },
  { name: '김남준', role: '개발', lines: ['밀당PT 영어본부 실장', '홍익대 영어영문학과'] },
  { name: '김우영', role: '개발', lines: ['밀당PT 수학본부 실장', '동국대 전자전기공학부'] },
  { name: '전지현', role: '콘텐츠', lines: ['UCLA 수학과', 'SAT 수업 경력 5년'] },
  { name: '박기훈', role: '콘텐츠', lines: ['UPenn TESOL', 'SAT 수업 경력 10년'] },
];

const AWARDS = ['프리팁스 최우수 졸업', '글로벌 액셀러레이팅 프로그램 선정', '팁스 선정'];

export function Team() {
  return (
    <Section
      id="team"
      eyebrow="Team"
      title="에듀테크 성공 방정식을 경험해 온 '교육과 기술 양쪽의 전문가들'"
      lead={[
        '국내 대표 에듀테크 서비스의 0 to 1 성장과 스케일업을 최전선에서 주도했던 핵심 인재들이',
        "'AI'와 '글로벌'이란 키워드로 다시 뭉친 팀입니다.",
      ]}
    >
      <div
        className="mb-10 flex flex-col gap-4 rounded-xl px-5 py-4 sm:flex-row sm:items-center sm:gap-8"
        style={{ background: brand.primary }}
      >
        <span className="shrink-0 text-[13px] font-bold text-white">25년 지원 사업 성과</span>
        <ul className="flex flex-wrap gap-x-6 gap-y-1">
          {AWARDS.map(a => (
            <li key={a} className="text-[13px] text-white/85">
              {a}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MEMBERS.map(m => (
          <div key={m.name} className="rounded-xl border border-gray-100 bg-white px-4 py-4">
            <div className="flex items-center gap-2.5">
              <span
                className="rounded-md px-2 py-0.5 text-[12px] sm:text-[11px] font-semibold text-white"
                style={{ background: brand.primary }}
              >
                {m.role}
              </span>
              <span className="text-[17px] font-bold" style={{ color: brand.accent }}>
                {m.name}
              </span>
            </div>
            {m.lines.length > 0 && (
              <ul className="mt-3 space-y-1">
                {m.lines.map((l, i) => (
                  <li key={l} className={`text-[13px] ${i === 0 ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
                    {l}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}
