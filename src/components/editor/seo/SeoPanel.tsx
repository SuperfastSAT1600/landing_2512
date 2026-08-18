'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Check, AlertTriangle, X as XIcon } from 'lucide-react';
import { analyzeSeo, extractHeadingTree } from '@/lib/seo/analyzer';
import type { SeoInputData, SeoAnalysisResult, SeoCheckResult } from '@/lib/seo/types';

interface SeoPanelProps {
    title: string;
    slug: string;
    metaTitle: string;
    onMetaTitleChange: (v: string) => void;
    metaRobots: string;
    onMetaRobotsChange: (v: string) => void;
    description: string;
    excerpt: string;
    focusKeyword: string;
    onFocusKeywordChange: (v: string) => void;
    contentHtml: string;
    featuredImage: string;
    featuredImageAlt: string;
    tags: string;
}

function ScoreGauge({ score }: { score: number }) {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const color = score >= 71 ? '#22c55e' : score >= 41 ? '#eab308' : '#ef4444';

    return (
        <div className="flex flex-col items-center">
            <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#1e2023" strokeWidth="8" />
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-500"
                />
                <text
                    x="50"
                    y="50"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={color}
                    fontSize="24"
                    fontWeight="bold"
                >
                    {score}
                </text>
            </svg>
            <span className="text-xs text-gray-500 mt-1">SEO Score</span>
        </div>
    );
}

function StatusIcon({ status }: { status: SeoCheckResult['status'] }) {
    if (status === 'good') return <Check size={14} className="text-green-500 shrink-0" />;
    if (status === 'warning') return <AlertTriangle size={14} className="text-yellow-500 shrink-0" />;
    return <XIcon size={14} className="text-red-500 shrink-0" />;
}

export default function SeoPanel({
    title,
    slug,
    metaTitle,
    onMetaTitleChange,
    metaRobots,
    onMetaRobotsChange,
    description,
    excerpt,
    focusKeyword,
    onFocusKeywordChange,
    contentHtml,
    featuredImage,
    featuredImageAlt,
    tags,
}: SeoPanelProps) {
    const [analysis, setAnalysis] = useState<SeoAnalysisResult | null>(null);
    const [showChecklist, setShowChecklist] = useState(true);
    const [showHeadings, setShowHeadings] = useState(false);

    const input: SeoInputData = useMemo(() => ({
        title,
        slug,
        metaTitle,
        description,
        excerpt,
        focusKeyword,
        contentHtml,
        featuredImage,
        featuredImageAlt,
        tags,
    }), [title, slug, metaTitle, description, excerpt, focusKeyword, contentHtml, featuredImage, featuredImageAlt, tags]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const result = analyzeSeo(input);
            setAnalysis(result);
        }, 300);
        return () => clearTimeout(timer);
    }, [input]);

    const headings = useMemo(() => extractHeadingTree(contentHtml), [contentHtml]);

    const effectiveTitle = metaTitle || `${title} | SuperfastSAT Blog`;
    const metaTitleLen = effectiveTitle.length;

    return (
        <div className="space-y-6">
            {/* Score Gauge */}
            {analysis && <ScoreGauge score={analysis.score} />}

            {/* Focus Keyword */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    타겟 키워드
                </label>
                <input
                    type="text"
                    value={focusKeyword}
                    onChange={(e) => onFocusKeywordChange(e.target.value)}
                    placeholder="예: SAT Reading 공부법"
                    className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white placeholder-gray-600 outline-none"
                />
                <p className="text-[10px] text-gray-600">
                    구글에서 이 포스팅이 노출되길 원하는 핵심 검색어
                </p>
            </div>

            {/* Meta Title */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Meta Title
                </label>
                <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => onMetaTitleChange(e.target.value)}
                    placeholder={`${title} | SuperfastSAT Blog`}
                    className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white placeholder-gray-600 outline-none"
                />
                <div className="flex justify-between">
                    <p className="text-[10px] text-gray-600">비워두면 &quot;제목 | SuperfastSAT Blog&quot; 사용</p>
                    <p className={`text-[10px] ${metaTitleLen >= 30 && metaTitleLen <= 60 ? 'text-green-500' : metaTitleLen > 60 ? 'text-red-500' : 'text-yellow-500'}`}>
                        {metaTitleLen}/60
                    </p>
                </div>
            </div>

            {/* Meta Robots */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Meta Robots
                </label>
                <select
                    value={metaRobots}
                    onChange={(e) => onMetaRobotsChange(e.target.value)}
                    className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none appearance-none"
                >
                    <option value="">index, follow (기본)</option>
                    <option value="noindex,follow">noindex, follow</option>
                    <option value="noindex,nofollow">noindex, nofollow</option>
                </select>
            </div>

            {/* SEO Checklist */}
            {analysis && (
                <div>
                    <button
                        onClick={() => setShowChecklist(!showChecklist)}
                        className="flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white transition-colors w-full"
                    >
                        {showChecklist ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        SEO 체크리스트 ({analysis.checks.filter(c => c.status === 'good').length}/{analysis.checks.length})
                    </button>
                    {showChecklist && (
                        <div className="mt-3 space-y-2">
                            {analysis.checks.map((check) => (
                                <div
                                    key={check.id}
                                    className="flex items-start gap-2 py-1.5 px-2 rounded bg-[#1e2023]/50"
                                >
                                    <StatusIcon status={check.status} />
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-gray-300">{check.label}</p>
                                        <p className="text-[10px] text-gray-500 leading-relaxed">{check.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Heading Structure Tree */}
            <div>
                <button
                    onClick={() => setShowHeadings(!showHeadings)}
                    className="flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white transition-colors w-full"
                >
                    {showHeadings ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Heading 구조 ({headings.length}개)
                </button>
                {showHeadings && (
                    <div className="mt-3 space-y-1">
                        {headings.length === 0 ? (
                            <p className="text-xs text-gray-600 italic">본문에 Heading이 없습니다.</p>
                        ) : (
                            headings.map((h, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2 py-1"
                                    style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
                                >
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                        h.level === 1 ? 'bg-red-500/20 text-red-400' :
                                        h.level === 2 ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-gray-500/20 text-gray-400'
                                    }`}>
                                        H{h.level}
                                    </span>
                                    <span className="text-xs text-gray-300 truncate">{h.text}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
