import type { Product } from './productTree';

/** Step 3 상단: 상품 선택 + 선택 즉시 노출되는 시간 입력. */
export function ProductPicker({
  products, productId, hours, setHours, onToggle,
}: {
  products: Product[];
  productId: string;
  hours: string;
  setHours: (v: string) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500">상품을 선택하세요</p>
      {products.map(p => {
        const isSelected = productId === p.id;
        return (
          <div key={p.id}>
            <button
              onClick={() => onToggle(p.id)}
              className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors text-left flex items-center gap-3 ${
                isSelected
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
              }`}>
                {isSelected && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span className="flex-1">{p.label}</span>
              {p.requiresHours && !isSelected && (
                <span className="text-[10px] text-gray-400">시간 입력</span>
              )}
            </button>
            {/* 시간 입력 — 선택 즉시 노출 */}
            {isSelected && p.requiresHours && (
              <div className="mt-1.5 ml-7 flex items-center gap-2">
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  placeholder="시간 수"
                  autoFocus
                  className="w-24 px-3 py-1.5 rounded-lg border border-blue-200 text-xs focus:outline-none focus:border-blue-400 bg-blue-50"
                />
                <span className="text-xs text-gray-400">시간</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
