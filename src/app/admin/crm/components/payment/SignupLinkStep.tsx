import { CheckCircle2, Copy, Check } from 'lucide-react';

/** Step 4: 결제 완료 → 튜터링 학생 회원가입 링크. */
export function SignupLinkStep({
  studentName, signupUrl, copied, onCopy,
}: {
  studentName: string;
  signupUrl: string | null;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 size={16} />
        <p className="text-sm font-semibold">결제가 등록되었습니다</p>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        아래 링크를 <span className="font-medium text-gray-700">{studentName}</span> 학생에게 전달하세요.
        이 링크로 가입하면 자동으로 튜터링 학생 계정이 되고, CRM 정보가 미리 채워집니다.
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={signupUrl ?? ''}
          onFocus={e => e.currentTarget.select()}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-xs bg-gray-50 text-gray-700"
        />
        <button
          onClick={onCopy}
          className="shrink-0 px-3 py-2 rounded-lg border border-blue-200 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-1"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
    </div>
  );
}
