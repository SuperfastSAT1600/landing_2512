'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Search, X } from 'lucide-react';
import type { Problem } from './FlashcardModal';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

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

interface ConceptSuggestion {
  id: string;
  name: string;
  slug: string;
}

interface ConceptGraphProps {
  onNodeClick: (problem: Problem) => void;
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
  const [searchConceptSlug, setSearchConceptSlug] = useState<string | null>(null);
  const [clickedConceptSlug, setClickedConceptSlug] = useState<string | null>(null);
  const [allProblems, setAllProblems] = useState<GraphProblem[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ConceptSuggestion[]>([]);
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
        setAllProblems(problems);
        setGraphData(buildGraph(problems));
      });
  }, []);

  useEffect(() => {
    if (!fgRef.current) return;
    fgRef.current.d3Force('charge')?.strength(-280);
    fgRef.current.d3Force('link')?.distance(110);
    fgRef.current.d3ReheatSimulation?.();
  }, [graphData]);

  // 검색 개념 선택 → 해당 개념 문제만 필터링
  useEffect(() => {
    setClickedConceptSlug(null);
    if (!searchConceptSlug) {
      setGraphData(buildGraph(allProblems));
    } else {
      const filtered = allProblems.filter(p =>
        p.concepts.some(c => c.slug === searchConceptSlug)
      );
      setGraphData(buildGraph(filtered));
    }
  }, [searchConceptSlug, allProblems]);

  // 링크 클릭 시 해당 개념 공유 노드 ID 집합
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
    if (!val.trim()) { setSuggestions([]); setSearchConceptSlug(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/mathweb/concepts?q=${encodeURIComponent(val)}&limit=10`);
      const json = await res.json();
      setSuggestions(json.data ?? []);
      setShowSuggestions(true);
    }, 200);
  }, []);

  const selectConcept = useCallback((c: ConceptSuggestion) => {
    setQuery(c.name);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchConceptSlug(c.slug);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchConceptSlug(null);
  }, []);

  const handleNodeClick = useCallback(async (node: GraphNode) => {
    try {
      const res = await fetch(`/api/mathweb/problems/${node.id}`);
      if (!res.ok) return;
      const json = await res.json();
      onNodeClick(json.data as Problem);
    } catch {
      // silently ignore
    }
  }, [onNodeClick]);

  const handleLinkClick = useCallback((link: GraphLink) => {
    setClickedConceptSlug(prev =>
      prev === link.conceptSlug ? null : link.conceptSlug
    );
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setClickedConceptSlug(null);
  }, []);

  return (
    <div className="relative w-full h-full bg-[#000000]">
      {/* 검색바 — 우측 상단 (헤더+LiveStatus 아래) */}
      <div className="absolute top-24 right-5 z-50 w-72">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="개념 검색..."
            className="w-full pl-10 pr-9 py-3 bg-zinc-900 border border-zinc-600 rounded-2xl text-white text-sm placeholder-zinc-400 focus:outline-none focus:border-[#6085FF] focus:ring-1 focus:ring-[#6085FF]/40 shadow-lg shadow-black/60 transition-all"
          />
          {query && (
            <button onClick={clearSearch} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-1.5 bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl shadow-black/80">
            {suggestions.map(s => (
              <button
                key={s.id}
                onClick={() => selectConcept(s)}
                className="w-full text-left px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors border-b border-zinc-800 last:border-0"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        {searchConceptSlug && (
          <div className="mt-2 px-1">
            <span className="text-xs font-medium text-[#6085FF] bg-[#6085FF]/15 border border-[#6085FF]/30 rounded-full px-3 py-1">
              {graphData.nodes.length}개 문제
            </span>
          </div>
        )}
        {clickedConceptSlug && (
          <div className="mt-2 px-1 flex items-center gap-2">
            <span className="text-xs font-medium text-amber-400 bg-amber-400/15 border border-amber-400/30 rounded-full px-3 py-1">
              {clickedConceptSlug.replace(/-/g, ' ')} — {highlightedNodeIds?.size ?? 0}개 강조
            </span>
            <button onClick={() => setClickedConceptSlug(null)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* 난이도 범례 — 좌측 하단 (FloatingCTA 위) */}
      <div className="absolute bottom-40 left-4 z-10 flex flex-col gap-1.5">
        {[
          { key: 'easy',   label: 'Easy',   color: '#22c55e' },
          { key: 'medium', label: 'Medium', color: '#f59e0b' },
          { key: 'hard',   label: 'Hard',   color: '#ef4444' },
          { key: 'killer', label: 'Killer', color: '#c084fc' },
        ].map(d => (
          <div key={d.key} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-gray-500">{d.label}</span>
          </div>
        ))}
      </div>

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
        <ForceGraph2D
          graphData={graphData as never}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#000000"
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

            ctx.globalAlpha = isDimmed ? 0.1 : 1;

            const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 10);
            glow.addColorStop(0, style.glow);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath();
            ctx.arc(n.x, n.y, 10, 0, 2 * Math.PI);
            ctx.fillStyle = glow;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(n.x, n.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = style.dot;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(n.x, n.y, 1.1, 0, 2 * Math.PI);
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
              ? 'rgba(96,133,255,0.04)'
              : isHighlighted
                ? 'rgba(96,133,255,0.9)'
                : 'rgba(96,133,255,0.22)';
            ctx.lineWidth = isHighlighted ? 1.5 : 0.5;
            ctx.stroke();

            if (!isDimmed && !isHighlighted) {
              ctx.beginPath();
              ctx.moveTo(l.source.x, l.source.y);
              ctx.lineTo(l.target.x, l.target.y);
              ctx.strokeStyle = 'rgba(165,180,252,0.07)';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }}
          linkCanvasObjectMode={() => 'replace'}
        />
      )}
    </div>
  );
}
