'use client';

import { brand } from '../theme';

/**
 * 제안서 장표와 같은 리듬의 섹션 껍데기.
 * 왼쪽 정렬 굵은 네이비 제목 + 그 아래 회색 부제 1~3줄 + 넉넉한 여백.
 */
export function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  tone = 'tint',
}: {
  id: string;
  eyebrow?: string;
  title: string;
  lead?: string[];
  children?: React.ReactNode;
  tone?: 'light' | 'tint';
}) {
  return (
    <section
      id={id}
      className="scroll-mt-16 border-t px-6 py-20 sm:px-10 sm:py-28"
      style={{
        // 카드가 항상 배경에서 떠 보이도록 캔버스는 살짝 회색을 기본으로 둔다.
        // 섹션 경계는 배경 교차가 아니라 헤어라인으로 잡는다.
        background: tone === 'tint' ? '#f7f8fa' : brand.canvas,
        borderColor: '#eceef3',
      }}
    >
      <div className="mx-auto w-full max-w-6xl">
        {eyebrow && (
          <p
            className="mb-3 text-[13px] font-semibold tracking-wide"
            style={{ color: brand.accent }}
          >
            {eyebrow}
          </p>
        )}
        <h2
          className="text-[28px] font-bold leading-tight tracking-tight sm:text-[38px]"
          style={{ color: brand.primary }}
        >
          {title}
        </h2>
        {lead && lead.length > 0 && (
          <div className="mt-5 space-y-1.5">
            {lead.map((line, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-gray-600 sm:text-base">
                {line}
              </p>
            ))}
          </div>
        )}
        {children && <div className="mt-12">{children}</div>}
      </div>
    </section>
  );
}
