'use client';

import { useState } from 'react';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { GenerateTokenTab } from './components/GenerateTokenTab';
import { ViewResultsTab } from './components/ViewResultsTab';

type Tab = 'tokens' | 'results';

export default function AdminDiagnosisPage() {
  const { isAuthenticated, adminKey } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<Tab>('tokens');

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">You are not authenticated as an admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">진단테스트 관리</h1>

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
            토큰 생성
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
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 rounded-lg p-8">
          {activeTab === 'tokens' && <GenerateTokenTab adminKey={adminKey} />}
          {activeTab === 'results' && <ViewResultsTab adminKey={adminKey} />}
        </div>
      </div>
    </div>
  );
}
