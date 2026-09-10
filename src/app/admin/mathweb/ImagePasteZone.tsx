'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

interface Props {
  label: string;
  required?: boolean;
  value: File | null;
  onChange: (file: File | null) => void;
  isDefaultPasteTarget?: boolean;
}

export function ImagePasteZone({ label, required, value, onChange, isDefaultPasteTarget }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleFile = useCallback((file: File | null) => {
    if (!file || !ALLOWED.includes(file.type)) return;
    onChange(file);
  }, [onChange]);

  // Ctrl+V paste: hovered zone wins; default target gets it when nothing hovered
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!isHovered && !isDefaultPasteTarget) return;
      const img = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'));
      if (img) handleFile(img.getAsFile());
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [isHovered, isDefaultPasteTarget, handleFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0] ?? null);
  }, [handleFile]);

  const preview = value ? URL.createObjectURL(value) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}{required && ' *'}
      </span>
      <div style={{ position: 'relative' }}>
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `1.5px dashed ${isDragging || isHovered ? '#6085FF' : '#3f3f46'}`,
            borderRadius: 8,
            padding: preview ? 0 : '20px 12px',
            background: isDragging ? 'rgba(96,133,255,0.08)' : '#0a0a0a',
            cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
            overflow: 'hidden',
            minHeight: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain', borderRadius: 6 }} />
          ) : (
            <>
              <span style={{ fontSize: 12, color: '#a1a1aa' }}>클릭·드래그·Ctrl+V</span>
              <span style={{ fontSize: 11, color: '#71717a' }}>PNG, JPG, WEBP · 최대 5MB</span>
            </>
          )}
        </div>
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            style={{
              position: 'absolute', top: 6, right: 6,
              width: 22, height: 22,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#e4e4e7',
              fontSize: 13, lineHeight: 1,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
            aria-label="이미지 제거"
          >
            ×
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
    </div>
  );
}
