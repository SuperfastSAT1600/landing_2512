'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Link as LinkIcon } from 'lucide-react';

interface FeatureItem {
    title: string;
    description: string;
    link: string;
}

interface HomeConfig {
    hero: {
        ctaText: string;
        ctaLink: string;
    };
    features: FeatureItem[];
}

export default function AdminHomeConfig() {
    const [config, setConfig] = useState<HomeConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetch('/api/admin/config')
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (res.ok) {
                setMessage('설정이 저장되었습니다!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('저장 실패.');
            }
        } catch (e) {
            setMessage('Error saving config.');
        } finally {
            setSaving(false);
        }
    };

    const updateFeature = (index: number, field: keyof FeatureItem, value: string) => {
        if (!config) return;
        const newFeatures = [...config.features];
        newFeatures[index] = { ...newFeatures[index], [field]: value };
        setConfig({ ...config, features: newFeatures });
    };

    if (loading) return <div className="min-h-screen bg-[#151719] flex items-center justify-center text-gray-500">Loading...</div>;
    if (!config) return <div className="min-h-screen bg-[#151719] flex items-center justify-center text-red-500">Failed to load config.</div>;

    return (
        <div className="min-h-screen bg-[#151719] text-gray-100 font-sans">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-[#151719]/80 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-gray-400" />
                    </Link>
                    <h1 className="text-lg font-bold">Homepage Settings</h1>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </header>

            <main className="pt-24 pb-20 px-6 max-w-4xl mx-auto space-y-12">
                {message && (
                    <div className="fixed top-20 right-6 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-lg text-sm font-bold animate-fade-in z-50">
                        {message}
                    </div>
                )}

                {/* Hero Section */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold border-b border-white/10 pb-4">Hero Section</h2>
                    <div className="grid gap-6 p-6 bg-[#1e2023] rounded-2xl border border-white/5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">CTA Button Text</label>
                            <input
                                type="text"
                                className="w-full bg-[#151719] border border-white/10 rounded px-3 py-2 text-white focus:border-blue-500 outline-none transition-colors"
                                value={config.hero.ctaText}
                                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, ctaText: e.target.value } })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">CTA Button Link</label>
                            <div className="flex items-center gap-2">
                                <LinkIcon size={16} className="text-gray-500" />
                                <input
                                    type="text"
                                    className="w-full bg-[#151719] border border-white/10 rounded px-3 py-2 text-blue-400 focus:border-blue-500 outline-none transition-colors"
                                    value={config.hero.ctaLink}
                                    onChange={(e) => setConfig({ ...config, hero: { ...config.hero, ctaLink: e.target.value } })}
                                    placeholder="/blog/your-post-slug"
                                />
                            </div>
                            <p className="text-xs text-gray-600 mt-2">Enter absolute URL or relative path (e.g., /blog/post-1)</p>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold border-b border-white/10 pb-4">Features (6 Boxes)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {config.features.map((feature, idx) => (
                            <div key={idx} className="p-6 bg-[#1e2023] rounded-2xl border border-white/5 space-y-4 hover:border-white/10 transition-colors">
                                <h3 className="text-sm font-bold text-gray-400 uppercase">Box #{idx + 1}</h3>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Title</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#151719] border border-white/10 rounded px-2 py-1.5 text-white focus:border-blue-500 outline-none text-sm"
                                        value={feature.title}
                                        onChange={(e) => updateFeature(idx, 'title', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
                                    <textarea
                                        className="w-full bg-[#151719] border border-white/10 rounded px-2 py-1.5 text-gray-300 focus:border-blue-500 outline-none text-sm resize-none h-20"
                                        value={feature.description}
                                        onChange={(e) => updateFeature(idx, 'description', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Link</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#151719] border border-white/10 rounded px-2 py-1.5 text-blue-400 focus:border-blue-500 outline-none text-sm"
                                        value={feature.link}
                                        onChange={(e) => updateFeature(idx, 'link', e.target.value)}
                                        placeholder="/blog/..."
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
