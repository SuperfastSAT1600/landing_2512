import type { RWCognitionItem, RWStudentProfile, RWQuestionType } from '@/lib/report-data';

interface Props {
  rwCognitionData: RWCognitionItem[];
  rwStudentProfile?: RWStudentProfile;
}

const TYPE_CONFIG: Record<RWQuestionType, {
  labelKo: string;
  desc: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
}> = {
  sniper: {
    labelKo: '확신 정답',
    desc: '정답 선택 + 확신 75% 이상. 정답의 이유를 명확하게 파악한 상태.',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    text: '#15803D',
    dot: '#22C55E',
  },
  doubt: {
    labelKo: '불확실 정답',
    desc: '정답 선택 + 확신 50% 이하. 결과는 맞았지만 이유를 명확히 설명하지 못하는 상태.',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    text: '#1D4ED8',
    dot: '#3B82F6',
  },
  hasty: {
    labelKo: '성급한 선택',
    desc: '정답 보기 등장 전에 오답 확정. 성급한 학생 특유의 패턴.',
    bg: '#FFF7ED',
    border: '#FED7AA',
    text: '#C2410C',
    dot: '#F97316',
  },
  avoider: {
    labelKo: '논리 부재',
    desc: '정답을 보고도 넘어감. 정답의 이유를 파악하지 못하는 논리적 디테일 부족.',
    bg: '#FFF1F2',
    border: '#FECDD3',
    text: '#BE123C',
    dot: '#F43F5E',
  },
};

const TYPE_ORDER: RWQuestionType[] = ['sniper', 'doubt', 'hasty', 'avoider'];

const PROFILE_STYLE: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  master:  { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', badge: '#22C55E' },
  doubt:   { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', badge: '#3B82F6' },
  hasty:   { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', badge: '#F97316' },
  avoider: { bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C', badge: '#F43F5E' },
  chaotic: { bg: '#FDF4FF', border: '#E9D5FF', text: '#7E22CE', badge: '#A855F7' },
};

const PROFILE_LABEL: Record<string, string> = {
  master:  '준비 완료',
  doubt:   '불확실 정답형',
  hasty:   '성급한 학생',
  avoider: '논리적 디테일 부족',
  chaotic: '성급함 + 논리 부재',
};

export function ReportRWCognition({ rwCognitionData, rwStudentProfile }: Props) {
  const counts = TYPE_ORDER.reduce((acc, t) => {
    acc[t] = rwCognitionData.filter(r => r.questionType === t).length;
    return acc;
  }, {} as Record<RWQuestionType, number>);

  const grouped = TYPE_ORDER.reduce((acc, t) => {
    acc[t] = rwCognitionData.filter(r => r.questionType === t);
    return acc;
  }, {} as Record<RWQuestionType, RWCognitionItem[]>);

  const profileStyle = rwStudentProfile
    ? (PROFILE_STYLE[rwStudentProfile.profileType] ?? PROFILE_STYLE.avoider)
    : null;

  return (
    <div className="space-y-4">

      {/* ── Student profile card ── */}
      {rwStudentProfile && profileStyle && (
        <div
          className="rounded-2xl border p-5"
          style={{ background: profileStyle.bg, borderColor: profileStyle.border }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: profileStyle.badge }}
            >
              {PROFILE_LABEL[rwStudentProfile.profileType]}
            </span>
          </div>

          <p
            className="text-base font-bold leading-snug mb-2"
            style={{ color: profileStyle.text }}
          >
            {rwStudentProfile.headline}
          </p>

          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            {rwStudentProfile.evidence}
          </p>

          {rwStudentProfile.prescription && (
            <div className="border-t pt-3" style={{ borderColor: profileStyle.border }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: profileStyle.text }}>
                처방
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {rwStudentProfile.prescription}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Per-question breakdown ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Summary counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-50 border-b border-slate-50">
          {TYPE_ORDER.map((type) => {
            const cfg = TYPE_CONFIG[type];
            const count = counts[type];
            return (
              <div key={type} className="px-4 py-4 text-center">
                <div className="text-3xl font-black mb-1" style={{ color: count > 0 ? cfg.dot : '#CBD5E1' }}>
                  {count}
                </div>
                <div className="text-[10px] font-bold text-slate-400 leading-tight">{cfg.labelKo}</div>
              </div>
            );
          })}
        </div>

        {/* Type legend */}
        <div className="px-5 py-4 border-b border-slate-100 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">분류 기준</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TYPE_ORDER.map((type) => {
              const cfg = TYPE_CONFIG[type];
              return (
                <div
                  key={type}
                  className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 border"
                  style={{ background: cfg.bg, borderColor: cfg.border }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                    style={{ background: cfg.dot }}
                  />
                  <div>
                    <p className="text-[11px] font-bold leading-tight" style={{ color: cfg.text }}>
                      {cfg.labelKo}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{cfg.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Question numbers by type */}
        <div className="px-5 py-4 space-y-3">
          {TYPE_ORDER.map((type) => {
            const items = grouped[type];
            if (items.length === 0) return null;
            const cfg = TYPE_CONFIG[type];
            return (
              <div key={type} className="flex items-center gap-3 flex-wrap">
                <span
                  className="text-[10px] font-bold flex-shrink-0 w-24"
                  style={{ color: cfg.dot }}
                >
                  {cfg.labelKo} <span className="text-slate-300 font-normal">({items.length})</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item) => (
                    <span
                      key={item.questionId}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                      style={{ background: cfg.dot }}
                      title={`Q${item.questionNumber} · ${item.skill} · ${item.difficulty}`}
                    >
                      {item.questionNumber}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
