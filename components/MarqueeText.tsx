'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
}

export function MarqueeText({ text, className = '' }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLSpanElement | null>(null);
  const [overflowPx, setOverflowPx] = useState(0);

  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;
      const diff = content.scrollWidth - container.clientWidth;
      setOverflowPx(diff > 4 ? diff + 16 : 0);
    };

    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    if (ro && contentRef.current) ro.observe(contentRef.current);
    return () => ro?.disconnect();
  }, [text]);

  const durationSec = Math.max(5, Math.min(18, overflowPx / 28 + 4));

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden whitespace-nowrap min-w-0 ${className}`}
    >
      <style>{`
        @keyframes nuetifyMarquee {
          0%, 15% { transform: translateX(0); }
          70%, 85% { transform: translateX(var(--marquee-shift, 0px)); }
          100% { transform: translateX(0); }
        }
      `}</style>
      <span
        ref={contentRef}
        className="inline-block whitespace-nowrap"
        style={
          overflowPx > 0
            ? ({
                ['--marquee-shift' as string]: `-${overflowPx}px`,
                animation: `nuetifyMarquee ${durationSec}s ease-in-out infinite`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {text}
      </span>
    </div>
  );
}
