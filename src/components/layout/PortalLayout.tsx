import React, { useState, useEffect } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { sound } from '../../utils/audio';
import { UniChargeLogo } from '../brand/UniChargeLogo';
import { UserAvatar } from '../brand/UserAvatar';
import { formatCompartmentLabel } from '../../constants/pricing';
import {
  Menu,
  Zap,
  LayoutDashboard,
  BatteryCharging,
  Wallet,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  Cpu,
  Users,
  ShieldAlert,
  ScanLine,
  ShieldOff,
  X,
  User,
  ChevronRight,
  Check,
  Trash2,
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
    notifications,
    liveToastNotifications,
    unreadNotificationCount,
    isFirestoreLive,
    dismissLiveToast,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
  } = useUniCharge();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [studentSection, setStudentSection] = useState<StudentSection>(
    currentRoute === '/kiosk' ? 'kiosk' : 'dashboard'
  );
  const [adminSection, setAdminSection] = useState<AdminSection>('overview');
  const [showProfileView, setShowProfileView] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (currentUser?.role !== 'student') return;
    if (currentRoute === '/kiosk') {
      setStudentSection('kiosk');
    } else if (currentRoute === '/student/dashboard' && studentSection === 'kiosk') {
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
    {
      id: 'sessions',
      label: 'My Sessions',
      icon: BatteryCharging,
      badge: activeSession ? 1 : undefined,
    },
    { id: 'wallet', label: 'Wallet & Coins', icon: Wallet },
    { id: 'booking', label: 'Reserve a Locker', icon: Zap },
    { id: 'kiosk', label: 'Kiosk Scanner', icon: ScanLine },
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
    if (nextSection === 'kiosk') {
      navigate('/kiosk');
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

  const renderSidebarContent = (showBrandHeader: boolean) => (
    <div className="flex flex-col min-h-full bg-[#FFFFFF] text-[#1E293B] select-none">
      {/* Drawer Header shown only in slide-over mobile/tablet drawer (desktop top bar already shows brand) */}
      {showBrandHeader && (
        <div className="px-4 py-3.5 pr-12 border-b border-[#E2E8F0] shrink-0">
          <UniChargeLogo
            variant="horizontal"
            size="sm"
            subtitle={isAdmin ? 'Admin Portal' : 'Student Portal'}
          />
        </div>
      )}

      {/* Main Navigation Links */}
      <nav className="px-3 pt-4 pb-3 space-y-1 shrink-0">
        <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
          {isAdmin ? 'ADMINISTRATION' : 'NAVIGATION'}
        </div>

        {(isAdmin ? adminNavItems : studentNavItems).map((item) => {
          const Icon = item.icon;
          const isActive =
            !showProfileView &&
            (isAdmin ? adminSection === item.id : studentSection === item.id);

          return (
            <button
              key={item.id}
              onClick={() => handleSelectNav(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
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

      {/* ACCOUNT Section */}
      <div className="px-3 pt-3 pb-4 border-t border-[#E2E8F0] space-y-1 shrink-0">
        <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
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
      <header className="sticky top-0 z-30 h-16 shrink-0 bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 lg:px-6 flex items-center justify-between gap-4">
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
              {((isAdmin && unresolvedCount > 0) ||
                (!isAdmin && (unreadNotificationCount > 0 || activeSession))) && (
                <span
                  className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center absolute -top-0.5 -right-0.5 ring-2 ring-white ${
                    !isAdmin &&
                    notifications.some(
                      (n) => !n.read && n.type === 'unexpected_door_open'
                    )
                      ? 'bg-[#DC2626] text-white animate-pulse'
                      : 'bg-[#5BC496] text-[#1E293B]'
                  }`}
                >
                  {isAdmin
                    ? unresolvedCount
                    : unreadNotificationCount > 0
                    ? unreadNotificationCount
                    : '•'}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-2xl p-4 z-50">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0] gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#4E6E81]">Notifications</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isFirestoreLive
                          ? 'bg-[#EBF9F3] text-[#1E293B]'
                          : 'bg-[#EDF2F5] text-[#64748B]'
                      }`}
                    >
                      {isFirestoreLive ? 'Firestore Live' : 'Local Alerts'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {!isAdmin && unreadNotificationCount > 0 && (
                      <button
                        type="button"
                        onClick={() => void markAllNotificationsRead()}
                        className="text-[11px] font-semibold text-[#4E6E81] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNotifs(false)}
                      className="text-xs text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="py-2 space-y-2 text-xs max-h-80 overflow-y-auto">
                  {isAdmin ? (
                    securityAlerts.slice(0, 5).map((al) => (
                      <div key={al.id} className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                        <span className="font-semibold text-[#1E293B] block">{al.type}</span>
                        <span className="text-[#64748B] text-[11px]">
                          {al.stationCode} · {formatCompartmentLabel(al.slotNumber)} · {al.timestamp}
                        </span>
                      </div>
                    ))
                  ) : notifications.length === 0 ? (
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center space-y-1">
                      <span className="font-semibold text-[#1E293B] block">
                        {activeSession
                          ? `${formatCompartmentLabel(activeSession.slotNumber)} Charging (${activeSession.batteryCurrent}%)`
                          : 'No real-time alerts yet'}
                      </span>
                      <span className="text-[#64748B] text-[11px] block">
                        You will be alerted instantly when battery reaches 100% or if a locker door opens unexpectedly.
                      </span>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => {
                      const isCritical = n.type === 'unexpected_door_open';
                      return (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl border transition-colors ${
                            isCritical
                              ? n.read
                                ? 'bg-red-50/40 border-red-200/70'
                                : 'bg-red-50 border-[#DC2626]/50'
                              : n.read
                              ? 'bg-[#F8FAFC] border-[#E2E8F0]'
                              : 'bg-[#EBF9F3] border-[#5BC496]/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              {isCritical ? (
                                <ShieldAlert className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                              ) : (
                                <BatteryCharging className="w-4 h-4 text-[#5BC496] shrink-0 mt-0.5" />
                              )}
                              <div className="min-w-0">
                                <span className="font-bold text-[#1E293B] block truncate">
                                  {n.title}
                                </span>
                                <p className="text-[11px] text-[#475569] leading-snug mt-0.5">
                                  {n.message}
                                </p>
                                <span className="text-[10px] font-mono text-[#64748B] mt-1 block">
                                  {n.stationCode} · {formatCompartmentLabel(n.slotNumber)} ·{' '}
                                  {new Date(n.createdAtMs).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!n.read && (
                                <button
                                  type="button"
                                  title="Mark as read"
                                  onClick={() => void markNotificationRead(n.id)}
                                  className="w-6 h-6 rounded-lg bg-white border border-[#E2E8F0] text-[#4E6E81] hover:text-[#5BC496] flex items-center justify-center cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                title="Delete notification"
                                onClick={() => void deleteNotification(n.id)}
                                className="w-6 h-6 rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#DC2626] flex items-center justify-center cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
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
      <div className="flex-1 flex items-start relative">
        {/* Desktop Collapsible Sticky Sidebar */}
        <aside
          aria-label="Sidebar Navigation"
          aria-hidden={!sidebarOpen}
          className={`hidden lg:block shrink-0 bg-[#FFFFFF] border-r border-[#E2E8F0] sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden transition-[width] duration-200 ${
            sidebarOpen ? 'w-64' : 'w-0 border-r-0 pointer-events-none'
          }`}
        >
          <div className="w-64 min-h-full">
            {renderSidebarContent(false)}
          </div>
        </aside>

        {/* Mobile Slide-Over Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />
            <div className="relative w-64 max-w-[80vw] h-full bg-[#FFFFFF] border-r border-[#E2E8F0] shadow-2xl z-10 flex flex-col overflow-y-auto">
              <button
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close sidebar"
                className="absolute top-3.5 right-3 z-20 w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#EDF2F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              {renderSidebarContent(true)}
            </div>
          </div>
        )}

        {/* Main Content Canvas */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Real-Time Firestore Snapshot Toast Stack */}
          {!isAdmin && liveToastNotifications.length > 0 && (
            <div
              aria-live="assertive"
              className="fixed top-20 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] space-y-2.5 pointer-events-none"
            >
              {liveToastNotifications.map((toast) => {
                const isCritical = toast.type === 'unexpected_door_open';
                return (
                  <div
                    key={toast.id}
                    role="alert"
                    className={`pointer-events-auto rounded-2xl border shadow-2xl p-4 bg-[#FFFFFF] flex items-start gap-3 ${
                      isCritical
                        ? 'border-[#DC2626] border-l-4 border-l-[#DC2626]'
                        : 'border-[#5BC496] border-l-4 border-l-[#5BC496]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCritical ? 'bg-red-50 text-[#DC2626]' : 'bg-[#EBF9F3] text-[#4E6E81]'
                      }`}
                    >
                      {isCritical ? (
                        <ShieldAlert className="w-5 h-5 text-[#DC2626]" />
                      ) : (
                        <BatteryCharging className="w-5 h-5 text-[#5BC496]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isCritical ? 'text-[#DC2626]' : 'text-[#5BC496]'
                          }`}
                        >
                          {isCritical ? 'Security Alert · Live' : 'Charging Complete · Live'}
                        </span>
                        <button
                          type="button"
                          onClick={() => dismissLiveToast(toast.id)}
                          aria-label="Dismiss live alert"
                          className="text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4 className="text-xs font-bold text-[#1E293B] mt-0.5">{toast.title}</h4>
                      <p className="text-[11px] text-[#475569] mt-0.5 leading-snug">
                        {toast.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            void markNotificationRead(toast.id);
                            handleStudentSectionChange(isCritical ? 'kiosk' : 'sessions');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            isCritical
                              ? 'bg-[#DC2626] text-white hover:bg-red-700'
                              : 'bg-[#4E6E81] text-white hover:bg-[#3D5767]'
                          }`}
                        >
                          {isCritical ? 'Check Kiosk' : 'Retrieve Device'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void markNotificationRead(toast.id)}
                          className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[11px] font-semibold text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                        >
                          Mark Read
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
