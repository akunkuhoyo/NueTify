'use client';

export const VERIFIED_DEV_UID = 'ebc0b783-4ebd-44b2-89de-990c57cfd297';
export const VERIFIED_DEV_EMAIL = 'drevviann@gmail.com';

export function isVerifiedDeveloper(params: {
  userId?: string | null;
  email?: string | null;
  serverVerified?: boolean | null;
}): boolean {
  if (params.serverVerified === true && params.userId === VERIFIED_DEV_UID) {
    return true;
  }
  if (params.userId && params.userId === VERIFIED_DEV_UID) {
    return true;
  }
  if (
    params.email &&
    params.email.trim().toLowerCase() === VERIFIED_DEV_EMAIL
  ) {
    return true;
  }
  return false;
}

export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 align-middle"
      title="NueTify Verified Developer"
      aria-label="NueTify Verified Developer"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 1.75L14.62 3.32L17.66 3.19L18.92 5.96L21.5 7.6L21.11 10.62L22.5 13.34L20.55 15.69L20.22 18.72L17.3 19.55L15.3 21.85L12.35 21.02L9.4 21.85L7.4 19.55L4.48 18.72L4.15 15.69L2.2 13.34L3.59 10.62L3.2 7.6L5.78 5.96L7.04 3.19L10.08 3.32L12 1.75Z"
          fill="#E11D48"
        />
        <path
          d="M8.6 12.35L10.9 14.65L15.65 9.65"
          stroke="#FFFFFF"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
