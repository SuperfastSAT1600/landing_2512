'use client';

import { useEffect, useRef, useState } from 'react';
import { Resizable } from 're-resizable';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface TestCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    Desmos: {
      GraphingCalculator: (el: HTMLElement) => { destroy?: () => void };
    };
  }
}

export function TestCalculator({ isOpen, onClose }: TestCalculatorProps) {
  const calculatorRef = useRef<HTMLDivElement>(null);
  const calculatorInstance = useRef<{ destroy?: () => void } | null>(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 300, height: 500 });
  const [isMaximized, setIsMaximized] = useState(false);

  // Load Desmos script once
  useEffect(() => {
    if (document.querySelector('script[src*="desmos.com"]')) return;
    const script = document.createElement('script');
    script.src = 'https://www.desmos.com/api/v1.11/calculator.js?apiKey=3b0e14bd60b2419a8c10bae832c0daaa';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // Initialize/destroy calculator
  useEffect(() => {
    if (isOpen && calculatorRef.current && !calculatorInstance.current) {
      const init = () => {
        if (window.Desmos) {
          calculatorInstance.current = window.Desmos.GraphingCalculator(calculatorRef.current!);
        } else {
          setTimeout(init, 100);
        }
      };
      init();
    }
    return () => {
      if (!isOpen && calculatorInstance.current) {
        calculatorInstance.current.destroy?.();
        calculatorInstance.current = null;
      }
    };
  }, [isOpen]);

  // Drag handling
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPosition(prev => ({
        x: prev.x + (e.clientX - dragStart.x),
        y: prev.y + (e.clientY - dragStart.y),
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  if (!isOpen) return null;

  const toggleMaximize = () => {
    setSize(isMaximized ? { width: 300, height: 500 } : { width: 550, height: 550 });
    setIsMaximized(!isMaximized);
  };

  return (
    <div
      className="fixed z-[60]"
      style={{ left: position.x, top: position.y }}
    >
      <Resizable
        size={size}
        onResizeStop={(_e, _dir, _ref, d) => {
          setSize(prev => ({ width: prev.width + d.width, height: prev.height + d.height }));
        }}
        minWidth={200}
        minHeight={300}
        className="bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-300 flex flex-col"
      >
        <div
          className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between cursor-move select-none flex-shrink-0"
          onMouseDown={(e) => {
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
          }}
        >
          <span className="font-medium text-sm">Graphing Calculator</span>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMaximize}
              className="h-7 w-7 flex items-center justify-center hover:bg-gray-600 rounded transition-colors"
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="h-7 w-7 flex items-center justify-center hover:bg-gray-600 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <div ref={calculatorRef} className="w-full h-full" />
        </div>
      </Resizable>
    </div>
  );
}
