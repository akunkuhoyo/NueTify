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
        }}
      >
      <img
src="https://raw.githubusercontent.com/nuenime/Prompt/refs/heads/main/IMG-20261014-WA0188.jpg"
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
