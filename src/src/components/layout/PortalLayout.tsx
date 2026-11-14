import React, { useState, useEffect } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { sound } from '../../utils/audio';
import { UniChargeLogo } from '../brand/UniChargeLogo';
import { UserAvatar } from '../brand/UserAvatar';
import {
  Menu,
  Zap,
  LayoutDashboard,
  MapPin,
  BatteryCharging,
  Wallet,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  Cpu,
  Users,
  ShieldAlert,
  Smartphone,
  ShieldOff,
  X,
  User,
  ChevronRight,
} from 'lucide-react';
import { StudentPortalView, StudentSection } from '../portal/StudentPortalView';
import { AdminPortalView, AdminSection } from '../portal/AdminPortalView';
import { UserProfileView } from '../portal/UserProfileView';

export const PortalLayout: React.FC = () => {
  const {
    currentUser,
    currentRoute,
    navigate,
    activeSession,
    securityAlerts,
    accessDeniedMessage,
    clearAccessDenied,
    logout,
  } = useUniCharge();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [studentSection, setStudentSection] = useState<StudentSection>(
    currentRoute === '/mobile-expo' ? 'mobile' : 'dashboard'
  );
  const [adminSection, setAdminSection] = useState<AdminSection>('overview');
  const [showProfileView, setShowProfileView] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (currentUser?.role !== 'student') return;
    if (currentRoute === '/mobile-expo') {
      setStudentSection('mobile');
    } else if (currentRoute === '/student/dashboard' && studentSection === 'mobile') {
      setStudentSection('dashboard');
    }
  }, [currentRoute, currentUser?.role]);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const unresolvedCount = securityAlerts.filter((a) => !a.resolved).length;

  const handleToggleSidebar = () => {
    sound.playTap();
    if (window.innerWidth < 1024) {
      setMobileDrawerOpen((prev) => !prev);
    } else {
      setSidebarOpen((prev) => !prev);
    }
  };

  const studentNavItems: {
    id: StudentSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'stations', label: 'Stations Map', icon: MapPin },
    {
      id: 'sessions',
      label: 'My Sessions',
      icon: BatteryCharging,
      badge: activeSession ? 1 : undefined,
    },
    { id: 'wallet', label: 'Wallet & Coins', icon: Wallet },
    { id: 'booking', label: 'Reserve a Locker', icon: Zap },
    { id: 'mobile', label: 'Mobile & Expo', icon: Smartphone },
  ];

  const adminNavItems: {
    id: AdminSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[] = [
    { id: 'overview', label: 'Fleet Dashboard', icon: LayoutDashboard },
    { id: 'hardware', label: 'Kiosk Hardware', icon: Cpu },
    { id: 'users', label: 'Users & RBAC', icon: Users },
    {
      id: 'alerts',
      label: 'Security & Logs',
      icon: ShieldAlert,
      badge: unresolvedCount > 0 ? unresolvedCount : undefined,
    },
  ];

  const handleStudentSectionChange = (nextSection: StudentSection) => {
    setShowProfileView(false);
    setStudentSection(nextSection);
    if (nextSection === 'mobile') {
      navigate('/mobile-expo');
    } else {
      navigate('/student/dashboard');
    }
  };

  const handleSelectNav = (id: string) => {
    sound.playTap();
    setShowProfileView(false);
    if (isAdmin) {
      setAdminSection(id as AdminSection);
    } else {
      handleStudentSectionChange(id as StudentSection);
    }
    setMobileDrawerOpen(false);
  };

  const handleOpenProfile = () => {
    sound.playTap();
    setShowProfileView(true);
    setMobileDrawerOpen(false);
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#FFFFFF] text-[#1E293B] select-none">
      {/* Top Workspace Header inside Sidebar */}
      <div className="px-5 py-3.5 border-b border-[#E2E8F0] shrink-0">
        <UniChargeLogo
          variant="horizontal"
          size="sm"
          subtitle={isAdmin ? 'Admin Portal' : 'Student Portal'}
        />
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {(isAdmin ? adminNavItems : studentNavItems).map((item) => {
          const Icon = item.icon;
          const isActive = isAdmin
            ? adminSection === item.id
            : studentSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelectNav(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#EDF2F5] text-[#4E6E81] font-bold'
                  : 'text-[#64748B] font-medium hover:bg-[#F8FAFC] hover:text-[#1E293B]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {isActive && (
                  <span className="w-1.5 h-4 rounded-full bg-[#5BC496] shrink-0" aria-hidden="true" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#4E6E81]' : 'text-[#64748B]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="ml-2 px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#5BC496] text-[#1E293B] font-mono">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom ACCOUNT Section */}
      <div className="px-3 py-4 border-t border-[#E2E8F0] space-y-1 shrink-0">
        <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
          ACCOUNT
        </div>

        <button
          onClick={handleOpenProfile}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
            showProfileView
              ? 'bg-[#EDF2F5] text-[#4E6E81] font-bold'
              : 'text-[#64748B] font-medium hover:bg-[#F8FAFC] hover:text-[#1E293B]'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span>My Profile</span>
        </button>

        <button
          onClick={() => handleSelectNav('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
            !showProfileView && (isAdmin ? adminSection : studentSection) === 'settings'
              ? 'bg-[#EDF2F5] text-[#4E6E81] font-bold'
              : 'text-[#64748B] font-medium hover:bg-[#F8FAFC] hover:text-[#1E293B]'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </button>

        <button
          onClick={() => handleSelectNav('support')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
            !showProfileView && (isAdmin ? adminSection : studentSection) === 'support'
              ? 'bg-[#EDF2F5] text-[#4E6E81] font-bold'
              : 'text-[#64748B] font-medium hover:bg-[#F8FAFC] hover:text-[#1E293B]'
          }`}
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Help &amp; Support</span>
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col">
      {/* Clean White Top Header Bar */}
      <header className="sticky top-0 z-30 h-16 bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Left: Hamburger + Brand + Role Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleToggleSidebar}
            aria-label="Toggle navigation sidebar"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#4E6E81] hover:bg-[#EDF2F5] transition-colors cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <UniChargeLogo variant="horizontal" size="sm" />

          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#EDF2F5] text-[#4E6E81] text-[10px] font-bold tracking-wider uppercase whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5BC496]" />
            {isAdmin ? 'ADMIN PORTAL' : 'STUDENT PORTAL'}
          </span>
        </div>

        {/* Right: E-Wallet (Student) + Bell + User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0 relative">
          {!isAdmin && (
            <button
              onClick={() => handleSelectNav('wallet')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EBF9F3] border border-[#5BC496]/40 hover:border-[#48AD80] text-xs font-mono font-bold text-[#1E293B] cursor-pointer transition-colors"
            >
              <Wallet className="w-3.5 h-3.5 text-[#4E6E81]" />
              <span>₱{currentUser.walletBalance.toFixed(2)}</span>
            </button>
          )}

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                sound.playTap();
                setShowNotifs((p) => !p);
              }}
              aria-label="Notifications"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[#64748B] hover:bg-[#EDF2F5] hover:text-[#4E6E81] relative cursor-pointer transition-colors"
            >
              <Bell className="w-5 h-5" />
              {((isAdmin && unresolvedCount > 0) || (!isAdmin && activeSession)) && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#5BC496] absolute top-2 right-2 ring-2 ring-white" />
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-72 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-xl p-4 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#4E6E81]">Notifications</span>
                  <button
                    onClick={() => setShowNotifs(false)}
                    className="text-xs text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <div className="py-2 space-y-2 text-xs">
                  {isAdmin ? (
                    securityAlerts.slice(0, 3).map((al) => (
                      <div key={al.id} className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                        <span className="font-semibold text-[#1E293B] block">{al.type}</span>
                        <span className="text-[#64748B] text-[11px]">{al.stationCode} · {al.timestamp}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2.5 rounded-xl bg-[#EBF9F3] border border-[#5BC496]/30">
                      <span className="font-semibold text-[#1E293B] block">
                        {activeSession
                          ? `Slot #${activeSession.slotNumber} Charging (${activeSession.batteryCurrent}%)`
                          : 'All Campus Kiosks Online'}
                      </span>
                      <span className="text-[#64748B] text-[11px]">
                        Overcharge auto cut-off protection is active.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clickable Profile Button */}
          <button
            type="button"
            onClick={handleOpenProfile}
            title="View and edit your profile"
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
              showProfileView
                ? 'bg-[#EDF2F5] border-[#4E6E81]/30'
                : 'bg-transparent border-transparent hover:bg-[#EDF2F5] hover:border-[#E2E8F0]'
            }`}
          >
            <UserAvatar src={currentUser.avatar} name={currentUser.name} size="md" />
            <div className="hidden md:block text-left leading-tight">
              <span className="text-xs font-bold text-[#1E293B] block">
                {currentUser.name}
              </span>
              <span className="text-[11px] font-mono text-[#64748B] block">
                {currentUser.studentIdNumber}
              </span>
            </div>
            <ChevronRight className="hidden md:block w-3.5 h-3.5 text-[#64748B]" />
          </button>
        </div>
      </header>

      {/* Main Workspace with Collapsible Left Sidebar */}
      <div className="flex-1 flex relative">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={`hidden lg:block shrink-0 bg-[#FFFFFF] border-r border-[#E2E8F0] transition-all duration-200 overflow-hidden ${
            sidebarOpen ? 'w-64' : 'w-0 border-r-0'
          }`}
        >
          <div className="w-64 h-[calc(100vh-4rem)] sticky top-16">
            {renderSidebarContent()}
          </div>
        </aside>

        {/* Mobile Slide-Over Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />
            <div className="relative w-64 max-w-[80vw] h-full bg-[#FFFFFF] border-r border-[#E2E8F0] shadow-2xl z-10 flex flex-col">
              <button
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close sidebar"
                className="absolute top-3.5 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#EDF2F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              {renderSidebarContent()}
            </div>
          </div>
        )}

        {/* Main Content Canvas */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* RBAC Access Denied Toast/Banner */}
          {accessDeniedMessage && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-semibold flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <ShieldOff className="w-4 h-4 text-[#DC2626] shrink-0" />
                <span>{accessDeniedMessage}</span>
              </div>
              <button
                onClick={clearAccessDenied}
                className="text-[#DC2626] hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {showProfileView ? (
            <UserProfileView onBackToDashboard={() => setShowProfileView(false)} />
          ) : isAdmin ? (
            <AdminPortalView
              section={adminSection}
              onChangeSection={setAdminSection}
            />
          ) : (
            <StudentPortalView
              section={studentSection}
              onChangeSection={handleStudentSectionChange}
            />
          )}
        </main>
      </div>
    </div>
  );
};
