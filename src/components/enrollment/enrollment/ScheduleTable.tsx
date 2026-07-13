import { memo } from 'react';
import { useLanguage } from '@/lib/enrollment/i18n/LanguageContext';
import type { SummerIntensiveInfo } from '@/types/enrollment';

type Schedule = SummerIntensiveInfo['schedule'];

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;
const DAY_GROUP_KEYS = ['concept', 'practice'] as const;

// Map original Korean cell text → translation key
const CELL_KEY_MAP: Record<string, string> = {
  'Vocab': 'summer.schedule.cells.vocab',
  'RW 라이브 강의': 'summer.schedule.cells.rwLive',
  'RW Module1\nTEST': 'summer.schedule.cells.rwModule1Test',
  'Math Module 1\nTEST': 'summer.schedule.cells.mathModule1Test',
  'RW Module 2\nTEST': 'summer.schedule.cells.rwModule2Test',
  'Math Module 2\nTEST': 'summer.schedule.cells.mathModule2Test',
  '라이브\n개념 및 해설 강의': 'summer.schedule.cells.liveConceptReview',
  '휴식': 'summer.schedule.cells.break',
  '맞춤형 학습\n(Live Text Tutoring)': 'summer.schedule.cells.customLearning',
  'Vocab TEST\n복습 문제 정리': 'summer.schedule.cells.vocabTestReview',
};

export const ScheduleTable = memo(function ScheduleTable({ schedule }: { schedule: Schedule }) {
  const { t } = useLanguage();

  return (
    <div className="relative bg-surface-elevated rounded-card border border-border-strong shadow-clay overflow-hidden -mx-4 sm:mx-0">
      {/* 모바일 가로 스크롤 힌트 */}
      <div className="sm:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface-elevated to-transparent z-10" />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[480px]">
          <thead>
            <tr className="border-b border-white/5">
              <th
                rowSpan={2}
                className="px-2 sm:px-3 py-2 text-[11px] sm:text-xs font-bold text-white/50 text-center bg-white/5 border-r border-white/5 w-[80px] sm:w-[110px]"
              >
                {t('summer.schedule.header')}
              </th>
              {DAY_GROUP_KEYS.map((key, i) => (
                <th
                  key={key}
                  colSpan={schedule.dayGroups[i].span}
                  className="px-2 py-2 text-[11px] sm:text-xs font-bold text-white/70 text-center bg-white/5 border-r border-white/5 last:border-r-0"
                >
                  {t(`summer.schedule.dayGroups.${key}`)}
                </th>
              ))}
            </tr>
            <tr className="border-b border-white/5 bg-white/[0.03]">
              {DAY_KEYS.map((key, i) => (
                <th
                  key={key}
                  className={`px-1 py-2 text-[11px] sm:text-xs font-bold text-center text-emerald-400 ${
                    i === 2 ? 'border-r border-white/5' : ''
                  }`}
                >
                  {t(`summer.schedule.days.${key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.rows.map((row, ri) => (
              <tr
                key={row.time}
                className={`${ri < schedule.rows.length - 1 ? 'border-b border-white/5' : ''} ${
                  row.isBreak ? 'bg-white/[0.02]' : ''
                }`}
              >
                <td className="px-2 sm:px-3 py-3 text-[10px] sm:text-xs text-white/60 text-center border-r border-white/5 whitespace-nowrap">
                  {row.time}
                </td>
                {row.cells.map((cell, ci) => {
                  if (cell === null) return null;
                  const colorClass = row.isBreak
                    ? 'text-white/40'
                    : cell.color === 'red'
                      ? 'text-rose-400'
                      : 'text-accent-glow';
                  const needsRightBorder = !cell.colSpan && ci === 0 && row.cells.length > 1;
                  const translatedText = CELL_KEY_MAP[cell.text]
                    ? t(CELL_KEY_MAP[cell.text])
                    : cell.text;
                  return (
                    <td
                      key={`${row.time}-${ci}`}
                      rowSpan={cell.rowSpan}
                      colSpan={cell.colSpan}
                      className={`py-3 px-1 sm:px-2 text-[11px] sm:text-xs font-medium text-center whitespace-pre-line leading-snug ${colorClass} ${
                        cell.colSpan === 3 || needsRightBorder ? 'border-r border-white/5' : ''
                      } ${cell.rowSpan && cell.rowSpan > 1 ? 'align-middle bg-accent-glow/[0.04]' : ''}`}
                    >
                      {translatedText}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
