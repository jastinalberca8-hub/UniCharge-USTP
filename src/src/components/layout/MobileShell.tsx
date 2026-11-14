import React, { useState } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { sound } from '../../utils/audio';
import {
  Compass,
  Zap,
  BatteryCharging,
  User,
  Smartphone,
  Maximize2,
  Columns,
  Code2,
  Wifi,
  Signal,
  BatteryMedium,
  Building2,
  Radio,
  Lock,
} from 'lucide-react';
import { OnboardingAuthScreen } from '../screens/OnboardingAuthScreen';
import { StationDiscoveryScreen } from '../screens/StationDiscoveryScreen';
import { ServiceLockerSelectionScreen } from '../screens/ServiceLockerSelectionScreen';
import { PaymentQrUnlockScreen } from '../screens/PaymentQrUnlockScreen';
import { ActiveSessionScreen } from '../screens/ActiveSessionScreen';
import { ProfileHistoryScreen } from '../screens/ProfileHistoryScreen';
import { KioskHardwareSimulator } from '../hardware/KioskHardwareSimulator';
import { ExpoCodeInspector } from '../expo/ExpoCodeInspector';
import { KioskStation } from '../../types';

export type TabScreen = 'stations' | 'services' | 'active' | 'profile';
export type ViewportMode = 'device' | 'split' | 'fullscreen' | 'code';

export const MobileShell: React.FC = () => {
  const { isAuthenticated, activeSession, selectedStation, setSelectedStation } = useUniCharge();
  const [currentTab, setCurrentTab] = useState<TabScreen>('stations');
  const [isPaymentStep, setIsPaymentStep] = useState<boolean>(false);
  const [viewportMode, setViewportMode] = useState<ViewportMode>('split');

  const handleTabChange = (tab: TabScreen) => {
    sound.playTap();
    setIsPaymentStep(false);
    setCurrentTab(tab);
  };

  const handleSelectStationToBook = (station: KioskStation) => {
    setSelectedStation(station);
    setIsPaymentStep(false);
    setCurrentTab('services');
  };

  return (
    <div className="min-h-screen bg-[#070D14] text-slate-100 flex flex-col font-sans">
      {/* Top Universal Applet Control Bar */}
      <header className="sticky top-0 z-40 bg-[#0B192C] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand Lockup */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#FFC107] text-[#0B192C] flex items-center justify-center font-black text-lg shadow-md shadow-[#FFC107]/20">
            <Zap className="w-5 h-5 fill-[#0B192C]" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-white block">
              UniCharge <span className="text-[#FFC107]">USTP</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono block">
              Smart Campus Charging & Storage Locker System
            </span>
          </div>
        </div>

        {/* Viewport & Hardware Mode Selectors */}
        <div className="flex items-center bg-[#121212] p-1 rounded-xl border border-slate-700/80">
          <button
            onClick={() => {
              sound.playTap();
              setViewportMode('split');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewportMode === 'split'
                ? 'bg-[#FFC107] text-[#0B192C] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dual View (App + Kiosk)</span>
            <span className="sm:hidden">Dual</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setViewportMode('device');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewportMode === 'device'
                ? 'bg-[#FFC107] text-[#0B192C] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Phone Frame</span>
            <span className="sm:hidden">Phone</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setViewportMode('fullscreen');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewportMode === 'fullscreen'
                ? 'bg-[#FFC107] text-[#0B192C] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Full Mobile</span>
            <span className="sm:hidden">Full</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setViewportMode('code');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewportMode === 'code'
                ? 'bg-[#FFC107] text-[#0B192C] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Expo Code</span>
            <span className="sm:hidden">Code</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* VIEW 1: DUAL VIEW (MOBILE PHONE + PHYSICAL KIOSK SIMULATOR) */}
        {viewportMode === 'split' && (
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[calc(100vh-85px)]">
            {/* Left: Mobile Phone Device (5 Cols) */}
            <div className="lg:col-span-5 h-full flex flex-col items-center justify-center">
              {renderPhoneFrame()}
            </div>

            {/* Right: Physical 8-Door Kiosk Station (7 Cols) */}
            <div className="lg:col-span-7 h-full rounded-3xl border border-slate-800 bg-[#121212] overflow-hidden flex flex-col shadow-2xl">
              <KioskHardwareSimulator />
            </div>
          </div>
        )}

        {/* VIEW 2: PHONE FRAME ONLY */}
        {viewportMode === 'device' && (
          <div className="h-[calc(100vh-85px)] flex items-center justify-center">
            {renderPhoneFrame()}
          </div>
        )}

        {/* VIEW 3: FULL SCREEN RESPONSIVE */}
        {viewportMode === 'fullscreen' && (
          <div className="w-full max-w-md h-[calc(100vh-85px)] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col bg-[#0B192C]">
            {renderMobileAppContent()}
          </div>
        )}

        {/* VIEW 4: EXPO CODEBASE INSPECTOR */}
        {viewportMode === 'code' && (
          <div className="w-full max-w-5xl h-[calc(100vh-85px)] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col bg-[#0B192C]">
            <ExpoCodeInspector />
          </div>
        )}
      </main>
    </div>
  );

  // Realistic Smartphone Device Chassis Mockup
  function renderPhoneFrame() {
    return (
      <div className="relative w-[385px] h-[780px] max-h-[calc(100vh-95px)] bg-[#1A1A2E] rounded-[50px] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-[6px] border-[#2C3E50] ring-1 ring-white/10 flex flex-col select-none">
        {/* Outer Hardware Buttons */}
        <div className="absolute -left-[9px] top-28 w-[3px] h-8 bg-slate-600 rounded-l-md" /> {/* Mute */}
        <div className="absolute -left-[9px] top-40 w-[3px] h-12 bg-slate-600 rounded-l-md" /> {/* Vol Up */}
        <div className="absolute -left-[9px] top-56 w-[3px] h-12 bg-slate-600 rounded-l-md" /> {/* Vol Down */}
        <div className="absolute -right-[9px] top-36 w-[3px] h-16 bg-slate-600 rounded-r-md" /> {/* Power */}

        {/* Inner Phone Screen Display */}
        <div className="flex-1 w-full rounded-[42px] overflow-hidden bg-[#0B192C] flex flex-col relative shadow-inner">
          {/* iOS Dynamic Island & Status Bar */}
          <div className="bg-[#0B192C] px-6 pt-3 pb-1 flex items-center justify-between text-white text-[11px] font-semibold shrink-0 z-40 select-none">
            <span>9:41</span>
            {/* Dynamic Island pill */}
            <div className="w-24 h-5 rounded-full bg-black mx-auto flex items-center justify-between px-2 text-[9px] text-[#FFC107]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>USTP 5G</span>
              <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A2E] border border-slate-700" />
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <BatteryMedium className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          {/* App Screens Viewport */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            {renderMobileAppContent()}
          </div>

          {/* Bottom Home Indicator Bar */}
          <div className="bg-[#0B192C] pt-1 pb-2 flex justify-center z-30 shrink-0">
            <div className="w-32 h-1 bg-slate-500/60 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // App Interior Content & Tab Bar
  function renderMobileAppContent() {
    if (!isAuthenticated) {
      return <OnboardingAuthScreen />;
    }

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {/* SCREEN 2: STATION DISCOVERY */}
          {currentTab === 'stations' && (
            <StationDiscoveryScreen onSelectStationToBook={handleSelectStationToBook} />
          )}

          {/* SCREEN 3 & 4: SERVICE / LOCKER CONFIG & PAYMENT QR UNLOCK */}
          {currentTab === 'services' && (
            <>
              {isPaymentStep ? (
                <PaymentQrUnlockScreen
                  onUnlockSuccess={() => {
                    setIsPaymentStep(false);
                    setCurrentTab('active');
                  }}
                  onBackToConfig={() => setIsPaymentStep(false)}
                />
              ) : (
                <ServiceLockerSelectionScreen
                  onProceedToPayment={() => setIsPaymentStep(true)}
                  onBackToStations={() => setCurrentTab('stations')}
                />
              )}
            </>
          )}

          {/* SCREEN 5: ACTIVE SESSION & RETRIEVAL */}
          {currentTab === 'active' && (
            <ActiveSessionScreen onStartNewSession={() => setCurrentTab('stations')} />
          )}

          {/* SCREEN 6 & 7: PROFILE & HISTORY & SETTINGS */}
          {currentTab === 'profile' && <ProfileHistoryScreen />}
        </div>

        {/* Pattern 1: Fixed Bottom Tab Bar (Navigation Anchor) */}
        <nav className="absolute bottom-0 left-0 right-0 z-40 bg-[#0B192C]/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-4 items-center h-16 px-1 select-none">
          {/* Tab 1: Stations */}
          <button
            onClick={() => handleTabChange('stations')}
            className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
              currentTab === 'stations' ? 'text-[#FFC107]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className={`w-5 h-5 ${currentTab === 'stations' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] font-medium tracking-tight mt-1">Stations</span>
          </button>

          {/* Tab 2: Reserve / Services */}
          <button
            onClick={() => handleTabChange('services')}
            className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
              currentTab === 'services' ? 'text-[#FFC107]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className={`w-5 h-5 ${currentTab === 'services' ? 'stroke-[2.5] fill-[#FFC107]' : ''}`} />
            <span className="text-[10px] font-medium tracking-tight mt-1">Reserve</span>
          </button>

          {/* Tab 3: Active Session */}
          <button
            onClick={() => handleTabChange('active')}
            className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors relative ${
              currentTab === 'active' ? 'text-[#FFC107]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeSession && (
              <span className="absolute top-1 right-5 w-2 h-2 rounded-full bg-[#FFC107] ring-2 ring-[#0B192C] animate-pulse" />
            )}
            <BatteryCharging className={`w-5 h-5 ${currentTab === 'active' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] font-medium tracking-tight mt-1">Active</span>
          </button>

          {/* Tab 4: Student Profile */}
          <button
            onClick={() => handleTabChange('profile')}
            className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
              currentTab === 'profile' ? 'text-[#FFC107]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className={`w-5 h-5 ${currentTab === 'profile' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] font-medium tracking-tight mt-1">Profile</span>
          </button>
        </nav>
      </div>
    );
  }
};
