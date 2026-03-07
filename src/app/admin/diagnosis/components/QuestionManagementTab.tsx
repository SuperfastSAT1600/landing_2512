'use client';

import { useState, useEffect, useMemo } from 'react';
import { QuestionStat } from '@/lib/diagnosis-analysis';
import { QuestionDetailModal } from './QuestionDetailModal';

interface QuestionManagementTabProps {
  adminKey: string;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: 'text-green-400',
  Medium: 'text-yellow-400',
  Hard: 'text-red-400',
};

type SortKey = 'questionNumber' | 'accuracyRate' | 'avgConfidence' | 'avgTimeSeconds';

export function QuestionManagementTab({ adminKey }: QuestionManagementTabProps) {
  const [stats, setStats] = useState<QuestionStat[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStat, setSelectedStat] = useState<QuestionStat | null>(null);

  const [filterSection, setFilterSection] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('questionNumber');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/diagnosis/question-stats', {
        headers: { 'x-admin-key': adminKey },
      });
      if (!response.ok) throw new Error('통계를 불러올 수 없습니다.');
      const data = await response.json();
      setStats(data.stats ?? []);
      setTotalResults(data.totalResults ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const sections = useMemo(() => [...new Set(stats.map((s) => s.section))], [stats]);
  const domains = useMemo(
    () => [...new Set(stats.filter((s) => !filterSection || s.section === filterSection).map((s) => s.domain))],
    [stats, filterSection]
  );

  const filtered = useMemo(() => {
    let result = stats;
    if (filterSection) result = result.filter((s) => s.section === filterSection);
    if (filterDomain) result = result.filter((s) => s.domain === filterDomain);
    if (filterDifficulty) result = result.filter((s) => s.difficulty === filterDifficulty);
    return [...result].sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortAsc ? av - bv : bv - av;
    });
  }, [stats, filterSection, filterDomain, filterDifficulty, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((prev) => !prev);
    else { setSortKey(key); setSortAsc(key === 'questionNumber'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? <span className="ml-1">{sortAsc ? '↑' : '↓'}</span> : null;

  if (loading) return <p className="text-gray-400">통계 로딩 중...</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">
          총 <span className="text-white font-semibold">{stats.length}</span>문항 ·{' '}
          응시 <span className="text-white font-semibold">{totalResults}</span>건
        </p>
        <button
          onClick={fetchStats}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          새로고침
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterSection}
          onChange={(e) => { setFilterSection(e.target.value); setFilterDomain(''); }}
          className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none"
        >
          <option value="">전체 섹션</option>
          {sections.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterDomain}
          onChange={(e) => setFilterDomain(e.target.value)}
          className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none"
        >
          <option value="">전체 도메인</option>
          {domains.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none"
        >
          <option value="">전체 난이도</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>

      {totalResults === 0 && (
        <p className="text-gray-500 text-sm">아직 응시 데이터가 없습니다. 통계는 응시 후 집계됩니다.</p>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-600 text-gray-400">
              <th
                className="text-left py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                onClick={() => handleSort('questionNumber')}
              >
                # <SortIcon k="questionNumber" />
              </th>
              <th className="text-left py-3 px-3 whitespace-nowrap">섹션</th>
              <th className="text-left py-3 px-3 whitespace-nowrap">도메인</th>
              <th className="text-left py-3 px-3 whitespace-nowrap">스킬</th>
              <th className="text-left py-3 px-3 whitespace-nowrap">난이도</th>
              <th
                className="text-right py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                onClick={() => handleSort('accuracyRate')}
              >
                정답률 <SortIcon k="accuracyRate" />
              </th>
              <th
                className="text-right py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                onClick={() => handleSort('avgConfidence')}
              >
                자신감 <SortIcon k="avgConfidence" />
              </th>
              <th
                className="text-right py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                onClick={() => handleSort('avgTimeSeconds')}
              >
                평균 시간 <SortIcon k="avgTimeSeconds" />
              </th>
              <th className="text-right py-3 px-3">응시</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((stat) => (
              <tr
                key={stat.questionId}
                className="border-b border-gray-700 hover:bg-gray-700/50 cursor-pointer"
                onClick={() => setSelectedStat(stat)}
              >
                <td className="py-3 px-3 font-mono">{stat.questionNumber}</td>
                <td className="py-3 px-3 text-gray-300">
                  {stat.section === 'Reading and Writing' ? 'RW' : 'Math'}
                </td>
                <td className="py-3 px-3 text-gray-300 max-w-[180px]">
                  <span className="truncate block">{stat.domain}</span>
                </td>
                <td className="py-3 px-3 text-gray-300 max-w-[180px]">
                  <span className="truncate block">{stat.skill}</span>
                </td>
                <td className={`py-3 px-3 font-semibold ${DIFFICULTY_COLOR[stat.difficulty]}`}>
                  {stat.difficulty}
                </td>
                <td className="py-3 px-3 text-right">
                  {stat.totalAttempts > 0 ? (
                    <span className={
                      stat.accuracyRate >= 0.7 ? 'text-green-400' :
                      stat.accuracyRate >= 0.4 ? 'text-yellow-400' : 'text-red-400'
                    }>
                      {(stat.accuracyRate * 100).toFixed(1)}%
                    </span>
                  ) : <span className="text-gray-600">-</span>}
                </td>
                <td className="py-3 px-3 text-right text-gray-300">
                  {stat.avgConfidence > 0 ? stat.avgConfidence.toFixed(1) : '-'}
                </td>
                <td className="py-3 px-3 text-right text-gray-300">
                  {stat.avgTimeSeconds > 0
                    ? `${Math.floor(stat.avgTimeSeconds / 60)}:${String(Math.round(stat.avgTimeSeconds % 60)).padStart(2, '0')}`
                    : '-'}
                </td>
                <td className="py-3 px-3 text-right text-gray-400">
                  {stat.totalAttempts > 0 ? stat.totalAttempts : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedStat && (
        <QuestionDetailModal stat={selectedStat} onClose={() => setSelectedStat(null)} />
      )}
    </div>
  );
}
