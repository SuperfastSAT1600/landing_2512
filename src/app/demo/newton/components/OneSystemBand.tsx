'use client';

import { ArrowRight } from 'lucide-react';
import { brand } from '../theme';
import { t } from '../i18n';

// 기존 제안서의 AS-IS / TO-BE 장표를 페이지 버전으로 옮긴 것.
// 국제학교가 보통 따로 사는 세 종류의 툴을 나열하고, 하나로 합친다는 논지를 한 줄로 보여준다.
// 업계 약어(SIS/LMS) 대신 학교가 실제로 하는 업무 이름을 쓴다.
const AS_IS = [
  { kind: t.groupRecords, detail: t.groupRecordsDetail, examples: 'Alma · iSAMS · Veracross · PowerSchool 등' },
  { kind: t.groupTeaching, detail: t.groupTeachingDetail, examples: 'Schoology · Canvas · Google Classroom 등' },
  { kind: t.groupCollege, detail: t.groupCollegeDetail, examples: 'Naviance · Cialfo · MaiaLearning 등' },
];

export function OneSystemBand() {
  return (
    <div className="mb-12 grid grid-cols-1 items-center gap-6 rounded-2xl border border-gray-100 bg-white px-5 py-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-8 lg:px-8">
      <div>
        <p className="mb-3 text-[12px] sm:text-[11px] font-semibold uppercase tracking-wide text-gray-400">{t.asIs}</p>
        <ul className="space-y-2">
          {AS_IS.map(item => (
            <li key={item.kind} className="rounded-lg bg-gray-50 px-3 py-2">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                <span className="shrink-0 text-[12px] font-bold text-gray-600">{item.kind}</span>
                <span className="text-[12px] sm:text-[11px] text-gray-400">{item.detail}</span>
              </div>
              <p className="mt-0.5 text-[12px] sm:text-[11px] leading-relaxed text-gray-400">{item.examples}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] leading-relaxed text-gray-500">
          {t.asIsCaption}
        </p>
      </div>

      <div className="flex justify-center lg:px-2">
        <ArrowRight size={26} className="rotate-90 lg:rotate-0" style={{ color: brand.primary }} />
      </div>

      <div>
        <p className="mb-3 text-[12px] sm:text-[11px] font-semibold uppercase tracking-wide" style={{ color: brand.accent }}>
          {t.toBe}
        </p>
        <div className="rounded-lg px-4 py-5 text-center" style={{ background: brand.primary }}>
          <p className="font-serif text-[26px] tracking-[0.14em] text-white">EDUMO</p>
          <p className="mt-2 text-[12px] text-white/70">{t.sisLmsCounseling}</p>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-gray-500">
          {t.toBeCaption}
        </p>
      </div>
    </div>
  );
}
