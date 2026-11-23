'use client';

export function LoadingSquares() {
  return (
    <div className="min-h-screen w-full bg-[#121212] flex items-center justify-center">
      <style>{`
        @keyframes nuetifyJump {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
          40% { transform: translateY(-14px); opacity: 1; }
        }
      `}</style>
      <div className="flex items-center gap-2.5" aria-label="Loading">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="w-3 h-3 bg-white rounded-[3px] block"
            style={{
              animation: 'nuetifyJump 0.9s ease-in-out infinite',
              animationDelay: `${i * 0.14}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
