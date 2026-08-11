'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Search, X } from 'lucide-react';
import type { Problem } from './FlashcardModal';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphProblem {
  id: string;
  title: string | null;
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

function buildGraph(problems: GraphProblem[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = problems.map((p, i) => ({
    id: p.id,
    label: p.title ?? `문제 ${i + 1}`,
    problem: { ...p, question_image_url: '', answer_image_url: null, memo: null } as GraphNode['problem'],
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
  const [highlightConceptSlug, setHighlightConceptSlug] = useState<string | null>(null);
  const onConceptChange = setHighlightConceptSlug;
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
      setDimensions({ width: window.innerWidth, height: window.innerHeight - 120 });
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

  // 그래프 데이터 변경 시 force 재설정 (노드를 넓게 퍼뜨려 거미줄 형태 유지)
  useEffect(() => {
    if (!fgRef.current) return;
    fgRef.current.d3Force('charge')?.strength(-280);
    fgRef.current.d3Force('link')?.distance(110);
    fgRef.current.d3ReheatSimulation?.();
  }, [graphData]);

  // 개념 선택 시 해당 개념이 태깅된 문제들만 필터링
  useEffect(() => {
    if (!highlightConceptSlug) {
      setGraphData(buildGraph(allProblems));
    } else {
      const filtered = allProblems.filter(p =>
        p.concepts.some(c => c.slug === highlightConceptSlug)
      );
      setGraphData(buildGraph(filtered));
    }
  }, [highlightConceptSlug, allProblems]);

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    if (!val.trim()) { setSuggestions([]); onConceptChange(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/mathweb/concepts?q=${encodeURIComponent(val)}&limit=10`);
      const json = await res.json();
      setSuggestions(json.data ?? []);
      setShowSuggestions(true);
    }, 200);
  }, [onConceptChange]);

  const selectConcept = useCallback((c: ConceptSuggestion) => {
    setQuery(c.name);
    setSuggestions([]);
    setShowSuggestions(false);
    onConceptChange(c.slug);
  }, [onConceptChange]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onConceptChange(null);
  }, [onConceptChange]);

  const handleNodeClick = useCallback(async (node: GraphNode) => {
    try {
      const res = await fetch(`/api/mathweb/problems/${node.id}`);
      if (!res.ok) return;
      const json = await res.json();
      onNodeClick(json.data as Problem);
    } catch {
      // silently ignore fetch errors
    }
  }, [onNodeClick]);

  return (
    <div className="relative w-full h-full bg-[#000000]">
      {/* Search overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-sm px-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="개념 검색..."
            className="w-full pl-9 pr-8 py-2.5 bg-[#09090b]/90 backdrop-blur border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#071be9]"
          />
          {query && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-1 bg-[#09090b] border border-white/10 rounded-xl overflow-hidden shadow-xl">
            {suggestions.map(s => (
              <button
                key={s.id}
                onClick={() => selectConcept(s)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        {highlightConceptSlug && (
          <div className="mt-2 flex items-center gap-2 px-1">
            <span className="text-xs text-[#6085FF] bg-[#6085FF]/10 border border-[#6085FF]/20 rounded-full px-3 py-1">
              {graphData.nodes.length}개 문제
            </span>
            {graphData.nodes.length === 0 && (
              <span className="text-xs text-gray-500">등록된 문제가 없어요</span>
            )}
          </div>
        )}
      </div>

      {/* Mobile fallback: card list */}
      {isMobile ? (
        <div className="pt-20 px-4 overflow-y-auto h-full space-y-3">
          {graphData.nodes.length === 0 && highlightConceptSlug ? (
            <p className="text-center text-gray-600 text-sm pt-12">이 개념으로 등록된 문제가 없어요.</p>
          ) : (
            graphData.nodes.map(node => (
              <button
                key={node.id}
                onClick={() => handleNodeClick(node)}
                className="w-full text-left p-4 bg-[#09090b] border border-white/5 rounded-xl text-white text-sm hover:border-[#071be9]/50 transition-colors"
              >
                {node.label}
              </button>
            ))
          )}
        </div>
      ) : (
        <ForceGraph2D
          graphData={graphData as never}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#000000"
          nodeLabel={(node) => (node as unknown as GraphNode).label}
          linkLabel={(link) => (link as unknown as GraphLink).conceptName}
          linkDirectionalArrowLength={0}
          linkColor={() => 'rgba(96,133,255,0.18)'}
          linkWidth={0.6}
          ref={fgRef}
          d3AlphaDecay={0.015}
          d3VelocityDecay={0.25}
          warmupTicks={60}
          onNodeClick={(node) => handleNodeClick(node as unknown as GraphNode)}
          nodeCanvasObject={(node, ctx) => {
            const n = node as unknown as GraphNode & { x: number; y: number };
            // 외부 글로우
            const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 10);
            glow.addColorStop(0, 'rgba(96,133,255,0.35)');
            glow.addColorStop(1, 'rgba(96,133,255,0)');
            ctx.beginPath();
            ctx.arc(n.x, n.y, 10, 0, 2 * Math.PI);
            ctx.fillStyle = glow;
            ctx.fill();
            // 중심 점 (이슬방울)
            ctx.beginPath();
            ctx.arc(n.x, n.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = '#a5b4fc';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(n.x, n.y, 1.2, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.fill();
          }}
          nodeCanvasObjectMode={() => 'replace'}
          linkCanvasObject={(link, ctx) => {
            const l = link as unknown as GraphLink & { source: { x: number; y: number }; target: { x: number; y: number } };
            if (!l.source?.x || !l.target?.x) return;
            // 실 본체
            ctx.beginPath();
            ctx.moveTo(l.source.x, l.source.y);
            ctx.lineTo(l.target.x, l.target.y);
            ctx.strokeStyle = 'rgba(96,133,255,0.22)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            // 미세한 글로우 레이어
            ctx.beginPath();
            ctx.moveTo(l.source.x, l.source.y);
            ctx.lineTo(l.target.x, l.target.y);
            ctx.strokeStyle = 'rgba(165,180,252,0.07)';
            ctx.lineWidth = 2;
            ctx.stroke();
          }}
          linkCanvasObjectMode={() => 'replace'}
        />
      )}
    </div>
  );
}
