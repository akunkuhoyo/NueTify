import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          borderRadius: '50%',
        }}
      >
        <svg width="512" height="512" viewBox="0 0 180 180" fill="none">
          <mask id="nMask" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="180" height="180">
            <circle cx="90" cy="90" r="90" fill="#000000" />
          </mask>
          <g mask="url(#nMask)">
            <circle cx="90" cy="90" r="90" fill="#000000" />
            <path d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z" fill="#FFFFFF" />
            <rect x="115" y="54" width="12" height="72" fill="#FFFFFF" />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  );
}

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
        }}
      >
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRV5isL7Sh5nl63FMY7WQDyzB8kQ9TI5S4Di3y6hP--L5t6RQHfGVQpueU&s=10"
          alt="NueTify"
          width={512}
          height={512}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    ),
    { ...size }
  );
}
