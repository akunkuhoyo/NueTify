import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OWNER = 'akunkuhoyo';
const REPO = 'NueTify';
const FALLBACK_URL = ['https:', '', 'github.com', OWNER, REPO, 'releases', 'latest', 'download', 'NueTify.apk'].join('/');

async function isMaintenanceEnabled(): Promise<boolean> {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return true;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return false;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'maintenance')
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    const maintenance = (data.value ?? {}) as { enabled?: boolean; maintenance?: boolean };
    return maintenance.enabled === true || maintenance.maintenance === true;
  } catch {
    return false;
  }
}

export async function GET() {
  if (await isMaintenanceEnabled()) {
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
      version: data.tag_name || 'Terbaru',
      downloadUrl,
      fileSizeMb,
      publishedAt: data.published_at || null,
    });
  } catch {
    return NextResponse.json({
      version: 'Terbaru',
      downloadUrl: FALLBACK_URL,
      fileSizeMb: null,
      publishedAt: null,
    });
  }
}
const OWNER = 'akunkuhoyo';
const REPO = 'NueTify';
const FALLBACK_URL = ['https:', '', 'github.com', OWNER, REPO, 'releases', 'latest', 'download', 'NueTify.apk'].join('/');

export async function GET() {
  if (process.env.MAINTENANCE_MODE === 'true') {
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
      version: data.tag_name || 'Terbaru',
      downloadUrl,
      fileSizeMb,
      publishedAt: data.published_at || null,
    });
  } catch {
    return NextResponse.json({
      version: 'Terbaru',
      downloadUrl: FALLBACK_URL,
      fileSizeMb: null,
      publishedAt: null,
    });
  }
}
