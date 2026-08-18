'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { Badge } from '@/components/enrollment/ui/Badge';
import { RadioCard } from '@/components/enrollment/ui/RadioCard';
import { CheckboxCard } from '@/components/enrollment/ui/CheckboxCard';
import { formatWon } from '@/lib/enrollment/utils/format';
import { useLanguage } from '@/lib/enrollment/i18n/LanguageContext';
import { useScrollReveal } from '@/hooks/enrollment/useScrollReveal';
import { SectionHeader } from './SectionHeader';
import {
  ONE_ON_ONE_PACKAGES_V2,
  GROUP_PACKAGES_V2,
  UNMANAGED_PACKAGES_V2,
  CONTENT_ITEMS_V2,
  SALES_LABELS_V2,
} from '@/lib/enrollment/data/pricing-v2';
import type { CategoryIdV2, OptionSelectionV2, GroupPackage } from '@/types/enrollment-v2';
import type { HourPackage } from '@/types/enrollment';

interface PackageSelectionSectionV2Props {
  categoryId: CategoryIdV2;
  selectedOption: OptionSelectionV2 | null;
  onOptionSelect: (option: OptionSelectionV2) => void;
  onContentToggle: (id: string) => void;
  totalPrice: number;
  sectionNumber: number;
}

/* ── Hour Package Cards ─────────────────────────────────────────── */
function HourPackageGrid({
  packages,
  selectedOption,
  onSelect,
}: {
  packages: HourPackage[];
  selectedOption: OptionSelectionV2 | null;
  onSelect: (pkgId: string) => void;
}) {
  const { locale } = useLanguage();

  return (
    /* 모바일: 1열 / 데스크톱: 3열 */
    <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3">
      {packages.map((pkg, i) => {
        const selected =
          selectedOption?.type === 'hour-package' && selectedOption.packageId === pkg.id;
        const labelInfo = pkg.salesLabel ? SALES_LABELS_V2[pkg.salesLabel] : null;
        const savings = pkg.discountRate
          ? Math.round(packages[0].pricePerHour * pkg.hours - pkg.totalPrice)
          : 0;

        return (
          <div key={pkg.id} className="reveal-item" style={{ '--stagger': i } as React.CSSProperties}>
            <RadioCard selected={selected} onSelect={() => onSelect(pkg.id)} className="h-full">
              <div className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 sm:text-center">
                {/* 모바일: 왼쪽 시간 / 데스크톱: 위 뱃지+시간 */}
                <div className="flex sm:flex-col items-center gap-2 flex-shrink-0">
                  <div className="h-5 flex items-center justify-center">
                    {labelInfo && (
                      <Badge variant={labelInfo.color === 'neutral' ? 'neutral' : 'primary'}>
                        {labelInfo.text}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-white">{pkg.hours}시간</p>
                </div>

                <div className="flex-1 sm:flex-none">
                  <p className="text-base font-bold text-accent-glow">
                    {formatWon(pkg.totalPrice, locale)}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {formatWon(pkg.pricePerHour, locale)}/시간
                  </p>
                  {savings > 0 && pkg.discountRate && (
                    <p className="text-xs font-bold text-rose-400 mt-1">
                      {formatWon(savings, locale, { manThreshold: 1 })} 절약 -{pkg.discountRate}%
                    </p>
                  )}
                </div>
              </div>
            </RadioCard>
          </div>
        );
      })}
    </div>
  );
}

/* ── Group Package Cards ────────────────────────────────────────── */
function GroupPackageGrid({
  packages,
  selectedOption,
  onSelect,
}: {
  packages: GroupPackage[];
  selectedOption: OptionSelectionV2 | null;
  onSelect: (pkgId: string) => void;
}) {
  const { locale } = useLanguage();

  return (
    <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
      {packages.map((pkg, i) => {
        const selected =
          selectedOption?.type === 'group-package' && selectedOption.packageId === pkg.id;
        const labelInfo = pkg.salesLabel ? SALES_LABELS_V2[pkg.salesLabel] : null;

        return (
          <div key={pkg.id} className="reveal-item" style={{ '--stagger': i } as React.CSSProperties}>
            <RadioCard selected={selected} onSelect={() => onSelect(pkg.id)} className="h-full">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-base">{pkg.name}</span>
                    {labelInfo && (
                      <Badge variant={labelInfo.color === 'neutral' ? 'neutral' : 'primary'}>
                        {labelInfo.text}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-white/50 mb-2">{pkg.subtitle}</p>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-accent-glow flex-shrink-0" strokeWidth={3} />
                    <span className="text-xs text-white/60">{pkg.durationLabel}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-accent-glow">
                    {formatWon(pkg.totalPrice, locale)}
                  </p>
                </div>
              </div>
            </RadioCard>
          </div>
        );
      })}
    </div>
  );
}

/* ── Content Cards ──────────────────────────────────────────────── */
function ContentGrid({
  selectedOption,
  onToggle,
  totalPrice,
}: {
  selectedOption: OptionSelectionV2 | null;
  onToggle: (id: string) => void;
  totalPrice: number;
}) {
  const { locale } = useLanguage();

  return (
    <>
      <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3">
        {CONTENT_ITEMS_V2.map((item, i) => {
          const checked =
            selectedOption?.type === 'content' &&
            selectedOption.contentIds.includes(item.id);
          return (
            <div key={item.id} className="reveal-item" style={{ '--stagger': i } as React.CSSProperties}>
              <CheckboxCard checked={!!checked} onToggle={() => onToggle(item.id)}>
                <div className="space-y-1 pr-6">
                  <h4 className="font-bold text-white text-sm">{item.name}</h4>
                  <p className="text-xs text-white/40">{item.description}</p>
                  <p className="text-sm font-bold text-accent-glow">
                    월 {formatWon(item.monthlyPrice, locale)}
                  </p>
                </div>
              </CheckboxCard>
            </div>
          );
        })}
      </div>

      {selectedOption?.type === 'content' && selectedOption.contentIds.length > 0 && (
        <div className="mt-4 p-4 bg-accent-glow/8 rounded-card border border-accent-glow/20 text-center">
          <p className="text-xs text-white/50 mb-1">합산 월 구독료</p>
          <p className="text-2xl font-bold text-white">
            월 {formatWon(totalPrice, locale)}
          </p>
        </div>
      )}
    </>
  );
}

/* ── Main Export ────────────────────────────────────────────────── */
export const PackageSelectionSectionV2 = React.forwardRef<HTMLDivElement, PackageSelectionSectionV2Props>(
  function PackageSelectionSectionV2(
    { categoryId, selectedOption, onOptionSelect, onContentToggle, totalPrice, sectionNumber },
    ref
  ) {
    const gridRef = useScrollReveal(0.05);

    const titleMap: Record<CategoryIdV2, string> = {
      'one-on-one': '시간 패키지 선택',
      'group': '특강 선택',
      'content': '콘텐츠 선택',
      'unmanaged': '시간 패키지 선택',
    };

    return (
      <section
        ref={ref}
        id="section-package"
        className="max-w-2xl mx-auto px-4 pb-10 sm:pb-16 animate-fade-in scroll-mt-24"
      >
        <SectionHeader number={sectionNumber} title={titleMap[categoryId]} />

        <div ref={gridRef} className="reveal-children">
          {(categoryId === 'one-on-one') && (
            <HourPackageGrid
              packages={ONE_ON_ONE_PACKAGES_V2}
              selectedOption={selectedOption}
              onSelect={(id) => onOptionSelect({ type: 'hour-package', packageId: id })}
            />
          )}

          {categoryId === 'group' && (
            <GroupPackageGrid
              packages={GROUP_PACKAGES_V2}
              selectedOption={selectedOption}
              onSelect={(id) => onOptionSelect({ type: 'group-package', packageId: id })}
            />
          )}

          {categoryId === 'content' && (
            <ContentGrid
              selectedOption={selectedOption}
              onToggle={onContentToggle}
              totalPrice={totalPrice}
            />
          )}

          {categoryId === 'unmanaged' && (
            <HourPackageGrid
              packages={UNMANAGED_PACKAGES_V2}
              selectedOption={selectedOption}
              onSelect={(id) => onOptionSelect({ type: 'hour-package', packageId: id })}
            />
          )}
        </div>
      </section>
    );
  }
);
