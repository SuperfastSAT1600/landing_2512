'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { X, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/lib/enrollment/i18n/LanguageContext';
import type { LeadCoachProfile } from '@/lib/enrollment/data/lead-coaches';

interface LeadCoachesModalProps {
  open: boolean;
  onClose: () => void;
  coaches: LeadCoachProfile[];
}

export function LeadCoachesModal({ open, onClose, coaches }: LeadCoachesModalProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={t('coachesModal.title')}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-surface-elevated rounded-card border border-border-strong shadow-clay-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-5 sm:px-6 py-4 bg-surface-elevated/95 backdrop-blur border-b border-white/5">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">{t('coachesModal.title')}</h2>
            <p className="text-xs sm:text-sm text-white/50 mt-0.5">{t('coachesModal.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('coachesModal.close')}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 sm:p-6">
          {coaches.map((coach) => (
            <a
              key={coach.slug}
              href={`/coaches/${coach.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-4 p-4 rounded-card bg-white/[0.03] border border-white/5 hover:border-accent-glow/40 hover:bg-white/[0.05] transition-colors"
            >
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-full overflow-hidden bg-white/5">
                {coach.photo && (
                  <Image
                    src={coach.photo}
                    alt={coach.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-white truncate">{coach.name}</h3>
                  <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-accent-glow transition-colors" />
                </div>
                {coach.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {coach.subjects.slice(0, 3).map((subject) => (
                      <span
                        key={subject}
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-glow/10 text-accent-glow/90"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                )}
                {coach.bio && (
                  <p className="text-xs text-white/45 mt-2 line-clamp-2">{coach.bio}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
