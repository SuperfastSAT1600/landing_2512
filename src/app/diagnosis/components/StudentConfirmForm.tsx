'use client';

interface StudentConfirmFormProps {
  studentEmail: string;
  studentName: string;
  onStart: () => void;
}

export function StudentConfirmForm({
  studentEmail,
  studentName,
  onStart,
}: StudentConfirmFormProps) {
  return (
    <div className="w-full max-w-md bg-[#1e2023] rounded-2xl border border-white/5 p-6 md:p-8 shadow-2xl">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">학생 정보 확인</h2>
        <p className="text-gray-500 text-sm">
          아래 정보가 올바른지 확인해주세요
        </p>
      </div>

      <div className="space-y-4 mb-8">
        <div className="bg-[#151719] rounded-xl p-4 border border-white/5">
          <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">
            이름
          </label>
          <p className="text-white text-lg font-semibold">{studentName}</p>
        </div>

        <div className="bg-[#151719] rounded-xl p-4 border border-white/5">
          <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">
            이메일
          </label>
          <p className="text-white text-lg font-semibold break-all">{studentEmail}</p>
        </div>
      </div>

      <button
        onClick={onStart}
        className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all text-lg shadow-lg shadow-blue-900/20"
      >
        테스트 시작
      </button>
    </div>
  );
}
