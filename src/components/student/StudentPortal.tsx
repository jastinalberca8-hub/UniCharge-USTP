import React, { useState } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import {
  Zap,
  MapPin,
  Clock,
  CreditCard,
  Receipt,
  LogOut,
  Bell,
  Unlock,
  Lock,
  PlusCircle,
  ExternalLink,
  Laptop,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Coins,
  Gauge,
  Thermometer,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { StudentTab, LockerCompartment, PaymentMethod } from '../../types';

export const StudentPortal: React.FC = () => {
  const {
    currentUser,
    logout,
    activeStudentTab,
    setActiveStudentTab,
    stations,
    activeStationId,
    setActiveStationId,
    activeUserSessions,
    transactions,
    topUpWallet,
    extendSession,
    unlockAndEndSession,
    setIsBookingModalOpen,
    setBookingTarget,
    setIsKioskModalOpen,
    setKioskInitialStationId,
    setReceiptModalData,
  } = useUniCharge();

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Top Up Modal
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(100);
  const [topUpMethod, setTopUpMethod] = useState<'GCash' | 'Maya' | 'Campus Cashier'>('GCash');

  // Extend Modal
  const [extendCompId, setExtendCompId] = useState<string | null>(null);
  const [extendMinutes, setExtendMinutes] = useState<number>(30);

  // Stations map filter
  const [sizeFilter, setSizeFilter] = useState<'all' | 'standard' | 'large'>('all');

  const selectedStation = stations.find(s => s.id === activeStationId) || stations[0];

  const handleTopUpConfirm = () => {
    topUpWallet(topUpAmount, topUpMethod);
    setIsTopUpOpen(false);
    setToastMessage(`₱${topUpAmount.toFixed(2)} loaded to your USTP E-Wallet via ${topUpMethod}!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleExtendConfirm = () => {
    if (!extendCompId) return;
    const res = extendSession(extendCompId, extendMinutes);
    setExtendCompId(null);
    setToastMessage(res.message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleUnlockLocker = (compartmentId: string) => {
    const res = unlockAndEndSession(compartmentId);
    setToastMessage(res.message);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleReserveClick = (stationId: string, compartmentNumber: number) => {
    setBookingTarget({ stationId, compartmentNumber });
    setIsBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 flex flex-col">
      
      {/* 1. CLEAN WHITE INSTITUTIONAL TOP HEADER */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Wordmark & Collegiate Tag */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1B1448] text-[#FBB03B] flex items-center justify-center font-bold shadow-sm">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-[#1B1448]">
                  UniCharge <span className="text-[#FBB03B]">USTP</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                  STUDENT PORTAL
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:block">
                University of Science and Technology of Southern Philippines
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3">
            
            {/* E-Wallet Quick Pill */}
            <div
              onClick={() => setActiveStudentTab('wallet')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E5E7EB] bg-slate-50 hover:border-[#FBB03B] cursor-pointer transition-colors"
              title="Click to view E-Wallet & Top Up"
            >
              <CreditCard className="w-4 h-4 text-[#FBB03B]" />
              <div className="text-left text-xs font-mono">
                <span className="text-[10px] text-slate-400 block leading-tight">E-WALLET</span>
                <span className="font-bold text-[#1B1448] tabular-nums">
                  ₱{currentUser.walletBalance.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl text-slate-500 hover:text-[#1B1448] hover:bg-slate-100 transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {activeUserSessions.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FBB03B]" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-[#E5E7EB] shadow-xl p-3 z-40 text-xs space-y-2 animate-in fade-in">
                  <div className="font-bold text-slate-800 pb-2 border-b border-slate-100 flex justify-between">
                    <span>Campus Locker Notifications</span>
                    <span className="text-[10px] text-slate-400 font-mono">USTP IoT</span>
                  </div>
                  {activeUserSessions.length > 0 ? (
                    activeUserSessions.map(({ compartment, session }) => (
                      <div key={session.sessionId} className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 text-amber-900 space-y-1">
                        <span className="font-bold block">Charging Active: Locker #{compartment.compartmentNumber}</span>
                        <p className="text-[11px] text-amber-700">Solenoid locked. USB-PD fast-charging active at {compartment.currentPowerDrawWatts}W.</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-3 text-[11px]">No pending alerts. All campus lockers nominal.</p>
                  )}
                </div>
              )}
            </div>

            {/* Student Profile Lockup */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-[#1B1448] text-[#FBB03B] flex items-center justify-center font-bold text-xs font-mono">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden md:block text-left text-xs">
                <span className="font-bold text-slate-800 block leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {currentUser.studentId}
                </span>
              </div>
            </div>

            {/* Launch Kiosk Simulator Button */}
            <button
              onClick={() => setIsKioskModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#1B1448] bg-[#FBB03B] hover:bg-[#FBB03B]/90 rounded-xl transition-all shadow-xs"
              title="Test physical locker kiosk screen"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Kiosk Simulator</span>
            </button>

          </div>
        </div>

        {/* 2. DEEP INDIGO-NAVY NAVIGATION BAR WITH GOLD ACCENTS */}
        <div className="bg-[#1B1448] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            
            {/* Tabs */}
            <nav className="flex space-x-1 sm:space-x-4">
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'stations', label: 'Stations Map' },
                { id: 'sessions', label: 'My Sessions' },
                { id: 'wallet', label: 'Wallet & Coins' },
              ].map(tab => {
                const isActive = activeStudentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveStudentTab(tab.id as StudentTab)}
                    className={`py-3.5 px-3 text-xs font-bold transition-all relative whitespace-nowrap flex items-center gap-1.5 ${
                      isActive
                        ? 'text-[#FBB03B]'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.id === 'sessions' && activeUserSessions.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#FBB03B] text-[#1B1448] font-bold">
                        {activeUserSessions.length}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 inset-x-2 h-0.5 bg-[#FBB03B] rounded-t-full shadow-xs" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Logout Action */}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Sign out of student account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Toast Feedback */}
        {toastMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between animate-in fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-700">✕</button>
          </div>
        )}

        {/* =========================================================================
            TAB 1: DASHBOARD
        ========================================================================== */}
        {activeStudentTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Welcome Greeting Banner */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#FBB03B] block">
                  USTP Student Portal
                </span>
                <h2 className="text-2xl font-extrabold text-[#1B1448] tracking-tight mt-0.5">
                  Hi, {currentUser.name}!
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-xl">
                  Your smart locker command center. Reserve campus charging compartments, view live power telemetry, and top up your university e-wallet.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveStudentTab('stations')}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-[#1B1448] hover:bg-[#1B1448]/90 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <MapPin className="w-4 h-4 text-[#FBB03B]" />
                  <span>Reserve a Locker</span>
                </button>
                <button
                  onClick={() => setIsTopUpOpen(true)}
                  className="px-4 py-2.5 text-xs font-bold text-[#1B1448] bg-[#FBB03B] hover:bg-[#FBB03B]/90 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Reload ₱</span>
                </button>
              </div>
            </div>

            {/* Active Locker Countdown Card (Prominent Hero Feature) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#1B1448] uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#FBB03B]" />
                  <span>Current Active Locker Session</span>
                </h3>
                <span className="text-xs font-mono text-emerald-600 font-semibold">
                  Solenoid Lock: Monitored
                </span>
              </div>

              {activeUserSessions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-[#E5E7EB] p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      No Active Locker Reserved
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Need fast device charging or secure backpack storage between classes? Pick any free compartment from the campus grid.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveStudentTab('stations')}
                    className="mt-2 px-4 py-2 text-xs font-bold text-white bg-[#1B1448] hover:bg-[#1B1448]/90 rounded-xl"
                  >
                    View Campus Kiosks
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {activeUserSessions.map(({ compartment, session, station }) => {
                    const endTimestamp = new Date(session.endTime).getTime();
                    const remainingMs = Math.max(0, endTimestamp - Date.now());
                    const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
                    const isExpiringSoon = remainingMinutes < 15;

                    return (
                      <div
                        key={session.sessionId}
                        className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm overflow-hidden relative"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#FBB03B]" />

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                          
                          {/* Left Column: Locker Identity & Hardware Live Stats */}
                          <div className="lg:col-span-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-[#1B1448] text-[#FBB03B] font-mono font-black text-xl flex items-center justify-center shadow-sm">
                                #{compartment.compartmentNumber}
                              </div>
                              <div>
                                <span className="text-base font-extrabold text-[#1B1448] block leading-tight">
                                  {station.name}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">
                                  Locker ID: {compartment.id} · {compartment.size === 'large' ? 'Large Compartment' : 'Standard'}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600">
                              Stored: <strong className="text-slate-800">{session.deviceType || 'Laptop & Smart Device'}</strong>
                            </p>

                            {/* Live Telemetry Mini-Badges */}
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                <span className="text-[10px] text-slate-400 block">Fast-Charge Draw</span>
                                <span className="text-[#1B1448] font-bold flex items-center gap-1">
                                  <Zap className="w-3.5 h-3.5 text-[#FBB03B] fill-current" />
                                  {compartment.currentPowerDrawWatts.toFixed(1)} W
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                <span className="text-[10px] text-slate-400 block">AC Safety Line</span>
                                <span className="text-slate-700 font-bold">
                                  {station.voltage.toFixed(1)} V
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Center Column: Prominent Circular Countdown */}
                          <div className="lg:col-span-4 text-center py-2 px-4 border-y lg:border-y-0 lg:border-x border-[#E5E7EB]">
                            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block mb-1">
                              Time Remaining
                            </span>
                            <div
                              className={`font-mono text-4xl sm:text-5xl font-black tabular-nums tracking-tight ${
                                isExpiringSoon ? 'text-red-600 animate-pulse' : 'text-[#1B1448]'
                              }`}
                            >
                              {Math.floor(remainingMinutes / 60)}h {remainingMinutes % 60}m
                            </div>
                            <span className="text-[11px] text-slate-500 block mt-1">
                              Auto-deducted from E-Wallet · 15m grace window
                            </span>

                            {/* Emergency PIN display */}
                            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 font-mono text-xs text-slate-800">
                              <QrCode className="w-3.5 h-3.5 text-slate-600" />
                              <span>Kiosk PIN: <strong className="text-[#1B1448] tracking-widest">{session.pinCode}</strong></span>
                            </div>
                          </div>

                          {/* Right Column: Actions */}
                          <div className="lg:col-span-4 space-y-2.5">
                            <button
                              onClick={() => handleUnlockLocker(compartment.id)}
                              className="w-full py-3 px-4 text-xs font-bold text-white bg-[#1B1448] hover:bg-red-600 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                              <Unlock className="w-4 h-4" />
                              <span>Open Locker / End Session</span>
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setExtendCompId(compartment.id)}
                                className="py-2.5 px-3 text-xs font-bold text-[#1B1448] bg-[#FBB03B] hover:bg-[#FBB03B]/90 rounded-xl transition-colors text-center"
                              >
                                Extend Time
                              </button>

                              <button
                                onClick={() => {
                                  setKioskInitialStationId(station.id);
                                  setIsKioskModalOpen(true);
                                }}
                                className="py-2.5 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1"
                              >
                                <span>Scan at Kiosk</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Split: Live Campus Kiosk Availability + E-Wallet Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Live Campus Kiosk Availability Grid Summary */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#FBB03B]" />
                    <h3 className="text-sm font-extrabold text-[#1B1448]">
                      Live Campus Kiosk Stations
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveStudentTab('stations')}
                    className="text-xs font-bold text-[#1B1448] hover:text-[#FBB03B] transition-colors flex items-center gap-1"
                  >
                    <span>View Interactive Grid</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {stations.map(station => {
                    const freeCount = station.compartments.filter(c => c.status === 'available').length;
                    const inUseCount = station.compartments.filter(c => c.status === 'in_use').length;

                    return (
                      <div
                        key={station.id}
                        onClick={() => {
                          setActiveStationId(station.id);
                          setActiveStudentTab('stations');
                        }}
                        className="p-4 rounded-xl border border-[#E5E7EB] bg-slate-50/60 hover:border-[#1B1448] cursor-pointer transition-all space-y-2 group"
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-xs text-[#1B1448] group-hover:text-[#FBB03B] transition-colors">
                            {station.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                            {station.buildingCode}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {station.campusZone}
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-mono">
                          <span className="text-emerald-600 font-bold tabular-nums">
                            {freeCount} Free
                          </span>
                          <span className="text-slate-400">
                            {inUseCount} In-Use
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* E-Wallet Quick Card */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      USTP E-Wallet Balance
                    </span>
                    <CreditCard className="w-4 h-4 text-[#FBB03B]" />
                  </div>

                  <div className="py-5">
                    <span className="font-mono text-3xl font-black text-[#1B1448] tabular-nums tracking-tight">
                      ₱{currentUser.walletBalance.toFixed(2)}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      Linked to Student ID: <strong className="text-slate-700">{currentUser.studentId}</strong>
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setIsTopUpOpen(true)}
                    className="w-full py-2.5 text-xs font-bold text-white bg-[#1B1448] hover:bg-[#1B1448]/90 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4 text-[#FBB03B]" />
                    <span>Instant Top-Up (GCash / Maya)</span>
                  </button>
                  <button
                    onClick={() => setActiveStudentTab('wallet')}
                    className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-[#1B1448] transition-colors text-center"
                  >
                    View Billing Rates & Ledger →
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* =========================================================================
            TAB 2: STATIONS MAP (INTERACTIVE CAMPUS GRID)
        ========================================================================== */}
        {activeStudentTab === 'stations' && (
          <div className="space-y-6">
            
            {/* Header and Switcher */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-[#1B1448]">
                    Campus Locker Stations Grid
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a campus facility to view real-time compartment availability, USB-PD power draw, and reserve a door.
                  </p>
                </div>

                {/* Filter controls */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Size:</span>
                  <div className="p-1 rounded-xl bg-slate-100 flex gap-1 text-xs">
                    {(['all', 'standard', 'large'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setSizeFilter(f)}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                          sizeFilter === f ? 'bg-white text-[#1B1448] font-bold shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        {f === 'all' ? 'All' : f === 'standard' ? 'Phone' : 'Laptop'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Station Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {stations.map(station => {
                  const isSelected = station.id === activeStationId;
                  const free = station.compartments.filter(c => c.status === 'available').length;

                  return (
                    <button
                      key={station.id}
                      onClick={() => setActiveStationId(station.id)}
                      className={`p-4 rounded-xl text-left border transition-all ${
                        isSelected
                          ? 'border-[#1B1448] bg-slate-50 ring-2 ring-[#1B1448]/10'
                          : 'border-[#E5E7EB] bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#1B1448]">{station.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 font-bold">
                          {station.buildingCode}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 block mt-1">{station.campusZone}</span>
                      <span className="text-xs font-mono font-bold text-emerald-600 block mt-2">
                        {free} Available of {station.compartments.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Station Compartment Matrix */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-bold text-sm text-[#1B1448]">
                    {selectedStation.name} [{selectedStation.buildingCode}]
                  </span>
                  <span className="text-xs text-slate-500">· {selectedStation.locationDetails}</span>
                </div>
                <button
                  onClick={() => {
                    setKioskInitialStationId(selectedStation.id);
                    setIsKioskModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#1B1448] bg-[#FBB03B] hover:bg-[#FBB03B]/90 transition-colors shadow-xs"
                >
                  Simulate Kiosk Terminal
                </button>
              </div>

              {/* Grid of doors */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {selectedStation.compartments
                  .filter(c => (sizeFilter === 'all' ? true : c.size === sizeFilter))
                  .map(comp => {
                    const isAvailable = comp.status === 'available';
                    const isInUse = comp.status === 'in_use';

                    return (
                      <div
                        key={comp.id}
                        onClick={() => {
                          if (isAvailable) {
                            handleReserveClick(selectedStation.id, comp.compartmentNumber);
                          }
                        }}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between h-40 ${
                          isAvailable
                            ? 'bg-white border-[#E5E7EB] hover:border-emerald-500 hover:shadow-md cursor-pointer'
                            : isInUse
                            ? 'bg-amber-50/40 border-amber-200'
                            : 'bg-slate-100 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-mono text-xl font-black text-[#1B1448] tabular-nums">
                            #{comp.compartmentNumber.toString().padStart(2, '0')}
                          </span>
                          <div className="p-1 rounded bg-slate-100 text-slate-600">
                            {comp.size === 'large' ? <Laptop className="w-3.5 h-3.5 text-sky-600" /> : <Smartphone className="w-3.5 h-3.5 text-emerald-600" />}
                          </div>
                        </div>

                        <div className="py-2 border-y border-dashed border-slate-100 text-xs">
                          <span className="text-[10px] text-slate-400 block">
                            {comp.size === 'large' ? '15-16" Laptop' : 'Standard Phone'}
                          </span>
                          <span className="font-mono text-xs font-bold text-[#1B1448]">
                            {comp.size === 'large' ? '₱15/hr' : '₱10/hr'}
                          </span>
                        </div>

                        <div>
                          {isAvailable ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReserveClick(selectedStation.id, comp.compartmentNumber);
                              }}
                              className="w-full py-1 text-[11px] font-bold text-white bg-[#1B1448] hover:bg-[#FBB03B] hover:text-[#1B1448] rounded-lg transition-colors"
                            >
                              Reserve
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono font-bold text-[#FBB03B] block text-center">
                              {comp.currentPowerDrawWatts > 0 ? `${comp.currentPowerDrawWatts}W Draw` : 'In-Use'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            TAB 3: MY SESSIONS & RECEIPTS
        ========================================================================== */}
        {activeStudentTab === 'sessions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#1B1448]">
                  Charging & Storage Session Receipts
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official historical ledger of your locker rentals and electronic transaction proofs.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-mono uppercase tracking-wider border-b border-[#E5E7EB]">
                    <tr>
                      <th className="py-3 px-4">Ref Code</th>
                      <th className="py-3 px-4">Date / Time</th>
                      <th className="py-3 px-4">Station & Locker</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                    {transactions.map(txn => (
                      <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#1B1448]">
                          {txn.id}
                        </td>
                        <td className="py-3.5 px-4 font-sans text-slate-600">
                          {txn.timestamp}
                        </td>
                        <td className="py-3.5 px-4 font-sans">
                          <span className="font-semibold text-slate-900">{txn.stationName}</span>
                          {txn.compartmentNumber > 0 && <span className="text-slate-400 ml-1">#{txn.compartmentNumber}</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          {txn.durationMinutes > 0 ? `${txn.durationMinutes} mins` : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-sans">
                          {txn.paymentMethod === 'wallet' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              E-WALLET
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              COIN SLOT
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#1B1448] tabular-nums">
                          ₱{txn.amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setReceiptModalData(txn)}
                            className="inline-flex items-center gap-1 text-[11px] font-sans font-bold text-[#1B1448] hover:text-[#FBB03B] transition-colors"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: WALLET & COINS
        ========================================================================== */}
        {activeStudentTab === 'wallet' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Wallet Management Card */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-extrabold text-[#1B1448]">
                    USTP Student E-Wallet
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    RFID: {currentUser.campusCardRfid}
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-[#1B1448] text-white space-y-3 shadow-md relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10">
                    <Zap className="w-40 h-40 text-[#FBB03B]" />
                  </div>

                  <span className="text-xs uppercase tracking-wider text-slate-300 block">
                    Available Stored Value
                  </span>
                  <div className="text-4xl font-black font-mono text-[#FBB03B] tabular-nums tracking-tight">
                    ₱{currentUser.walletBalance.toFixed(2)}
                  </div>
                  <div className="pt-2 text-xs text-slate-300 font-mono">
                    Account: {currentUser.name} ({currentUser.studentId})
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Quick Reload
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[50, 100, 150, 300].map(amt => (
                      <button
                        key={amt}
                        onClick={() => {
                          setTopUpAmount(amt);
                          setIsTopUpOpen(true);
                        }}
                        className="py-2.5 rounded-xl border border-[#E5E7EB] hover:border-[#1B1448] font-mono text-xs font-bold text-[#1B1448] bg-slate-50 transition-colors"
                      >
                        +₱{amt}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsTopUpOpen(true)}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-[#1B1448] bg-[#FBB03B] hover:bg-[#FBB03B]/90 transition-all shadow-xs flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Top-Up with GCash / Maya Checkout</span>
                  </button>
                </div>
              </div>

              {/* Physical Coin Slot Guide & Rates */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#FBB03B]" />
                    <h3 className="text-base font-extrabold text-[#1B1448]">
                      Physical Coin Slot Instructions
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-600 font-semibold">
                    Kiosk Slot Active
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Prefer cash? All UniCharge stations are equipped with optical coin validators accepting genuine Bangko Sentral ng Pilipinas coins.
                </p>

                <div className="grid grid-cols-3 gap-3 text-center">
                  {[5, 10, 20].map(val => (
                    <div key={val} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-lg font-black font-mono text-[#1B1448] block">₱{val}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Coin Accepted</span>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <span className="font-bold text-[#1B1448] block">Standard Educational Rates:</span>
                  <div className="flex justify-between text-slate-600">
                    <span>Standard Locker (Phone / Powerbank)</span>
                    <strong className="font-mono text-slate-900">₱10.00 / hr</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Large Locker (15"-16" Laptops / Bags)</span>
                    <strong className="font-mono text-slate-900">₱15.00 / hr</strong>
                  </div>
                  <div className="flex justify-between text-emerald-700 pt-1 border-t border-slate-200 text-[11px]">
                    <span>15-Minute Lecture Grace Period</span>
                    <strong>Free of charge</strong>
                  </div>
                </div>

                <button
                  onClick={() => setIsKioskModalOpen(true)}
                  className="w-full py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Coins className="w-3.5 h-3.5 text-[#FBB03B]" />
                  <span>Simulate Coin Drop at Virtual Kiosk</span>
                </button>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Top-Up Modal */}
      {isTopUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E5E7EB] p-6 shadow-2xl space-y-5 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-[#1B1448]">
                Top-Up USTP E-Wallet
              </h3>
              <button onClick={() => setIsTopUpOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  Select Reload Amount
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 100, 150, 300].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopUpAmount(amt)}
                      className={`py-2 rounded-xl border font-mono font-bold text-xs transition-all ${
                        topUpAmount === amt
                          ? 'border-[#1B1448] bg-[#1B1448] text-white'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      ₱{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  Payment Gateway
                </label>
                <div className="space-y-2">
                  {(['GCash', 'Maya', 'Campus Cashier'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTopUpMethod(m)}
                      className={`w-full p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                        topUpMethod === m
                          ? 'border-[#1B1448] bg-slate-50 text-[#1B1448] ring-1 ring-[#1B1448]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{m} Instant Online Pay</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">Credited to {currentUser.studentId}</span>
              <button
                onClick={handleTopUpConfirm}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#1B1448] hover:bg-[#1B1448]/90 rounded-xl shadow-sm"
              >
                Pay ₱{topUpAmount.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Session Modal */}
      {extendCompId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-[#E5E7EB] p-6 shadow-2xl space-y-4 text-slate-900">
            <h3 className="font-bold text-base text-[#1B1448]">
              Extend Locker Duration
            </h3>
            <p className="text-xs text-slate-500">
              Select additional time. Amount will be deducted from your E-Wallet (₱{currentUser.walletBalance.toFixed(2)} available).
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[30, 60, 120].map(mins => (
                <button
                  key={mins}
                  onClick={() => setExtendMinutes(mins)}
                  className={`p-3 rounded-xl border text-center font-mono text-xs font-bold transition-all ${
                    extendMinutes === mins
                      ? 'border-[#1B1448] bg-[#1B1448] text-white'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  +{mins} min
                  <span className="block text-[10px] font-sans font-normal opacity-80">
                    ₱{((mins / 60) * 10).toFixed(2)}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setExtendCompId(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendConfirm}
                className="flex-1 py-2 text-xs font-bold text-white bg-[#1B1448] hover:bg-[#1B1448]/90 rounded-xl"
              >
                Confirm Extension
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
