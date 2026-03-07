'use client';

import { useState } from 'react';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { GenerateTokenTab } from './components/GenerateTokenTab';
import { ViewResultsTab } from './components/ViewResultsTab';
import { QuestionManagementTab } from './components/QuestionManagementTab';

type Tab = 'tokens' | 'results' | 'questions';

export default function AdminDiagnosisPage() {
  const { adminKey } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<Tab>('tokens');

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-8">

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('tokens')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'tokens'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            코드 관리
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'results'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            시험 결과
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'questions'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            문항 관리
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 rounded-lg p-8">
          {activeTab === 'tokens' && <GenerateTokenTab adminKey={adminKey} />}
          {activeTab === 'results' && <ViewResultsTab adminKey={adminKey} />}
          {activeTab === 'questions' && <QuestionManagementTab adminKey={adminKey} />}
        </div>
      </div>
    </div>
  );
}
