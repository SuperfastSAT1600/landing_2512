'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import TutorialShell from '@/components/guide/TutorialShell';

const PUBLIC_PATH = '/guide/sfv2';

export default function AdminGuidePage() {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${PUBLIC_PATH}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-white">v2 학생 튜토리얼</h1>
        <button type="button" onClick={copyUrl} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? '복사됨' : `학생용 URL 복사 (${PUBLIC_PATH})`}
        </button>
      </div>
      <div className="rounded-2xl bg-gray-50 p-6 text-gray-900">
        <TutorialShell />
      </div>
    </div>
  );
}
