'use client';

import { useState } from 'react';

interface SocialPreviewProps {
    title: string;
    metaTitle: string;
    description: string;
    slug: string;
    featuredImage: string;
}

type PreviewTab = 'google' | 'facebook' | 'twitter';

function truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.slice(0, max - 3) + '...';
}

export default function SocialPreview({
    title,
    metaTitle,
    description,
    slug,
    featuredImage,
}: SocialPreviewProps) {
    const [activeTab, setActiveTab] = useState<PreviewTab>('google');

    const effectiveTitle = metaTitle || `${title} | SuperfastSAT Blog`;
    const effectiveUrl = `satmasterclass.com/blog/${slug || 'untitled'}`;

    const tabs: { id: PreviewTab; label: string }[] = [
        { id: 'google', label: 'Google' },
        { id: 'facebook', label: 'Facebook' },
        { id: 'twitter', label: 'Twitter' },
    ];

    return (
        <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                소셜 미리보기
            </label>

            {/* Tabs */}
            <div className="flex gap-1 bg-[#1e2023] rounded-lg p-0.5">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                            activeTab === tab.id
                                ? 'bg-white/10 text-white'
                                : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Google SERP Preview */}
            {activeTab === 'google' && (
                <div className="bg-white rounded-lg p-4 space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 text-[10px] font-bold">S</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600">satmasterclass.com</p>
                            <p className="text-[10px] text-gray-400">{effectiveUrl}</p>
                        </div>
                    </div>
                    <h3 className="text-[#1a0dab] text-lg font-normal leading-snug hover:underline cursor-pointer">
                        {truncate(effectiveTitle, 60)}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {description
                            ? truncate(description, 160)
                            : <span className="italic text-gray-400">Meta description을 입력하세요...</span>
                        }
                    </p>
                </div>
            )}

            {/* Facebook OG Preview */}
            {activeTab === 'facebook' && (
                <div className="bg-[#1e2023] rounded-lg overflow-hidden border border-white/10">
                    {featuredImage ? (
                        <div className="w-full aspect-[1.91/1] bg-gray-800 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={featuredImage}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-full aspect-[1.91/1] bg-gray-800 flex items-center justify-center">
                            <span className="text-gray-600 text-sm">No Image</span>
                        </div>
                    )}
                    <div className="p-3 bg-[#242526]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
                            satmasterclass.com
                        </p>
                        <h4 className="text-sm font-bold text-[#e4e6eb] leading-snug mb-1">
                            {truncate(effectiveTitle, 65)}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-2">
                            {description || 'Meta description을 입력하세요...'}
                        </p>
                    </div>
                </div>
            )}

            {/* Twitter Card Preview */}
            {activeTab === 'twitter' && (
                <div className="bg-[#1e2023] rounded-2xl overflow-hidden border border-white/10">
                    {featuredImage ? (
                        <div className="w-full aspect-[2/1] bg-gray-800 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={featuredImage}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-full aspect-[2/1] bg-gray-800 flex items-center justify-center">
                            <span className="text-gray-600 text-sm">No Image</span>
                        </div>
                    )}
                    <div className="p-3">
                        <h4 className="text-sm font-bold text-white leading-snug mb-1">
                            {truncate(effectiveTitle, 70)}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                            {description || 'Meta description을 입력하세요...'}
                        </p>
                        <p className="text-xs text-gray-600">satmasterclass.com</p>
                    </div>
                </div>
            )}
        </div>
    );
}
