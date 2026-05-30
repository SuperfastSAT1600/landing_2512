'use client';

import { X, Search, ImageIcon, Globe, Hash, UploadCloud, Sparkles, Loader2 } from 'lucide-react';
import SeoPanel from '@/components/editor/seo/SeoPanel';
import SocialPreview from '@/components/editor/seo/SocialPreview';
import React from 'react';

interface SettingsSidebarProps {
    show: boolean;
    onClose: () => void;
    settingsTab: 'general' | 'seo';
    onTabChange: (tab: 'general' | 'seo') => void;
    // General
    excerpt: string; onExcerptChange: (v: string) => void;
    description: string; onDescriptionChange: (v: string) => void;
    featuredImage: string; onFeaturedImageChange: (v: string) => void;
    featuredImageAlt: string; onFeaturedImageAltChange: (v: string) => void;
    featureImage: string; onFeatureImageChange: (v: string) => void;
    slug: string; onSlugChange: (v: string) => void;
    date: string; onDateChange: (v: string) => void;
    tags: string; onTagsChange: (v: string) => void;
    category: string; onCategoryChange: (v: string) => void;
    author: string; onAuthorChange: (v: string) => void;
    coaches: { slug: string; name: string }[];
    accessCode: string; onAccessCodeChange: (v: string) => void;
    ctaFeatured: boolean; onCtaFeaturedToggle: () => void;
    isGeneratingSeo: boolean; isGeneratingSlug: boolean;
    onGenerateSeo: () => void; onGenerateSlug: () => void;
    onTriggerFeaturedUpload: () => void;
    onTriggerCardUpload: () => void;
    // SEO
    title: string;
    metaTitle: string; onMetaTitleChange: (v: string) => void;
    metaRobots: string; onMetaRobotsChange: (v: string) => void;
    focusKeyword: string; onFocusKeywordChange: (v: string) => void;
    contentHtml: string;
}

function SidebarLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
    return (
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
            {icon}{children}
        </label>
    );
}

function SidebarInput({ value, onChange, placeholder, className }: {
    value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
    return (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            className={`w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white placeholder-gray-600 outline-none ${className ?? ''}`} />
    );
}

export function SettingsSidebar({
    show, onClose, settingsTab, onTabChange,
    excerpt, onExcerptChange, description, onDescriptionChange,
    featuredImage, onFeaturedImageChange, featuredImageAlt, onFeaturedImageAltChange,
    featureImage, onFeatureImageChange, slug, onSlugChange,
    date, onDateChange, tags, onTagsChange,
    category, onCategoryChange, author, onAuthorChange, coaches,
    accessCode, onAccessCodeChange, ctaFeatured, onCtaFeaturedToggle,
    isGeneratingSeo, isGeneratingSlug, onGenerateSeo, onGenerateSlug,
    onTriggerFeaturedUpload, onTriggerCardUpload,
    title, metaTitle, onMetaTitleChange, metaRobots, onMetaRobotsChange,
    focusKeyword, onFocusKeywordChange, contentHtml,
}: SettingsSidebarProps) {
    return (
        <aside className={`fixed top-16 right-0 w-[320px] h-[calc(100vh-64px)] bg-[#151719] border-l border-white/10 transform transition-transform duration-300 z-40 overflow-y-auto ${show ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">Post settings</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-[#1e2023] rounded-lg p-0.5 mb-6">
                    {(['general', 'seo'] as const).map((tab) => (
                        <button key={tab} onClick={() => onTabChange(tab)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${settingsTab === tab ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {settingsTab === 'general' && (
                    <div className="space-y-8">
                        {/* Excerpt */}
                        <div className="space-y-3">
                            <SidebarLabel icon={<Search size={12} />}>
                                <span className="flex-1">Excerpt</span>
                                <button onClick={onGenerateSeo} disabled={isGeneratingSeo}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 disabled:opacity-40 transition-colors normal-case tracking-normal ml-2">
                                    {isGeneratingSeo ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} AI
                                </button>
                            </SidebarLabel>
                            <textarea value={excerpt} onChange={(e) => onExcerptChange(e.target.value)} rows={3} placeholder="목록과 구글 검색결과에 표시될 1-2문장 요약..."
                                className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white resize-none outline-none" />
                            <p className="text-[10px] text-right text-gray-600">{excerpt.length}/160</p>
                        </div>

                        {/* Blog Thumbnail */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <SidebarLabel icon={<ImageIcon size={12} />}>Blog Thumbnail</SidebarLabel>
                                <button onClick={onTriggerFeaturedUpload} className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
                                    <UploadCloud size={12} /> Upload
                                </button>
                            </div>
                            <SidebarInput value={featuredImage} onChange={onFeaturedImageChange} placeholder="https://..." />
                            {featuredImage && <SidebarInput value={featuredImageAlt} onChange={onFeaturedImageAltChange} placeholder="이미지 설명 (비워두면 제목 사용)" />}
                        </div>

                        {/* Card Thumbnail */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <SidebarLabel icon={<ImageIcon size={12} />}>Card Thumbnail</SidebarLabel>
                                <button onClick={onTriggerCardUpload} className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
                                    <UploadCloud size={12} /> Upload
                                </button>
                            </div>
                            {featureImage && (
                                <div className="relative w-full rounded-lg overflow-hidden border border-white/10" style={{ aspectRatio: '3/5' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={featureImage} alt="Card thumbnail" className="w-full h-full object-cover" />
                                    <button onClick={() => onFeatureImageChange('')} className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors">
                                        <X size={12} />
                                    </button>
                                </div>
                            )}
                            <input type="text" value={featureImage} onChange={(e) => onFeatureImageChange(e.target.value)} placeholder="세로 썸네일 URL (메인 Features 카드)"
                                className="w-full bg-[#1e2023] border border-transparent focus:border-indigo-500 rounded px-3 py-2 text-sm text-white placeholder-gray-600 outline-none" />
                            <p className="text-[10px] text-gray-600">메인페이지 Features 카드에 표시됩니다. 비율: 3:5 세로</p>
                        </div>

                        {/* URL Slug */}
                        <div className="space-y-3">
                            <SidebarLabel icon={<Globe size={12} />}>Post URL</SidebarLabel>
                            <div className="bg-[#1e2023] rounded px-3 py-2 border border-transparent focus-within:border-blue-500">
                                <div className="text-xs text-gray-600 mb-1">satmasterclass.com/blog/</div>
                                <div className="flex items-center gap-2">
                                    <input type="text" value={slug} onChange={(e) => onSlugChange(e.target.value)} placeholder="untitled"
                                        className="flex-1 bg-transparent text-white text-sm outline-none" />
                                    <button onClick={onGenerateSlug} disabled={isGeneratingSlug}
                                        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-medium transition-colors disabled:opacity-40">
                                        {isGeneratingSlug ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Date */}
                        <div className="space-y-3">
                            <SidebarLabel>Publish Date</SidebarLabel>
                            <input type="date" value={date} onChange={(e) => onDateChange(e.target.value)}
                                className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none" />
                        </div>

                        {/* Tags */}
                        <div className="space-y-3">
                            <SidebarLabel icon={<Hash size={12} />}>Tags</SidebarLabel>
                            <SidebarInput value={tags} onChange={onTagsChange} placeholder="SAT, Math (comma separated)" />
                        </div>

                        {/* Meta Description */}
                        <div className="space-y-3">
                            <SidebarLabel icon={<Search size={12} />}>
                                <span className="flex-1">Meta Description</span>
                                <button onClick={onGenerateSeo} disabled={isGeneratingSeo}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 disabled:opacity-40 transition-colors normal-case tracking-normal ml-2">
                                    {isGeneratingSeo ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} AI
                                </button>
                            </SidebarLabel>
                            <textarea value={description} onChange={(e) => onDescriptionChange(e.target.value)} rows={4} placeholder="Meta description for search engines..."
                                className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white resize-none outline-none" />
                            <p className="text-[10px] text-right text-gray-600">{description.length}/160</p>
                        </div>

                        {/* Category */}
                        <div className="space-y-3">
                            <SidebarLabel>Category</SidebarLabel>
                            <select value={category} onChange={(e) => onCategoryChange(e.target.value)}
                                className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none appearance-none">
                                {['SAT RW', 'SAT Math', '입시뉴스', '학습코치'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Author */}
                        <div className="space-y-3">
                            <SidebarLabel>Author</SidebarLabel>
                            <select value={author} onChange={(e) => onAuthorChange(e.target.value)}
                                className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none">
                                <option value="SuperfastSAT">SuperfastSAT</option>
                                {coaches.map(c => <option key={c.slug} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Access Code */}
                        <div className="space-y-2">
                            <SidebarLabel>접근 코드 (비워두면 공개)</SidebarLabel>
                            <input type="text" value={accessCode}
                                onChange={(e) => onAccessCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="예: 123456" maxLength={6}
                                className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none font-mono tracking-widest" />
                            {accessCode && <p className="text-[11px] text-yellow-400/80">🔒 이 포스팅은 코드 입력 후에만 열람 가능합니다.</p>}
                        </div>

                        {/* CTA Featured */}
                        <div className="space-y-3">
                            <SidebarLabel>플로팅 CTA 노출</SidebarLabel>
                            <button type="button" onClick={onCtaFeaturedToggle}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded border text-sm font-medium transition-colors ${ctaFeatured ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-[#1e2023] border-transparent text-gray-400 hover:border-white/10'}`}>
                                <span>랜딩 버튼에 이 글 표시</span>
                                <span className={`w-8 h-4 rounded-full relative transition-colors ${ctaFeatured ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${ctaFeatured ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </span>
                            </button>
                            {ctaFeatured && <p className="text-[11px] text-indigo-400/80">저장 시 다른 포스팅의 CTA 노출이 자동 해제됩니다.</p>}
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            <button className="w-full py-2 text-red-500 hover:text-red-400 text-sm font-medium border border-red-500/20 rounded hover:bg-red-500/10 transition-colors">
                                Delete post
                            </button>
                        </div>
                    </div>
                )}

                {settingsTab === 'seo' && (
                    <div className="space-y-6">
                        <SeoPanel title={title} slug={slug} metaTitle={metaTitle} onMetaTitleChange={onMetaTitleChange}
                            metaRobots={metaRobots} onMetaRobotsChange={onMetaRobotsChange}
                            description={description} excerpt={excerpt} focusKeyword={focusKeyword}
                            onFocusKeywordChange={onFocusKeywordChange} contentHtml={contentHtml}
                            featuredImage={featuredImage} featuredImageAlt={featuredImageAlt} tags={tags} />
                        <div className="border-t border-white/10 pt-6">
                            <SocialPreview title={title} metaTitle={metaTitle} description={description} slug={slug} featuredImage={featuredImage} />
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
