'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { BookOpen, Activity, Filter, Layers, Brain, Database, Search } from 'lucide-react';

export default function DashboardClient() {
  const [data, setData] = useState<{
    metadata: { skill: string; difficulty: string };
    content?: { passage?: string; question_text?: string; explanation?: string };
    analysis?: {
      passage_logical_flow?: string;
      target_transition_category?: string;
      passage_topic?: string;
      target_word_pos?: string;
      sentence_1_summary?: string;
      sentence_2_summary?: string;
      synonyms_for_correct_answer?: string[];
    };
    _searchScore?: number;
    [key: string]: unknown;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [activeSkill, setActiveSkill] = useState<string>('Words in Context');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/ontology')
      .then(res => res.json())
      .then(json => {
        setData(json.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredData = useMemo(() => {
    let result = data.filter(item => {
      if (activeSkill !== 'All' && item.metadata.skill !== activeSkill) return false;
      if (difficultyFilter !== 'All' && item.metadata.difficulty.toLowerCase() !== difficultyFilter.toLowerCase()) return false;
      
      // Natural Language (Sentence) Search Processing
      if (searchQuery) {
        const KOR_TO_ENG: Record<string, string> = {
          "형용사": "adjective", "동사": "verb", "명사": "noun", "부사": "adverb",
          "대조": "contrast", "역접": "contrast", "반전": "contrast",
          "원인": "cause", "결과": "effect", "인과": "cause",
          "예시": "exemplification", "부연설명": "exemplification",
          "추가": "addition", "강조": "emphasis", 
          "문학": "literature", "과학": "science", "역사": "history", "사회": "social",
          "쉬운": "easy", "어려운": "hard", "어렵": "hard"
        };
        
        // Split sentence into words, map Korean to English if exists, ignore very short non-korean stop words
        const queryWords = searchQuery.toLowerCase().split(/[\s,?.!은는이가을를에의]+/)
          .filter(w => w.length > 0)
          .map(w => KOR_TO_ENG[w] || w);
        
        if (queryWords.length > 0) {
          const textBlock = [
            item.content?.passage,
            item.content?.question_text,
            item.content?.explanation,
            item.analysis?.passage_logical_flow,
            item.analysis?.target_transition_category,
            item.analysis?.passage_topic,
            item.analysis?.target_word_pos,
            item.analysis?.sentence_1_summary,
            item.analysis?.sentence_2_summary,
            ...(item.analysis?.synonyms_for_correct_answer || [])
          ].filter(Boolean).join(' ').toLowerCase();

          // Compute a relevance score based on how many words from the sentence appear in the question's ontology
          let score = 0;
          for (const word of queryWords) {
            if (textBlock.includes(word)) score += 1;
          }
          
          // Return false if absolutely zero words from the sentence match the text
          if (score === 0) return false;
          
          // Temporarily store score for sorting
          item._searchScore = score;
        }
      }
      return true;
    });

    // If searching, sort the results by the relevance score
    if (searchQuery) {
      result = result.sort((a, b) => (b._searchScore || 0) - (a._searchScore || 0));
    }

    return result;
  }, [data, activeSkill, difficultyFilter, searchQuery]);

  // Compute Stats
  const logicFlowCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(item => {
      const flow = item.analysis?.passage_logical_flow || item.analysis?.target_transition_category;
      if (flow) {
        counts[flow] = (counts[flow] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5
  }, [filteredData]);

  const posCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(item => {
      const pos = item.analysis?.target_word_pos;
      if (pos) {
        counts[pos] = (counts[pos] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredData]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f111a] text-white">
        <div className="flex flex-col items-center">
          <Brain className="w-12 h-12 text-indigo-500 animate-pulse mb-4" />
          <h2 className="text-xl font-semibold tracking-wider text-indigo-200">Loading Knowledge Graph...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Top Navbar */}
      <nav className="border-b border-indigo-500/10 bg-[#151822]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-xl">
                <Database className="w-6 h-6 text-indigo-400" />
              </div>
              <span className="text-xl font-bold text-indigo-400">
                Ontology Explorer
              </span>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveSkill('Words in Context')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeSkill === 'Words in Context' ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-800/50 text-slate-400 hover:text-white'}`}
              >
                Words in Context
              </button>
              <button 
                onClick={() => setActiveSkill('Transitions')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeSkill === 'Transitions' ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-slate-800/50 text-slate-400 hover:text-white'}`}
              >
                Transitions
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Row */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search passages, explanations, or concepts (e.g., 'Science', 'Contrast')..."
              className="block w-full pl-11 pr-4 py-3 bg-[#1a1d27] border border-slate-700/50 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-[#1a1d27] p-1.5 rounded-2xl border border-slate-700/50">
            <Filter className="w-5 h-5 ml-3 text-slate-400" />
            <select
              className="bg-transparent border-none text-slate-200 focus:ring-0 cursor-pointer pr-8 py-2 outline-none appearance-none"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-[#1e2230] to-[#151822] p-6 rounded-3xl border border-slate-700/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Layers className="w-24 h-24" />
            </div>
            <h3 className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1">Total Datapoints</h3>
            <p className="text-4xl font-bold text-white">{filteredData.length}</p>
          </div>
          <div className="bg-gradient-to-br from-[#1e2230] to-[#151822] p-6 rounded-3xl border border-slate-700/30 relative overflow-hidden group">
            <h3 className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1">Top Logic Flow</h3>
            <p className="text-3xl font-bold text-indigo-400">{logicFlowCounts[0]?.name || 'N/A'}</p>
            <p className="text-sm text-slate-500 mt-2">{logicFlowCounts[0]?.count || 0} occurrences</p>
          </div>
          <div className="bg-gradient-to-br from-[#1e2230] to-[#151822] p-6 rounded-3xl border border-slate-700/30 relative overflow-hidden group">
            <h3 className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1">
              {activeSkill === 'Words in Context' ? 'Top Part of Speech' : 'Top Topic'}
            </h3>
            <p className="text-3xl font-bold text-purple-400">
               {activeSkill === 'Words in Context' ? (posCounts[0]?.name || 'N/A') : (logicFlowCounts.length > 1 ? logicFlowCounts[1].name : 'N/A')}
            </p>
          </div>
        </div>

        {/* Charts Rack */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#151822] p-6 rounded-3xl border border-slate-700/30 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              Logical Flow Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={logicFlowCounts} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#1e2230'}} 
                    contentStyle={{ backgroundColor: '#0f111a', border: '1px solid #334155', borderRadius: '12px', color: '#f8fafc' }} 
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {logicFlowCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#151822] p-6 rounded-3xl border border-slate-700/30 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              {activeSkill === 'Words in Context' ? 'Parts of Speech Frequency' : 'Transition Logic Occurrences'}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeSkill === 'Words in Context' ? posCounts : logicFlowCounts} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                  <XAxis type="number" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    cursor={{fill: '#1e2230'}} 
                    contentStyle={{ backgroundColor: '#0f111a', border: '1px solid #334155', borderRadius: '12px', color: '#f8fafc' }} 
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#151822] rounded-3xl border border-slate-700/30 overflow-hidden shadow-lg">
          <div className="px-6 py-5 border-b border-slate-700/50 bg-[#1a1d27]/50">
            <h3 className="text-lg font-semibold text-slate-200">Ontology Insights Record</h3>
            <p className="text-sm text-slate-500 mt-1">Detailed view of the extracted semantic networks</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1d27]">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">ID & Diff</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-1/2">Context Logic</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Insight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredData.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#1a1d27]/50 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-sm text-indigo-300">{row.metadata.question_id}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium w-fit
                          ${row.metadata.difficulty.toLowerCase() === 'hard' ? 'bg-red-500/10 text-red-400' : 
                            row.metadata.difficulty.toLowerCase() === 'medium' ? 'bg-yellow-500/10 text-yellow-400' : 
                            'bg-emerald-500/10 text-emerald-400'}`}>
                          {row.metadata.difficulty}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="text-sm text-slate-300 mb-2 leading-relaxed">
                        <span className="font-semibold text-slate-500 mr-2">Core Pattern:</span>
                        {row.analysis?.passage_logical_flow || row.analysis?.target_transition_category || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-500 bg-[#0f111a] p-3 rounded-xl border border-slate-800 line-clamp-2">
                        {row.content?.passage || 'No passage available'}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      {activeSkill === 'Words in Context' ? (
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded w-fit">
                            {row.analysis?.target_word_pos || 'N/A'}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {row.analysis?.synonyms_for_correct_answer?.map?.((syn: string, i: number) => (
                              <span key={i} className="text-xs text-slate-400 border border-slate-700 rounded-full px-2 py-0.5">
                                {syn}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 text-xs text-slate-300">
                          <div><span className="text-slate-500">S1:</span> {row.analysis?.sentence_1_summary || 'N/A'}</div>
                          <div><span className="text-slate-500">S2:</span> {row.analysis?.sentence_2_summary || 'N/A'}</div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length > 50 && (
              <div className="text-center p-4 text-slate-500 text-sm bg-[#1a1d27]/30 border-t border-slate-800">
                Showing top 50 results. Use filters to narrow down.
              </div>
            )}
            {filteredData.length === 0 && (
              <div className="text-center p-12 text-slate-500">
                No matching questions found in the ontology database.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
