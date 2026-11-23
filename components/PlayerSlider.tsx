'use client';

import React, { useRef, useState } from 'react';
import type { SliderStyle } from '@/lib/metrolist/types';
import { cn } from '@/lib/utils';

interface PlayerSliderProps {
  style: SliderStyle;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (seconds: number) => void;
  className?: string;
}

export function PlayerSlider({
  style,
  currentTime,
  duration,
  onSeek,
  className,
}: PlayerSliderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPct, setDragPct] = useState<number | null>(null);

  const safeDuration = duration > 0 ? duration : 0;
  const basePct =
    safeDuration > 0 ? Math.min(100, Math.max(0, (currentTime / safeDuration) * 100)) : 0;
  const pct = isDragging && dragPct !== null ? dragPct : basePct;

  const getPctFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return basePct;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return basePct;
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  };

  const commitSeek = (nextPct: number) => {
    if (safeDuration <= 0) return;
    onSeek((nextPct / 100) * safeDuration);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (safeDuration <= 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const nextPct = getPctFromClientX(e.clientX);
    setIsDragging(true);
    setDragPct(nextPct);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setDragPct(getPctFromClientX(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const nextPct = getPctFromClientX(e.clientX);
    setIsDragging(false);
    setDragPct(null);
    commitSeek(nextPct);
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    setDragPct(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (safeDuration <= 0) return;
    const step = 5;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onSeek(Math.min(safeDuration, currentTime + step));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onSeek(Math.max(0, currentTime - step));
    }
  };

     const trackHeight = style === 'DEFAULT' ? 'h-1' : 'h-[2.5px]'; const isWave = style === 'SQUIGGLY' || style === 'WAVY'; const wavePath = isWave ? Array.from({ length: 151 }, (_, i) => `${i === 0 ? 'M' : 'L'}${i * 2},${(8 + Math.sin(((i * 2) / (style === 'SQUIGGLY' ? 12 : 30)) * Math.PI * 2) * (style === 'SQUIGGLY' ? 3.5 : 3)).toFixed(2)}`).join(' ') : '';

    return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={0}
      aria-label="Playback progress"
      aria-valuemin={0}
      aria-valuemax={Math.round(safeDuration)}
      aria-valuenow={Math.round(currentTime)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative flex h-6 w-full cursor-pointer touch-none select-none items-center focus:outline-none',
        className
      )}
    >
      {/* Straight Background Track */}
      <div className={cn('relative w-full overflow-hidden rounded-full bg-white/20', trackHeight)}>
    {!isWave && <div className="h-full rounded-full bg-[var(--m3-primary,#C0C0C0)] transition-[width] duration-75 ease-linear" style={{ width: `${pct}%` }} />}</div>{isWave && <svg viewBox="0 0 300 16" preserveAspectRatio="none" className="pointer-events-none absolute left-0 top-1/2 h-4 w-full -translate-y-1/2" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}><path d={wavePath} fill="none" stroke="var(--m3-primary, #C0C0C0)" strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" /></svg>}

      {/* Clean Thumb */}
      {style !== 'SLIM' && (
        <span
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--m3-primary,#C0C0C0)] shadow-md transition-transform duration-150',
            style === 'SQUIGGLY'
              ? isDragging
                ? 'h-[18px] w-[4px] scale-110'
                : 'h-[14px] w-[3px] group-hover:scale-110'
              : isDragging
                ? 'h-3.5 w-3.5 scale-110'
                : 'h-3 w-3 group-hover:scale-110'
          )}
          style={{ left: `${pct}%` }}
        />
      )}
    </div>
  );
}
