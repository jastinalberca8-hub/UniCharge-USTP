import React from 'react';
import { useUniCharge } from '../context/UniChargeContext';
import {
  Zap,
  Terminal,
  Bell,
  Mail,
  ExternalLink,
  ChevronDown,
  Phone,
  ShieldAlert,
  Sun,
  Moon,
  Coins,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    theme,
    toggleTheme,
    currentUser,
    setIsKioskModalOpen,
    alerts,
    activeUserSessions,
  } = useUniCharge();

  const unresolvedAlertsCount = alerts.filter(a => !a.isResolved).length;

  return (
    <header className="w-full flex flex-col z-40 bg-white">
      
      {/* 1. TOP INSTITUTIONAL UTILITY BAR (Deep Indigo-Navy with #FBB03B bottom border) */}
      <div className="bg-[#1B1448] text-white text-[11px] font-sans border-b-2 border-[#FBB03B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between">
          
          {/* Left Campus Links */}
          <div className="flex items-center gap-4 text-slate-200">
            <a
              href="https://www.ustp.edu.ph"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#FBB03B] transition-colors flex items-center gap-1 font-medium"
            >
              <span>ustp.edu.ph</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </a>
            <span className="text-slate-500">|</span>
            <span className="hidden sm:inline text-slate-300">
              USTP System · Cagayan de Oro Campus
            </span>
            <span className="hidden md:inline text-slate-500">|</span>
            <span className="hidden md:inline text-[#FBB03B] font-mono">
              unicharge.ustp.edu.ph
            </span>
          </div>

          {/* Right Academic Year & Quick Utilities */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-slate-300 font-mono text-[10px]">
              A.Y. 2026–2027 · 1st Semester
            </span>
            <span className="hidden sm:inline text-slate-500">|</span>
            
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Clean Light Theme' : 'Switch to Dark Theme'}
              className="p-1 rounded text-slate-300 hover:text-[#FBB03B] transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <span className="text-slate-300 flex items-center gap-1">
              <Phone className="w-2.5 h-2.5 text-[#FBB03B]" />
              <span className="font-mono text-[10px]">Ext. 4102</span>
            </span>
          </div>

        </div>
      </div>

      {/* 2. BRAND & USER HEADER (Clean White Background #FFFFFF) */}
      <div className="bg-white border-b border-[#E5E7EB] py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          
          {/* Logo / Brand Lockup (USTeP institutional style) */}
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-3 text-left focus:outline-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1B1448] text-[#FBB03B] flex items-center justify-center shadow-xs border border-[#1B1448]">
              <Zap className="w-6 h-6 fill-current" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-[#1B1448]">
                  UniCharge
                </span>
                <span className="text-xs font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#1B1448] text-[#FBB03B]">
                  USTP
                </span>
              </div>
              <span className="text-[11px] text-[#6B7280] block font-medium">
                Smart Campus Charging & Storage Locker Network
              </span>
            </div>
          </button>

          {/* User Profile & Notification Badges (Exact USTeP Portal Match) */}
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* Notification Bell with #DC2626 Crimson Red Badge */}
            <button
              onClick={() => setCurrentView('admin')}
              className="relative w-9 h-9 rounded-full bg-[#1B1448] hover:bg-[#281E68] text-white flex items-center justify-center transition-colors shadow-xs"
              title="Campus Security & Tamper Notifications"
            >
              <Bell className="w-4 h-4 text-slate-200" />
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#DC2626] text-white text-[9px] font-bold font-mono flex items-center justify-center shadow-xs">
                {unresolvedAlertsCount > 0 ? unresolvedAlertsCount : '22'}
              </span>
            </button>

            {/* Message / System Alerts Button */}
            <button
              onClick={() => setCurrentView('dashboard')}
              className="w-9 h-9 rounded-full bg-[#1B1448] hover:bg-[#281E68] text-white hidden sm:flex items-center justify-center transition-colors shadow-xs"
              title="Active Locker Passes"
            >
              <Mail className="w-4 h-4 text-slate-200" />
              {activeUserSessions.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#10B981] ring-2 ring-white" />
              )}
            </button>

            {/* User Profile Lockup: Jastin Alberca highlighted in #FBB03B */}
            <div
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center gap-2.5 pl-2 py-1 cursor-pointer group"
            >
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-[#FBB03B] block leading-tight group-hover:text-[#F59E0B] transition-colors">
                  {currentUser.name}
                </span>
                <span className="text-[10px] font-mono text-[#6B7280] block">
                  {currentUser.studentId}
                </span>
              </div>

              {/* User Avatar with J initial */}
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-[#1B1448] border-2 border-[#FBB03B] text-[#FBB03B] flex items-center justify-center font-bold text-sm shadow-xs font-mono">
                  {currentUser.name.charAt(0)}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#10B981] ring-2 ring-white" />
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 3. PRIMARY NAVIGATION BAR (Full-width #1B1448 Indigo-Navy with #FBB03B 3px Underline) */}
      <nav className="bg-[#1B1448] text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Main Navigation Tabs */}
          <div className="flex items-center space-x-1 sm:space-x-3 overflow-x-auto py-0 scrollbar-none">
            
            <button
              onClick={() => setCurrentView('landing')}
              className={`h-11 px-3 sm:px-4 text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 relative ${
                currentView === 'landing'
                  ? 'text-[#FBB03B] font-bold border-b-[3px] border-[#FBB03B]'
                  : 'text-white hover:text-[#FBB03B] hover:bg-[#281E68]/40'
              }`}
            >
              <span>Dashboard</span>
            </button>

            <a
              href="#campus-grid"
              onClick={(e) => {
                if (currentView !== 'landing') {
                  e.preventDefault();
                  setCurrentView('landing');
                  setTimeout(() => {
                    document.getElementById('campus-grid')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
              className="h-11 px-3 sm:px-4 text-xs font-semibold whitespace-nowrap text-white hover:text-[#FBB03B] hover:bg-[#281E68]/40 transition-colors flex items-center"
            >
              <span>Stations Map</span>
            </a>

            <button
              onClick={() => setCurrentView('dashboard')}
              className={`h-11 px-3 sm:px-4 text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 relative ${
                currentView === 'dashboard'
                  ? 'text-[#FBB03B] font-bold border-b-[3px] border-[#FBB03B]'
                  : 'text-white hover:text-[#FBB03B] hover:bg-[#281E68]/40'
              }`}
            >
              <span>My Sessions</span>
              {activeUserSessions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#10B981] text-white text-[10px] font-mono font-bold">
                  {activeUserSessions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentView('dashboard')}
              className="h-11 px-3 sm:px-4 text-xs font-semibold whitespace-nowrap text-white hover:text-[#FBB03B] hover:bg-[#281E68]/40 transition-colors flex items-center gap-1.5"
            >
              <span>Wallet & Coins</span>
              <span className="text-[#FBB03B] font-mono text-[11px] font-bold">
                (₱{currentUser.walletBalance.toFixed(0)})
              </span>
            </button>

            <button
              onClick={() => setCurrentView('admin')}
              className={`h-11 px-3 sm:px-4 text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 relative ${
                currentView === 'admin'
                  ? 'text-[#FBB03B] font-bold border-b-[3px] border-[#FBB03B]'
                  : 'text-white hover:text-[#FBB03B] hover:bg-[#281E68]/40'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-slate-300" />
              <span>Admin Monitor</span>
              {unresolvedAlertsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#DC2626] text-white text-[10px] font-mono font-bold">
                  {unresolvedAlertsCount}
                </span>
              )}
            </button>

          </div>

          {/* Right Action: Kiosk Hardware Simulator Button */}
          <div className="py-1.5">
            <button
              onClick={() => setIsKioskModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[#1B1448] bg-[#FBB03B] hover:bg-[#F59E0B] rounded-md transition-colors shadow-xs whitespace-nowrap active:scale-95"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kiosk Terminal Simulator</span>
              <span className="sm:hidden">Kiosk</span>
            </button>
          </div>

        </div>
      </nav>

    </header>
  );
};
