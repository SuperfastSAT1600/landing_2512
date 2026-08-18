import React from 'react';
import { RadioCard } from '@/components/enrollment/ui/RadioCard';
import { Card } from '@/components/enrollment/ui/Card';
import { Badge } from '@/components/enrollment/ui/Badge';
import { PROGRAM_TYPES } from '@/lib/enrollment/data/pricing';
import { useLanguage } from '@/lib/enrollment/i18n/LanguageContext';
import { useScrollReveal } from '@/hooks/enrollment/useScrollReveal';
import { ICON_MAP } from './icons';
import { SectionHeader } from './SectionHeader';
import type { ProgramType } from '@/types/enrollment';

interface ProgramTypeSectionProps {
  programType: ProgramType | null;
  onSelect: (type: ProgramType) => void;
}

export function ProgramTypeSection({ programType, onSelect }: ProgramTypeSectionProps) {
  const { t } = useLanguage();
  const gridRef = useScrollReveal(0.05);

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-10 sm:pb-16">
      <SectionHeader number={1} title={t('programType.sectionTitle')} />
      <div ref={gridRef} className="reveal-children grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PROGRAM_TYPES.map((pt, i) => {
          const IconComponent = ICON_MAP[pt.icon];
          const isDisabled = !!pt.disabled;
          const badge = t(`programType.${pt.id}.badge`);
          const hasBadge = badge !== `programType.${pt.id}.badge`;

          const cardContent = (
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-accent-glow/15 flex items-center justify-center">
                  {IconComponent && (
                    <IconComponent className="w-5 h-5 text-accent-glow" />
                  )}
                </div>
                <div className="flex gap-2">
                  {hasBadge && (
                    <Badge variant="warning">{badge}</Badge>
                  )}
                  {pt.recommended && (
                    <Badge variant="primary">{t('common.recommended')}</Badge>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">
                  {t(`programType.${pt.id}.name`)}
                </h3>
                <Badge variant="neutral" className="mt-1">
                  {t(`programType.${pt.id}.subtitle`)}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                {t(`programType.${pt.id}.description`)}
              </p>
            </div>
          );

          return (
            <div
              key={pt.id}
              className="reveal-item"
              style={{ '--stagger': i } as React.CSSProperties}
            >
              {isDisabled ? (
                <Card className="min-h-[140px] h-full opacity-40 cursor-not-allowed">
                  {cardContent}
                </Card>
              ) : (
                <RadioCard
                  selected={programType === pt.id}
                  onSelect={() => onSelect(pt.id)}
                  className="min-h-[140px] h-full"
                >
                  {cardContent}
                </RadioCard>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
