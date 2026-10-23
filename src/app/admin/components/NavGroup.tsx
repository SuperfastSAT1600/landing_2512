'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

interface NavGroupProps {
    label: string;
    icon: string;
    items: { href: string; label: string }[];
    pathname: string;
}

const isChildActive = (pathname: string, href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

export default function NavGroup({ label, icon, items, pathname }: NavGroupProps) {
    const isGroupActive = items.some(c => isChildActive(pathname, c.href));
    const [open, setOpen] = useState(isGroupActive);

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className={`flex items-center gap-3 px-3 py-2 w-full rounded-md font-medium transition-colors ${isGroupActive ? 'text-white bg-[#1e2023]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
                <span className="opacity-70">{icon}</span>
                <span className="flex-1 text-left">{label}</span>
                <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="ml-6 space-y-0.5">
                    {items.map(child => (
                        <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors font-medium ${
                                pathname === child.href
                                    ? 'text-white bg-[#1e2023]'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className="w-1 h-1 rounded-full bg-current opacity-50 flex-shrink-0" />
                            {child.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
