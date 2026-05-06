'use client';

import { useState } from 'react';
import { setPixelAdvancedMatching } from '@/lib/pixel-matching';

type Step = 1 | 2 | 3;

const TIME_OPTIONS: string[] = [];
for (let h = 9; h <= 22; h++) {
  const period = h < 12 ? '오전' : h === 12 ? '오후' : '오후';
  const display = h <= 12 ? h : h - 12;
  TIME_OPTIONS.push(`${period} ${display}:00`);
  if (h < 22) TIME_OPTIONS.push(`${period} ${display}:30`);
}

function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function ApplicationForm() {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);

  const handleStep1Next = () => {
    let valid = true;
    if (!name.trim()) { setNameError('이름을 입력해주세요.'); valid = false; } else setNameError('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) { setPhoneError('전화번호를 입력해주세요. (예: +1 234 567 8900 / 010-1234-5678)'); valid = false; } else setPhoneError('');
    if (valid) {
      setPixelAdvancedMatching({ fn: name.trim().split(' ')[0], ph: phone.trim() }).catch(() => {});
      setStep(2);
    }
  };

  const handleStep2Next = () => {
    let valid = true;
    if (!preferredDate) { setDateError('날짜를 선택해주세요.'); valid = false; } else setDateError('');
    if (!preferredTime) { setTimeError('시간을 선택해주세요.'); valid = false; } else setTimeError('');
    if (valid) setStep(3);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/diagnosis/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, preferredDate, preferredTime }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSubmitError(d.error ?? '오류가 발생했습니다. 다시 시도해주세요.');
        return;
      }
      window.fbq?.('track', 'Lead', { content_name: 'diagnosis_application', currency: 'KRW', value: 0 });
      setDone(true);
    } catch {
      setSubmitError('연결 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="py-6">
        <div className="flex flex-col items-center mb-5">
          <div className="w-14 h-14 bg-[#071be9]/20 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-[#6085FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">신청해 주셔서 감사합니다!</h3>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-gray-300 text-sm leading-relaxed">
            현재 심도 있는 1:1 진단 상담이 순차적으로 진행되고 있어, 하루에 소화 가능한 진단 인원에 제한을 두고 있습니다.
            <br /><br />
            보다 정밀한 상담을 위해 연락이 조금 늦어질 수 있는 점 너그러운 양해 부탁드립니다.
            <br /><br />
            최대한 빠르게 안내 도와드리겠습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              s < step ? 'bg-[#071be9] text-white' :
              s === step ? 'bg-[#071be9] text-white ring-2 ring-[#6085FF]/50' :
              'bg-white/10 text-gray-500'
            }`}>{s}</div>
            {s < 3 && <div className={`flex-1 h-px w-12 ${s < step ? 'bg-[#071be9]' : 'bg-white/10'}`} />}
          </div>
        ))}
        <span className="ml-2 text-xs text-gray-400">{step}/3</span>
      </div>

      {/* Step 1: Name + Phone */}
      {step === 1 && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-white mb-1">기본 정보</h3>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              placeholder="예: 홍길동"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#071be9]/60"
            />
            {nameError && <p className="text-red-400 text-xs mt-1">{nameError}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">전화번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
              placeholder="예: +1 234 567 8900 / 010-1234-5678"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#071be9]/60"
            />
            {phoneError && <p className="text-red-400 text-xs mt-1">{phoneError}</p>}
          </div>
          <button
            onClick={handleStep1Next}
            className="w-full py-3 bg-[#071be9] hover:bg-[#1a31f0] text-white font-semibold rounded-xl transition-colors"
          >
            다음 →
          </button>
        </div>
      )}

      {/* Step 2: Date + Time */}
      {step === 2 && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-white mb-1">희망 일정</h3>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">희망 날짜</label>
            <input
              type="date"
              value={preferredDate}
              min={getTodayString()}
              onChange={(e) => { setPreferredDate(e.target.value); setDateError(''); }}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#071be9]/60 [color-scheme:dark]"
            />
            {dateError && <p className="text-red-400 text-xs mt-1">{dateError}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">희망 시간 (KST)</label>
            <select
              value={preferredTime}
              onChange={(e) => { setPreferredTime(e.target.value); setTimeError(''); }}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#071be9]/60"
            >
              <option value="" className="bg-gray-900">시간을 선택하세요</option>
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t} className="bg-gray-900">{t}</option>
              ))}
            </select>
            {timeError && <p className="text-red-400 text-xs mt-1">{timeError}</p>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl transition-colors"
            >
              ← 이전
            </button>
            <button
              onClick={handleStep2Next}
              className="flex-1 py-3 bg-[#071be9] hover:bg-[#1a31f0] text-white font-semibold rounded-xl transition-colors"
            >
              다음 →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-white mb-1">신청 확인</h3>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">이름</span>
              <span className="text-white font-semibold">{name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">전화번호</span>
              <span className="text-white font-semibold">{phone}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">희망 날짜</span>
              <span className="text-white font-semibold">{preferredDate}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">희망 시간 (KST)</span>
              <span className="text-white font-semibold">{preferredTime}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            신청 후 담당자가 직접 연락드려 일정을 확정합니다.
          </p>
          {submitError && <p className="text-red-400 text-sm">{submitError}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl transition-colors"
              disabled={submitting}
            >
              ← 이전
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 bg-[#071be9] hover:bg-[#1a31f0] text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? '신청 중...' : '신청하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
