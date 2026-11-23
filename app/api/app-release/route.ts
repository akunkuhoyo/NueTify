import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OWNER = 'akunkuhoyo';
const REPO = 'NueTify';
const FALLBACK_URL = ['https:', '', 'github.com', OWNER, REPO, 'releases', 'latest', 'download', 'NueTify.apk'].join('/');

async function isMaintenanceActive(): Promise<boolean> {
  if (process.env.MAINTENANCE_MODE === 'true') return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;
  try {
    const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'maintenance')
      .maybeSingle();
    const val = data?.value as { enabled?: boolean } | null;
    return Boolean(val?.enabled);
  } catch {
    return false;
  }
}

export async function GET() {
  if (await isMaintenanceActive()) {
    return NextResponse.json({
      maintenance: true,
      version: '',
      downloadUrl: '',
      fileSizeMb: null,
      publishedAt: null,
    });
  }

  try {
    const apiUrl = ['https:', '', 'api.github.com', 'repos', OWNER, REPO, 'releases', 'latest'].join('/');
    const res = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'NueTify-Web',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({
        maintenance: false,
        version: 'Terbaru',
        downloadUrl: FALLBACK_URL,
        fileSizeMb: null,
        publishedAt: null,
      });
    }

    const data = (await res.json()) as {
      tag_name?: string;
      published_at?: string;
      assets?: Array<{
        name?: string;
        browser_download_url?: string;
        size?: number;
      }>;
    };

    const apkAsset = data.assets?.find((a) => a.name?.toLowerCase().endsWith('.apk'));
    const downloadUrl = apkAsset?.browser_download_url || FALLBACK_URL;
    const fileSizeMb = apkAsset?.size
      ? (apkAsset.size / (1024 * 1024)).toFixed(1)
      : null;

    return NextResponse.json({
      maintenance: false,
      version: data.tag_name || 'Terbaru',
      downloadUrl,
      fileSizeMb,
      publishedAt: data.published_at || null,
    });
  } catch {
    return NextResponse.json({
      maintenance: false,
      version: 'Terbaru',
      downloadUrl: FALLBACK_URL,
      fileSizeMb: null,
      publishedAt: null,
    });
  }
}
