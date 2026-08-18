import { Badge } from '@/components/enrollment/ui/Badge';
import { useLanguage } from '@/lib/enrollment/i18n/LanguageContext';
import { ServiceIndicator } from './ServiceIndicator';
import type { ManagementService } from '@/types/enrollment';

interface ServiceCardProps {
  categoryName: string;
  managementLevel: string;
  services: ManagementService[];
}

export function ServiceCard({ categoryName, managementLevel, services }: ServiceCardProps) {
  const { t } = useLanguage();
  const included = services.filter((s) => s.included);
  const excluded = services.filter((s) => !s.included);

  return (
    <div className="bg-surface-elevated rounded-card border border-border-strong shadow-clay overflow-hidden">
      <div className="bg-accent/10 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-accent/15">
        <div>
          <p className="text-accent-glow/70 text-xs sm:text-sm">{categoryName}</p>
          <p className="text-accent-glow font-bold text-base sm:text-lg">
            {t('serviceCard.servicesIncluded', { count: included.length })}
          </p>
        </div>
        <Badge variant="neutral">{managementLevel}</Badge>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-2">
          {included.map((service) => (
            <ServiceIndicator
              key={service.key}
              name={t(`services.${service.key}`)}
              included
              variant="card"
              href={service.link}
            />
          ))}
        </div>

        {excluded.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-white/40 mb-2">{t('serviceCard.notIncluded')}</p>
            <div className="flex flex-wrap gap-2">
              {excluded.map((service) => (
                <ServiceIndicator
                  key={service.key}
                  name={t(`services.${service.key}`)}
                  included={false}
                  variant="pill"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
