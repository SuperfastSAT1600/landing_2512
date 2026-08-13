'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Concept {
  id: string;
  name: string;
  slug: string;
  usage_count: number;
}

interface Props {
  value: string[];
  onChange: (concepts: string[]) => void;
  adminKey: string;
}

export function ConceptAutocompleteInput({ value, onChange, adminKey }: Props) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Concept[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    const url = q
      ? `/api/admin/mathweb/concepts?q=${encodeURIComponent(q)}&limit=100`
      : '/api/admin/mathweb/concepts?limit=300';
    const res = await fetch(url, { headers: { 'x-admin-key': adminKey } });
    if (!res.ok) return;
    const json = await res.json();
    const all: Concept[] = json.data ?? [];
    setSuggestions(all.filter((c) => !value.includes(c.name)));
  }, [adminKey, value]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (open) fetchSuggestions(input); }, 200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [input, open, fetchSuggestions]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const addConcept = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput('');
    setSuggestions([]);
  };

  const removeConcept = (name: string) => onChange(value.filter((v) => v !== name));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); if (input.trim()) addConcept(input); }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px',
        background: '#09090b', border: '1px solid #27272a', borderRadius: 8, minHeight: 44,
      }}>
        {value.map((name) => (
          <span key={name} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', background: 'rgba(7,27,233,0.15)',
            border: '1px solid rgba(7,27,233,0.4)', borderRadius: 4,
            color: '#a5b4fc', fontSize: 12,
          }}>
            {name}
            <button onClick={() => removeConcept(name)} style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); fetchSuggestions(input); }}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? '개념 입력 후 Enter (예: 이차방정식)' : ''}
          style={{ flex: 1, minWidth: 140, background: 'none', border: 'none', color: '#e4e4e7', fontSize: 13, outline: 'none' }}
        />
      </div>

      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#141416', border: '1px solid #27272a', borderRadius: 8,
          marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {suggestions.map((c) => (
            <button
              key={c.id}
              onMouseDown={(e) => { e.preventDefault(); addConcept(c.name); setOpen(false); }}
              style={{
                width: '100%', textAlign: 'left', padding: '9px 14px',
                background: 'none', border: 'none', color: '#e4e4e7', fontSize: 13,
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1e1e24')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span>{c.name}</span>
              {c.usage_count > 0 && (
                <span style={{ fontSize: 11, color: '#52525b' }}>×{c.usage_count}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
