import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OWNER = 'akunkuhoyo';
const REPO = 'NueTify';
const FALLBACK_URL = ['https:', '', 'github.com', OWNER, REPO, 'releases', 'latest', 'download', 'NueTify.apk'].join('/');

export async function GET() {
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
