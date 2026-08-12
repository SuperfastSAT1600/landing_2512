'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Search, X, Maximize2 } from 'lucide-react';
import type { Problem } from './FlashcardModal';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

const SIDEBAR_W = 240;

interface GraphProblem {
  id: string;
  title: string | null;
  difficulty: string | null;
  concepts: { id: string; name: string; slug: string }[];
}

interface GraphNode {
  id: string;
  label: string;
  problem: Problem & { concepts: { id: string; name: string; slug: string }[] };
}

interface GraphLink {
  source: string;
  target: string;
  conceptName: string;
  conceptSlug: string;
}

interface Concept {
  id: string;
  name: string;
  slug: string;
  usage_count: number;
}

interface ConceptGraphProps {
  onNodeClick: (problem: Problem, nodeIds: string[], currentIndex: number) => void;
}

function getDifficultyStyle(difficulty: string | null) {
  switch (difficulty) {
    case 'easy':   return { dot: '#22c55e', glow: 'rgba(34,197,94,0.32)' };
    case 'medium': return { dot: '#f59e0b', glow: 'rgba(245,158,11,0.32)' };
    case 'hard':   return { dot: '#ef4444', glow: 'rgba(239,68,68,0.32)' };
    case 'killer': return { dot: '#c084fc', glow: 'rgba(192,132,252,0.32)' };
    default:       return { dot: '#a5b4fc', glow: 'rgba(96,133,255,0.32)' };
  }
}

function buildGraph(problems: GraphProblem[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = problems.map((p, i) => ({
    id: p.id,
    label: p.title ?? `문제 ${i + 1}`,
    problem: {
      ...p,
      question_image_url: null,
      question_html: null,
      options_json: null,
      answer_image_url: null,
      answer_text: null,
      memo: null,
    } as GraphNode['problem'],
  }));

  const links: GraphLink[] = [];
  for (let i = 0; i < problems.length; i++) {
    for (let j = i + 1; j < problems.length; j++) {
      const shared = problems[i].concepts.filter(ci =>
        problems[j].concepts.some(cj => cj.slug === ci.slug)
      );
      for (const c of shared) {
        links.push({ source: problems[i].id, target: problems[j].id, conceptName: c.name, conceptSlug: c.slug });
      }
    }
  }
  return { nodes, links };
}

export function ConceptGraph({ onNodeClick }: ConceptGraphProps) {
  const [selectedConceptSlugs, setSelectedConceptSlugs] = useState<Set<string>>(new Set());
  const [clickedConceptSlug, setClickedConceptSlug] = useState<string | null>(null);
  const [allProblems, setAllProblems] = useState<GraphProblem[]>([]);
  const [allConcepts, setAllConcepts] = useState<Concept[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(
    new Set(['easy', 'medium', 'hard', 'killer'])
  );
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Concept[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isMobile, setIsMobile] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  useEffect(() => {
    const update = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      setIsMobile(window.innerWidth < 768);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    fetch('/api/mathweb/graph')
      .then(r => r.json())
      .then(json => {
        const problems: GraphProblem[] = json.data?.problems ?? [];
        const concepts: Concept[] = json.data?.concepts ?? [];
        setAllProblems(problems);
        setAllConcepts(concepts);
        setGraphData(buildGraph(problems));
      });
  }, []);

  useEffect(() => {
    if (!fgRef.current) return;
    fgRef.current.d3Force('charge')?.strength(-280);
    fgRef.current.d3Force('link')?.distance(110);
    fgRef.current.d3ReheatSimulation?.();
  }, [graphData]);

  useEffect(() => {
    setClickedConceptSlug(null);
    const byDifficulty = allProblems.filter(p =>
      !p.difficulty || selectedDifficulties.has(p.difficulty)
    );
    if (selectedConceptSlugs.size === 0) {
      setGraphData(buildGraph(byDifficulty));
    } else {
      const filtered = byDifficulty.filter(p =>
        [...selectedConceptSlugs].every(slug => p.concepts.some(c => c.slug === slug))
      );
      setGraphData(buildGraph(filtered));
    }
  }, [selectedConceptSlugs, allProblems, selectedDifficulties]);

  const highlightedNodeIds = useMemo<Set<string> | null>(() => {
    if (!clickedConceptSlug) return null;
    return new Set(
      graphData.nodes
        .filter(n => n.problem.concepts.some(c => c.slug === clickedConceptSlug))
        .map(n => n.id)
    );
  }, [clickedConceptSlug, graphData.nodes]);

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    if (!val.trim()) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/mathweb/concepts?q=${encodeURIComponent(val)}&limit=10`);
      const json = await res.json();
      setSuggestions(json.data ?? []);
      setShowSuggestions(true);
    }, 200);
  }, []);

  const toggleConcept = useCallback((c: Concept) => {
    setSelectedConceptSlugs(prev => {
      const next = new Set(prev);
      next.has(c.slug) ? next.delete(c.slug) : next.add(c.slug);
      return next;
    });
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  // 개념 목록 클릭용 (Concept 객체 없이 slug만으로 제거)
  const removeConcept = useCallback((slug: string) => {
    setSelectedConceptSlugs(prev => {
      const next = new Set(prev);
      next.delete(slug);
      return next;
    });
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedConceptSlugs(new Set());
  }, []);

  const handleCenter = useCallback(() => {
    fgRef.current?.zoomToFit(400, 60);
  }, []);

  const handleNodeClick = useCallback(async (node: GraphNode) => {
    try {
      const res = await fetch(`/api/mathweb/problems/${node.id}`);
      if (!res.ok) return;
      const json = await res.json();
      const nodeIds = graphData.nodes.map(n => n.id);
      const currentIndex = nodeIds.indexOf(node.id);
      onNodeClick(json.data as Problem, nodeIds, currentIndex);
    } catch {
      // silently ignore
    }
  }, [onNodeClick, graphData.nodes]);

  const handleLinkClick = useCallback((link: GraphLink) => {
    setClickedConceptSlug(prev =>
      prev === link.conceptSlug ? null : link.conceptSlug
    );
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setClickedConceptSlug(null);
  }, []);

  const graphW = isMobile ? dimensions.width : dimensions.width - SIDEBAR_W;

  return (
    <div className="relative w-full h-full" style={{ background: 'radial-gradient(ellipse at 50% 38%, #0e0e38 0%, #07071c 38%, #020208 70%, #000000 100%)' }}>

      {/* ── 좌측 사이드바 ── */}
      {!isMobile && (
        <div
          className="absolute left-0 z-50 flex flex-col bg-zinc-950/90 backdrop-blur-md border-r border-zinc-800/70 overflow-hidden"
          style={{ top: 88, bottom: 0, width: SIDEBAR_W }}
        >
          {/* 검색 */}
          <div className="p-3 border-b border-zinc-800/70">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="개념 검색..."
                className="w-full pl-9 pr-8 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#6085FF] focus:ring-1 focus:ring-[#6085FF]/30 transition-all"
              />
              {query && (
                <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="mt-1.5 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-xl">
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleConcept(s)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors border-b border-zinc-800 last:border-0 flex items-center justify-between ${
                      selectedConceptSlugs.has(s.slug)
                        ? 'text-[#6085FF] bg-[#6085FF]/10'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <span>{s.name}</span>
                    {selectedConceptSlugs.has(s.slug) && <X size={11} className="shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {/* 선택된 개념 칩 */}
            {selectedConceptSlugs.size > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex flex-wrap gap-1">
                  {allConcepts
                    .filter(c => selectedConceptSlugs.has(c.slug))
                    .map(c => (
                      <button
                        key={c.slug}
                        onClick={() => removeConcept(c.slug)}
                        className="flex items-center gap-1 px-2 py-0.5 bg-[#6085FF]/15 border border-[#6085FF]/30 text-[#6085FF] text-[11px] rounded-full hover:bg-[#6085FF]/25 transition-colors"
                      >
                        {c.name}
                        <X size={9} />
                      </button>
                    ))
                  }
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6085FF]">{graphData.nodes.length}개 문제 표시 중</span>
                  <button onClick={clearSearch} className="text-zinc-600 hover:text-zinc-400 text-[10px] transition-colors">전체 해제</button>
                </div>
              </div>
            )}

            {clickedConceptSlug && (
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-xs text-amber-400 truncate pr-1">
                  {clickedConceptSlug.replace(/-/g, ' ')} — {highlightedNodeIds?.size ?? 0}개
                </span>
                <button onClick={() => setClickedConceptSlug(null)} className="text-zinc-600 hover:text-zinc-400 shrink-0">
                  <X size={11} />
                </button>
              </div>
            )}
          </div>

          {/* 홈 버튼 */}
          <div className="px-3 py-2.5 border-b border-zinc-800/70">
            <button
              onClick={handleCenter}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <Maximize2 size={13} />
              <span>그래프 전체 보기</span>
            </button>
          </div>

          {/* 개념 목록 */}
          <div className="flex-1 overflow-y-auto">
            <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
              개념 목록
            </p>
            {allConcepts.map(c => {
              const isSelected = selectedConceptSlugs.has(c.slug);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleConcept(c)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                    isSelected
                      ? 'text-[#6085FF] bg-[#6085FF]/10'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <span className="truncate text-left">{c.name}</span>
                  <span className={`text-[10px] shrink-0 ml-2 ${isSelected ? 'text-[#6085FF]' : 'text-zinc-700'}`}>
                    {c.usage_count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile fallback */}
      {isMobile ? (
        <div className="pt-16 px-4 overflow-y-auto h-full space-y-3">
          {graphData.nodes.map(node => (
            <button
              key={node.id}
              onClick={() => handleNodeClick(node)}
              className="w-full text-left p-4 bg-[#09090b] border border-white/5 rounded-xl text-white text-sm hover:border-[#071be9]/50 transition-colors"
            >
              {node.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="absolute top-0 right-0 bottom-0" style={{ left: SIDEBAR_W }}>
          {/* 난이도 범례 + 필터 — 그래프 우측 상단 */}
          <div className="absolute right-4 z-10 flex flex-col gap-1 bg-black/50 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-zinc-800/50" style={{ top: 96 }}>
            {[
              { key: 'easy',   label: 'Easy',   color: '#22c55e' },
              { key: 'medium', label: 'Medium', color: '#f59e0b' },
              { key: 'hard',   label: 'Hard',   color: '#ef4444' },
              { key: 'killer', label: 'Killer', color: '#c084fc' },
            ].map(d => {
              const checked = selectedDifficulties.has(d.key);
              return (
                <button
                  key={d.key}
                  onClick={() => setSelectedDifficulties(prev => {
                    const next = new Set(prev);
                    next.has(d.key) ? next.delete(d.key) : next.add(d.key);
                    return next;
                  })}
                  className="flex items-center gap-2 group"
                >
                  {/* 체크박스 */}
                  <span
                    className="w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center border transition-all"
                    style={{
                      backgroundColor: checked ? d.color : 'transparent',
                      borderColor: checked ? d.color : '#52525b',
                    }}
                  >
                    {checked && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4l2 2 4-4" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  {/* 색상 점 */}
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color, opacity: checked ? 1 : 0.3 }} />
                  {/* 라벨 */}
                  <span className={`text-xs transition-colors ${checked ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {d.label}
                  </span>
                </button>
              );
            })}
          </div>
          <ForceGraph2D
            graphData={graphData as never}
            width={graphW}
            height={dimensions.height}
            backgroundColor="transparent"
            nodeLabel={() => ''}
            linkLabel={(link) => (link as unknown as GraphLink).conceptName}
            linkDirectionalArrowLength={0}
            ref={fgRef}
            d3AlphaDecay={0.015}
            d3VelocityDecay={0.25}
            warmupTicks={60}
            onNodeClick={(node) => handleNodeClick(node as unknown as GraphNode)}
            onLinkClick={(link) => handleLinkClick(link as unknown as GraphLink)}
            onBackgroundClick={handleBackgroundClick}
            nodeCanvasObject={(node, ctx) => {
              const n = node as unknown as GraphNode & { x: number; y: number };
              if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) return;
              const style = getDifficultyStyle(n.problem.difficulty ?? null);
              const isDimmed = highlightedNodeIds !== null && !highlightedNodeIds.has(n.id);

              ctx.globalAlpha = isDimmed ? 0.08 : 1;

              // 외곽 글로우 (크고 넓게)
              const outerGlow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 22);
              outerGlow.addColorStop(0, style.glow);
              outerGlow.addColorStop(0.5, style.glow.replace('0.32', '0.12'));
              outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.beginPath();
              ctx.arc(n.x, n.y, 22, 0, 2 * Math.PI);
              ctx.fillStyle = outerGlow;
              ctx.fill();

              // 내부 글로우 (선명한 코어)
              const innerGlow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 7);
              innerGlow.addColorStop(0, style.dot);
              innerGlow.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.beginPath();
              ctx.arc(n.x, n.y, 7, 0, 2 * Math.PI);
              ctx.fillStyle = innerGlow;
              ctx.fill();

              // 노드 코어
              ctx.beginPath();
              ctx.arc(n.x, n.y, 4, 0, 2 * Math.PI);
              ctx.fillStyle = style.dot;
              ctx.fill();

              // 하이라이트 중심
              ctx.beginPath();
              ctx.arc(n.x, n.y, 1.6, 0, 2 * Math.PI);
              ctx.fillStyle = '#fff';
              ctx.fill();

              ctx.globalAlpha = 1;
            }}
            nodeCanvasObjectMode={() => 'replace'}
            linkCanvasObject={(link, ctx) => {
              const l = link as unknown as GraphLink & { source: { x: number; y: number }; target: { x: number; y: number } };
              if (!l.source?.x || !l.target?.x) return;

              const isHighlighted = clickedConceptSlug === l.conceptSlug;
              const isDimmed = clickedConceptSlug !== null && !isHighlighted;

              ctx.beginPath();
              ctx.moveTo(l.source.x, l.source.y);
              ctx.lineTo(l.target.x, l.target.y);
              ctx.strokeStyle = isDimmed
                ? 'rgba(96,133,255,0.03)'
                : isHighlighted
                  ? 'rgba(120,160,255,1)'
                  : 'rgba(96,133,255,0.35)';
              ctx.lineWidth = isHighlighted ? 2 : 0.8;
              ctx.stroke();

              if (!isDimmed && !isHighlighted) {
                ctx.beginPath();
                ctx.moveTo(l.source.x, l.source.y);
                ctx.lineTo(l.target.x, l.target.y);
                ctx.strokeStyle = 'rgba(165,180,252,0.10)';
                ctx.lineWidth = 2.5;
                ctx.stroke();
              }
            }}
            linkCanvasObjectMode={() => 'replace'}
          />
        </div>
      )}
    </div>
  );
}
