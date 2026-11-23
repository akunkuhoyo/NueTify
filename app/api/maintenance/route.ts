import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const defaultMsg =
    process.env.MAINTENANCE_MESSAGE ||
    'NueTify sedang dalam tahap pembaruan sistem dan peningkatan fitur. Silakan kembali beberapa saat lagi.';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    try {
      const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
      const { data } = await supabase
        .from('app_config')
        .select('value, updated_at')
        .eq('key', 'maintenance')
        .maybeSingle();
      if (data?.value && typeof data.value === 'object') {
        const val = data.value as { enabled?: boolean; message?: string };
        return NextResponse.json({
          maintenance: Boolean(val.enabled),
          message: val.message || defaultMsg,
          updatedAt: data.updated_at || null,
        });
      }
    } catch {
      // fallback to env
    }
  }

  return NextResponse.json({
    maintenance: process.env.MAINTENANCE_MODE === 'true',
    message: defaultMsg,
    updatedAt: null,
  });
}
