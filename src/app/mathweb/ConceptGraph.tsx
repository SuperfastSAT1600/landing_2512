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
  highlightConceptSlug: string | null;
  onConceptChange: (slug: string | null) => void;
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

export function ConceptGraph({ onNodeClick, highlightConceptSlug, onConceptChange }: ConceptGraphProps) {
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ConceptSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = graphData.nodes.length > 20 && typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight - 120 });
    const onResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight - 120 });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    fetch('/api/mathweb/graph')
      .then(r => r.json())
      .then(json => {
        const problems: GraphProblem[] = json.data?.problems ?? [];
        setGraphData(buildGraph(problems));
      });
  }, []);

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

  const nodeColor = useCallback((node: GraphNode) => {
    if (!highlightConceptSlug) return '#6085FF';
    const linked = graphData.links.some(
      l => l.conceptSlug === highlightConceptSlug &&
        ((l.source as unknown as GraphNode).id === node.id || (l.target as unknown as GraphNode).id === node.id)
    );
    return linked ? '#071be9' : '#333';
  }, [highlightConceptSlug, graphData.links]);

  const linkColor = useCallback((link: GraphLink) => {
    if (!highlightConceptSlug) return 'rgba(96,133,255,0.3)';
    return link.conceptSlug === highlightConceptSlug ? 'rgba(7,27,233,0.8)' : 'rgba(60,60,60,0.2)';
  }, [highlightConceptSlug]);

  const linkWidth = useCallback((link: GraphLink) => {
    if (!highlightConceptSlug) return 1;
    return link.conceptSlug === highlightConceptSlug ? 2 : 0.5;
  }, [highlightConceptSlug]);

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
      </div>

      {/* Mobile fallback: card list */}
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
          nodeLabel={(node) => (node as unknown as GraphNode).label}
          linkLabel={(link) => (link as unknown as GraphLink).conceptName}
          nodeColor={(node) => nodeColor(node as unknown as GraphNode)}
          linkColor={(link) => linkColor(link as unknown as GraphLink)}
          linkWidth={(link) => linkWidth(link as unknown as GraphLink)}
          linkDirectionalArrowLength={0}
          onNodeClick={(node) => handleNodeClick(node as unknown as GraphNode)}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as unknown as GraphNode & { x: number; y: number };
            const r = 8;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = nodeColor(n);
            ctx.fill();
            if (globalScale > 1.5) {
              ctx.font = `${10 / globalScale}px sans-serif`;
              ctx.fillStyle = 'rgba(255,255,255,0.7)';
              ctx.textAlign = 'center';
              ctx.fillText(n.label, n.x, n.y + r + 10 / globalScale);
            }
          }}
        />
      )}
    </div>
  );
}
