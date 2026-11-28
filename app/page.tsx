'use client';

import React, { useEffect, useState } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { AuthProvider } from '@/components/AuthProvider';
import { ChartsView } from '@/components/ChartsView';
import { DetailView } from '@/components/DetailView';
import { HomeView } from '@/components/HomeView';
import { LibraryView } from '@/components/LibraryView';
import { LiquidGlassFilterDefs } from '@/components/LiquidGlassSurface';
import { MiniPlayer } from '@/components/MiniPlayer';
import { MaintenanceGate } from '@/components/MaintenanceGate';
import { MobileBottomTabs } from '@/components/MobileNav';
import { MusicProvider, useMusic } from '@/components/MusicProvider';
import { NowPlayingSheet } from '@/components/NowPlayingSheet';
import { PlaylistPickerModal } from '@/components/PlaylistPickerModal';
import { SearchView } from '@/components/SearchView';
import { SettingsView } from '@/components/SettingsView';
import { Sidebar } from '@/components/Sidebar';

function SonoraShell() {
  const {
    activeTab,
    detailTarget,
    ytContainerRef,
    showVideoStage,
    isNowPlayingOpen,
    currentTrack,
    settings,
    setActiveTab, openDetail, setIsNowPlayingOpen, pause } = useMusic(); const [isOffline, setIsOffline] = useState(false); useEffect(() => { setIsOffline(!navigator.onLine); const onOffline = () => setIsOffline(true); const onOnline = () => setIsOffline(false); window.addEventListener('offline', onOffline); window.addEventListener('online', onOnline); return () => { window.removeEventListener('offline', onOffline); window.removeEventListener('online', onOnline); }; }, []);
  useEffect(() => { (window as unknown as { __nuetifyHandleBack?: () => boolean }).__nuetifyHandleBack = () => { if ((window as unknown as { __nuetifyForceUpdateActive?: boolean }).__nuetifyForceUpdateActive) return true; const closeLb = (window as unknown as { __nuetifyCloseLeaderboard?: () => boolean }).__nuetifyCloseLeaderboard; if (closeLb && closeLb()) return true; const closeChat = (window as unknown as { __nuetifyCloseGlobalChat?: () => boolean }).__nuetifyCloseGlobalChat; if (closeChat && closeChat()) return true; const closeLegal = (window as unknown as { __nuetifyCloseLegal?: () => boolean }).__nuetifyCloseLegal; if (closeLegal && closeLegal()) return true; if (isNowPlayingOpen) { setIsNowPlayingOpen(false); return true; } if (detailTarget) { openDetail(null); return true; } if (activeTab !== 'home') { setActiveTab('home'); return true; } return false; }; return () => { delete (window as unknown as { __nuetifyHandleBack?: () => boolean }).__nuetifyHandleBack; }; }, [isNowPlayingOpen, setIsNowPlayingOpen, detailTarget, openDetail, activeTab, setActiveTab]);
  useEffect(() => { const handleForceStop = () => { pause(); setIsNowPlayingOpen(false); }; window.addEventListener('nuetify-force-stop', handleForceStop); return () => { window.removeEventListener('nuetify-force-stop', handleForceStop); }; }, [pause, setIsNowPlayingOpen]);
    useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, [activeTab, detailTarget]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip flex flex-col lg:flex-row relative bg-[var(--m3-bg)] transition-colors duration-200">{isOffline && (<div className="fixed top-0 left-0 right-0 z-[120] pointer-events-none bg-[#181818] border-b border-[#C0C0C0]/20 px-3 py-1.5 text-center text-[11px] font-medium text-[#C0C0C0]">Mode Offline · Jelajahi Beranda, Library, Playlist &amp; Riwayat tersimpan</div>)}
      {settings.dockStyle === 'liquid-glass' && <LiquidGlassFilterDefs />}
      {/* In-Viewport Non-Occluded Video Stage for YouTube IFrame Player API (prevents Android Chrome offscreen iframe audio suspension) */}
      <div
        className={
          showVideoStage && isNowPlayingOpen
            ? 'fixed top-20 left-1/2 -translate-x-1/2 z-[55] w-[92vw] max-w-lg aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black'
            : 'fixed bottom-2 right-2 w-[220px] h-[124px] opacity-[0.015] pointer-events-none z-0 overflow-hidden'
        }
        aria-hidden={!showVideoStage || !isNowPlayingOpen}
      >
        <div ref={ytContainerRef} className="w-full h-full" />
      </div>


      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        

        <main
          className={`flex-1 px-4 sm:px-8 pt-[calc(0.5rem+env(safe-area-inset-top))] lg:pt-14 max-w-7xl w-full mx-auto pb-[calc(10rem+env(safe-area-inset-bottom))] ${
            currentTrack ? 'lg:pb-32' : 'lg:pb-14'
          }`}
        >
          {detailTarget ? (
            <DetailView />
          ) : activeTab === 'home' ? (
            <HomeView />
          ) : activeTab === 'search' ? (
            <SearchView />
          ) : activeTab === 'charts' ? (
            <ChartsView />
          ) : activeTab === 'library' ? (
            <LibraryView />
          ) : (
            <SettingsView />
          )}
        </main>
      </div>

      <MiniPlayer />
      <MobileBottomTabs />
      <NowPlayingSheet />
      <PlaylistPickerModal />
    </div>
  );
}

export default function Page() {
  return (
<AuthProvider>
      <MaintenanceGate>
<AuthGate>
    <MusicProvider>
      <SonoraShell />
    </MusicProvider>
      </AuthGate>
      </MaintenanceGate>
    </AuthProvider>
  );
}
