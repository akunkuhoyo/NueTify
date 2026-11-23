import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const enabled = process.env.MAINTENANCE_MODE === 'true';
  const message =
    process.env.MAINTENANCE_MESSAGE ||
    'NueTify sedang dalam tahap pembaruan sistem dan peningkatan fitur. Silakan kembali beberapa saat lagi.';
  return NextResponse.json({
    maintenance: enabled,
    message,
  });
}
