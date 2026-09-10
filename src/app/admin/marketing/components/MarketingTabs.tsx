'use client';

import Link from 'next/link';

const TABS = [
  { href: '/admin/marketing/status', label: '마케팅 현황' },
  { href: '/admin/marketing/goals', label: '목표' },
  { href: '/admin/marketing', label: '채널 현황' },
];

/** 마케팅 하위 화면 전환 탭. 사이드바 하위 항목과 같은 경로를 쓴다. */
export default function MarketingTabs({ active }: { active: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {TABS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`text-sm px-3.5 py-1.5 rounded-md font-medium transition-colors ${
            active === href
              ? 'bg-blue-600 text-white'
              : 'bg-[#1e2023] text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
