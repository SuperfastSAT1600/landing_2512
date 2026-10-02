import { PRODUCT_TREE, type ClassType, type PaymentType, type Subject } from './productTree';

/** Step -1: 파트너 선택 (B2B 학생이고 파트너 미설정 시) */
export function PartnerStep({ partnerOptions, onSelect }: { partnerOptions: string[]; onSelect: (p: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500">연결할 파트너를 선택하세요</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {partnerOptions.map(p => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Step 0: 결제 유형 (최초/재결제) */
export function PaymentTypeStep({ onSelect }: { onSelect: (pt: PaymentType) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500">결제 유형을 선택하세요</p>
      {(['최초결제', '재결제'] as PaymentType[]).map(pt => (
        <button
          key={pt}
          onClick={() => onSelect(pt)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left flex items-center justify-between"
        >
          <span>{pt}</span>
          <span className="text-xs text-gray-400">
            {pt === '최초결제' ? '이 학생의 첫 결제' : '기존 학생의 추가 결제'}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Step 1: 수업 유형 */
export function ClassTypeStep({ onSelect }: { onSelect: (ct: ClassType) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500">수업 유형을 선택하세요</p>
      {(['1:1', '1:2', '그룹', '콘텐츠'] as ClassType[]).map(ct => (
        <button
          key={ct}
          onClick={() => onSelect(ct)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left flex items-center justify-between"
        >
          <span>
            {ct === '1:1' && '1:1 수업'}
            {ct === '1:2' && '1:2 수업'}
            {ct === '그룹' && '그룹 수업'}
            {ct === '콘텐츠' && '콘텐츠'}
          </span>
          <span className="text-xs text-gray-400">
            {ct === '1:1' && 'SAT · AP'}
            {ct === '1:2' && 'SAT · AP'}
            {ct === '그룹' && 'SAT'}
            {ct === '콘텐츠' && '단어학습 · SuperTest · 인강'}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Step 2: 과목 */
export function SubjectStep({ classType, onSelect }: { classType: ClassType | null; onSelect: (s: Subject) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500">과목을 선택하세요</p>
      {(['SAT', 'AP'] as Subject[]).map(s => {
        const available = classType ? Object.keys(PRODUCT_TREE[classType]).includes(s) : false;
        return (
          <button
            key={s}
            onClick={() => available && onSelect(s)}
            disabled={!available}
            className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-colors text-left ${
              available
                ? 'border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
                : 'border-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            {s}
            {!available && <span className="ml-2 text-[11px]">(준비 중)</span>}
          </button>
        );
      })}
    </div>
  );
}
