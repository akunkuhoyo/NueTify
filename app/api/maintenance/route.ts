import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_MESSAGE =
  'NueTify sedang dalam tahap pembaruan sistem dan peningkatan fitur. Silakan kembali beberapa saat lagi.';

export async function GET() {
  const fallbackEnabled = process.env.MAINTENANCE_MODE === 'true';
  const fallbackMessage = process.env.MAINTENANCE_MESSAGE || DEFAULT_MESSAGE;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      maintenance: fallbackEnabled,
      message: fallbackMessage,
      updatedAt: null,
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from('app_config')
      .select('value, updated_at')
      .eq('key', 'maintenance')
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({
        maintenance: fallbackEnabled,
        message: fallbackMessage,
        updatedAt: null,
      });
    }

    const rawValue = (data.value ?? {}) as {
      enabled?: boolean;
      maintenance?: boolean;
      message?: string;
      updatedAt?: string | null;
    };

    const enabled =
      typeof rawValue.enabled === 'boolean'
        ? rawValue.enabled
        : typeof rawValue.maintenance === 'boolean'
          ? rawValue.maintenance
          : fallbackEnabled;

    const message =
      typeof rawValue.message === 'string' && rawValue.message.trim().length > 0
        ? rawValue.message
        : fallbackMessage;

    const updatedAt = data.updated_at ?? rawValue.updatedAt ?? null;

    return NextResponse.json({
      maintenance: enabled,
      message,
      updatedAt,
    });
  } catch {
    return NextResponse.json({
      maintenance: fallbackEnabled,
      message: fallbackMessage,
      updatedAt: null,
    });
  }
}
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
