'use client';

import { useState } from 'react';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { GenerateTokenTab } from './components/GenerateTokenTab';
import { ViewResultsTab } from './components/ViewResultsTab';
import { QuestionManagementTab } from './components/QuestionManagementTab';
import { VersionManagementTab } from './components/VersionManagementTab';

type Tab = 'tokens' | 'results' | 'questions' | 'versions';

const TABS: { id: Tab; label: string }[] = [
  { id: 'tokens', label: '코드 관리' },
  { id: 'results', label: '시험 결과' },
  { id: 'questions', label: '문항 통계' },
  { id: 'versions', label: '버전 관리' },
];

export default function AdminDiagnosisPage() {
  const { adminKey } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<Tab>('tokens');

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-8">

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-700">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 rounded-lg p-8">
          {activeTab === 'tokens' && <GenerateTokenTab adminKey={adminKey} />}
          {activeTab === 'results' && <ViewResultsTab adminKey={adminKey} />}
          {activeTab === 'questions' && <QuestionManagementTab adminKey={adminKey} />}
          {activeTab === 'versions' && <VersionManagementTab adminKey={adminKey} />}
        </div>
      </div>
    </div>
  );
}
