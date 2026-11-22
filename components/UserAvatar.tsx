'use client';

import { useEffect, useState } from 'react';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

export function UserAvatar({
  src,
  name,
  size = 36,
  className = '',
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const cleanSrc = typeof src === 'string' ? src.trim() : '';
  const isValidUrl =
    cleanSrc.startsWith('https://') ||
    cleanSrc.startsWith('http://') ||
    cleanSrc.startsWith('/');

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-full overflow-hidden shrink-0 bg-[#242424] border border-[#C0C0C0]/25 flex items-center justify-center ${className}`}
      title={name || 'Pengguna NueTify'}
    >
      {isValidUrl && !imgError ? (
        <img
          src={cleanSrc}
          alt={name || 'Profil'}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          aria-label="Foto profil default NueTify"
        >
          <rect width="64" height="64" fill="#1E1E1E" />
          <circle cx="32" cy="24" r="11" fill="#C0C0C0" />
          <path
            d="M14 54C14 44.0589 22.0589 36 32 36C41.9411 36 50 44.0589 50 54V64H14V54Z"
            fill="#C0C0C0"
          />
        </svg>
      )}
    </div>
  );
}
