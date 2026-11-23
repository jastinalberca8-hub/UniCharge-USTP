import React, { useState } from 'react';
import QRCode from 'qrcode';
import { useUniCharge } from '../../context/UniChargeContext';
import {
  CHARGING_SLOT_COUNT,
  STORAGE_SLOT_COUNT,
  TOTAL_COMPARTMENT_COUNT,
  formatCompartmentCode,
  formatCompartmentLabel,
  getTiersForService,
} from '../../constants/pricing';
import { sound } from '../../utils/audio';
import { formatDuration } from '../../utils/format';
import { LockerSlot, ServiceType, SessionHistoryItem } from '../../types';
import {
  Zap,
  BatteryCharging,
  Clock,
  Lock,
  Unlock,
  Plus,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Package,
  Power,
  Fingerprint,
  Bell,
  PhoneCall,
  Download,
  AlertTriangle,
  RotateCcw,
  ScanLine,
  Mail,
  Loader2,
  X,
} from 'lucide-react';
import { KioskHardwareSimulator } from '../hardware/KioskHardwareSimulator';
import { QrMatrixSvg } from '../hardware/QrMatrixSvg';

export type StudentSection =
  | 'dashboard'
  | 'sessions'
  | 'wallet'
  | 'booking'
  | 'kiosk'
  | 'settings'
  | 'support';

interface StudentPortalViewProps {
  section: StudentSection;
  onChangeSection: (section: StudentSection) => void;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  section,
  onChangeSection,
}) => {
  const {
    student,
    stations,
    selectedStation,
    selectedSlot,
    setSelectedSlot,
    selectedService,
    setSelectedService,
    selectedTier,
    setSelectedTier,
    activeSession,
    pendingUnlockToken,
    pendingSecondsLeft,
    sessionHistory,
    generateUnlockToken,
    regenerateUnlockToken,
    resendUnlockQrEmail,
    cancelPendingUnlock,
    endActiveSession,
    topUpWallet,
    toggleBiometrics,
    togglePushNotifications,
    toggleOverchargeProtection,
    triggerSimulatedTamper,
    simulateFullCharge,
    triggerUnexpectedDoorOpen,
    notifications,
    isFirestoreLive,
    markNotificationRead,
  } = useUniCharge();

  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'gcash' | 'maya' | 'cash'>('wallet');
  const [bookingMessage, setBookingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isResendingQrEmail, setIsResendingQrEmail] = useState(false);
  const [resendStatusMessage, setResendStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<SessionHistoryItem | null>(null);

  const station = stations[0] || selectedStation;
  const chargingSlots = station.slots.filter((s) => s.category === 'charging');
  const storageSlots = station.slots.filter((s) => s.category === 'storage');
  const chargingFreeCount = chargingSlots.filter((s) => s.status === 'available').length;
  const storageFreeCount = storageSlots.filter((s) => s.status === 'available').length;

  const formatTimer = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const openBookingWithSlot = (slot?: LockerSlot) => {
    sound.playTap();
    if (slot) {
      setSelectedService(slot.category);
      if (slot.status === 'available') {
        setSelectedSlot(slot);
      }
    } else {
      const firstFree =
        station.slots.find(
          (s) => s.status === 'available' && s.category === selectedService
        ) ||
        station.slots.find((s) => s.status === 'available') ||
        null;
      if (firstFree) {
        setSelectedService(firstFree.category);
        setSelectedSlot(firstFree);
      }
    }
    setBookingMessage(null);
    onChangeSection('booking');
  };

  const activeTiers = getTiersForService(selectedService);
  const effectiveTier =
    selectedTier.serviceType === selectedService ? selectedTier : activeTiers[0];
  const totalFee = effectiveTier.fee;

  const visibleCompartments = station.slots.filter(
    (s) => s.category === selectedService
  );
  const activeCompartment =
    selectedSlot &&
    selectedSlot.category === selectedService &&
    selectedSlot.status === 'available'
      ? selectedSlot
      : visibleCompartments.find((s) => s.status === 'available') || null;

  const handleConfirmUnlock = async () => {
    if (isGeneratingQr) return;
    setIsGeneratingQr(true);
    setResendStatusMessage(null);
    try {
      const res = await generateUnlockToken(paymentMethod);
      if (res.success) {
        setBookingMessage({ type: 'success', text: res.message });
        setShowQrModal(true);
      } else {
        setBookingMessage({ type: 'error', text: res.message });
      }
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const handleResendQrEmail = async () => {
    if (isResendingQrEmail) return;
    setIsResendingQrEmail(true);
    setResendStatusMessage(null);
    try {
      const res = await resendUnlockQrEmail();
      setResendStatusMessage({
        type: res.success ? 'success' : 'error',
        text: res.message,
      });
    } finally {
      setIsResendingQrEmail(false);
    }
  };

  const handleDownloadQrPng = async () => {
    if (!pendingUnlockToken) return;
    sound.playTap();
    try {
      const dataUrl = await QRCode.toDataURL(pendingUnlockToken.qrPayload, {
        width: 400,
        margin: 4,
        errorCorrectionLevel: 'M',
        color: { dark: '#1E293B', light: '#FFFFFF' },
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `unicharge-${pendingUnlockToken.stationCode.toLowerCase()}-slot-${formatCompartmentCode(
        pendingUnlockToken.slotNumber
      )}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to generate downloadable QR PNG:', err);
    }
  };

  const renderSection = () => {
    // 1. DASHBOARD OVERVIEW
    if (section === 'dashboard') {
      return (
        <div className="space-y-6">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight">
                Welcome back, <span className="text-[#4E6E81]">{student.name.split(' ')[0]}</span>
              </h1>
              <p className="text-sm text-[#64748B] mt-0.5">
                {student.college}
                {student.degree ? ` · ${student.degree}` : ''} · Student ID{' '}
                <span className="font-mono text-[#1E293B]">{student.studentIdNumber}</span>
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  sound.playTap();
                  onChangeSection('kiosk');
                }}
                className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-xs font-semibold text-[#1E293B] hover:bg-[#EDF2F5] flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ScanLine className="w-4 h-4 text-[#4E6E81]" />
                <span>Kiosk Scanner</span>
              </button>
              <button
                onClick={() => openBookingWithSlot()}
                className="px-4 py-2 rounded-xl bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
              >
                <Zap className="w-4 h-4 text-[#5BC496] fill-[#5BC496]" />
                <span>Avail a Locker</span>
              </button>
            </div>
          </div>

          {/* Real-Time Firestore Snapshot Dashboard Alerts */}
          {notifications.filter((n) => !n.read).length > 0 && (
            <div className="space-y-2.5">
              {notifications
                .filter((n) => !n.read)
                .slice(0, 3)
                .map((notif) => {
                  const isCritical = notif.type === 'unexpected_door_open';
                  return (
                    <div
                      key={notif.id}
                      role="alert"
                      className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
                        isCritical
                          ? 'bg-red-50 border-[#DC2626] text-[#1E293B]'
                          : 'bg-[#EBF9F3] border-[#5BC496] text-[#1E293B]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isCritical ? 'bg-white text-[#DC2626]' : 'bg-white text-[#5BC496]'
                          }`}
                        >
                          {isCritical ? (
                            <AlertTriangle className="w-5 h-5" />
                          ) : (
                            <BatteryCharging className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-[#1E293B]">
                              {notif.title}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                isCritical
                                  ? 'bg-[#DC2626] text-white'
                                  : 'bg-[#5BC496] text-[#1E293B]'
                              }`}
                            >
                              {isFirestoreLive ? 'Firestore Live' : 'Live Alert'}
                            </span>
                          </div>
                          <p className="text-xs text-[#334155] mt-0.5">{notif.message}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            void markNotificationRead(notif.id);
                            onChangeSection(isCritical ? 'kiosk' : 'sessions');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                            isCritical
                              ? 'bg-[#DC2626] text-white hover:bg-red-700'
                              : 'bg-[#4E6E81] text-white hover:bg-[#3D5767]'
                          }`}
                        >
                          {isCritical ? 'Inspect Kiosk' : 'Retrieve Device'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void markNotificationRead(notif.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0]">
              <span className="text-xs font-medium text-[#64748B]">Campus E-Wallet</span>
              <div className="text-2xl font-bold text-[#1E293B] font-mono mt-1">
                ₱{student.walletBalance.toFixed(2)}
              </div>
              <button
                onClick={() => onChangeSection('wallet')}
                className="text-xs font-semibold text-[#4E6E81] hover:text-[#5BC496] mt-2 inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Reload ₱ balance</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0]">
              <span className="text-xs font-medium text-[#64748B]">Active Locker Session</span>
              <div className="text-2xl font-bold text-[#4E6E81] font-mono mt-1">
                {activeSession ? formatCompartmentLabel(activeSession.slotNumber) : 'None'}
              </div>
              <span className="text-xs text-[#64748B] mt-2 block truncate">
                {activeSession
                  ? `${activeSession.pricingTier} · ${formatTimer(activeSession.remainingSeconds)} left`
                  : 'Ready to avail a compartment'}
              </span>
            </div>

            <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0]">
              <span className="text-xs font-medium text-[#64748B]">{station.name}</span>
              <div className="text-2xl font-bold text-[#5BC496] font-mono mt-1">
                {station.availableSlots} / {TOTAL_COMPARTMENT_COUNT} Free
              </div>
              <span className="text-xs text-[#64748B] mt-2 block">
                {chargingFreeCount}/{CHARGING_SLOT_COUNT} Charging · {storageFreeCount}/{STORAGE_SLOT_COUNT} Storage
              </span>
            </div>

            <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0]">
              <span className="text-xs font-medium text-[#64748B]">Completed Sessions</span>
              <div className="text-2xl font-bold text-[#1E293B] font-mono mt-1">
                {sessionHistory.length}
              </div>
              <button
                onClick={() => onChangeSection('sessions')}
                className="text-xs font-semibold text-[#4E6E81] hover:text-[#5BC496] mt-2 inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View receipts</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Active Session + Single Station 20 Compartments Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 5 cols: Active Session Live Card */}
            <div className="lg:col-span-5 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#4E6E81]">Live Session Telemetry</h2>
                {activeSession && (
                  <span className="text-xs font-semibold text-[#1E293B] bg-[#EBF9F3] border border-[#5BC496]/40 px-2.5 py-0.5 rounded-md">
                    {activeSession.serviceType === 'storage' ? 'Storage Active' : 'Charging Active'}
                  </span>
                )}
              </div>

              {activeSession ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#4E6E81] text-white flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-100/90 block">{activeSession.stationName}</span>
                      <span className="text-2xl font-bold font-mono text-[#5BC496] mt-0.5 block">
                        {formatTimer(activeSession.remainingSeconds)}
                      </span>
                      <span className="text-[11px] text-slate-100/80 font-mono">
                        {formatCompartmentLabel(activeSession.slotNumber)} · {activeSession.pricingTier}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-100/90 block">Battery</span>
                      <span className="text-2xl font-bold font-mono text-[#5BC496]">
                        {activeSession.batteryCurrent}%
                      </span>
                      <span className="text-[11px] text-slate-100/80 font-mono">
                        {activeSession.serviceType === 'storage'
                          ? 'Solenoid Locked'
                          : `${activeSession.chargingRateWatts}W USB-C PD`}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <span className="text-[#64748B] block">Solenoid Latch</span>
                      <span className="font-semibold text-[#1E293B] flex items-center gap-1 mt-1">
                        <Lock className="w-3.5 h-3.5 text-[#5BC496]" /> Locked &amp; Armed
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <span className="text-[#64748B] block">Overcharge Guard</span>
                      <span className="font-semibold text-[#4E6E81] flex items-center gap-1 mt-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#5BC496]" />
                        {activeSession.isOverchargeProtectionActive ? 'Enabled (100%)' : 'Manual'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onChangeSection('sessions')}
                      className="flex-1 h-10 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#4E6E81] hover:bg-[#EDF2F5] cursor-pointer transition-colors"
                    >
                      Open Full Telemetry
                    </button>
                    <button
                      type="button"
                      onClick={() => void simulateFullCharge()}
                      className="h-10 px-3 rounded-xl bg-[#EBF9F3] border border-[#5BC496]/50 text-[11px] font-bold text-[#1E293B] hover:bg-[#5BC496]/20 cursor-pointer transition-colors"
                    >
                      Simulate 100%
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void triggerUnexpectedDoorOpen(
                          activeSession.stationId,
                          activeSession.slotNumber
                        )
                      }
                      className="h-10 px-3 rounded-xl bg-red-50 border border-red-200 text-[11px] font-bold text-[#DC2626] hover:bg-red-100 cursor-pointer transition-colors"
                    >
                      Test Door Open
                    </button>
                    <button
                      onClick={() => setShowEndConfirm(true)}
                      className="flex-1 h-10 rounded-xl bg-[#DC2626] text-white text-xs font-semibold hover:bg-red-700 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Unlock &amp; Retrieve</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <BatteryCharging className="w-10 h-10 text-[#64748B]/40 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-[#1E293B]">No active locker session</p>
                  <p className="text-xs text-[#64748B] mt-1 mb-4">
                    Select any free charging or storage compartment at {station.name} to start a session.
                  </p>
                  <button
                    onClick={() => openBookingWithSlot()}
                    className="px-4 py-2 rounded-xl bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] cursor-pointer transition-colors"
                  >
                    Avail a Locker
                  </button>
                </div>
              )}
            </div>

            {/* Right 7 cols: Single UniCharge Station 20 Compartments Live Status */}
            <div className="lg:col-span-7 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#4E6E81]">
                    {station.name} — Live Compartments
                  </h2>
                  <p className="text-xs text-[#64748B] font-mono">
                    {station.campusCode} · {CHARGING_SLOT_COUNT} Charging (#01–#15) · {STORAGE_SLOT_COUNT} Storage (S1–S5)
                  </p>
                </div>
                <button
                  onClick={() => openBookingWithSlot()}
                  className="text-xs font-semibold text-[#4E6E81] hover:text-[#5BC496] cursor-pointer transition-colors"
                >
                  Avail Compartment →
                </button>
              </div>

              {/* Charging Compartments 01-15 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1E293B] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#5BC496]" />
                    Charging Compartments (01–15)
                  </span>
                  <span className="font-mono text-[#4E6E81] font-semibold">
                    {chargingFreeCount}/{CHARGING_SLOT_COUNT} Free · ₱10–₱20
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {chargingSlots.map((slot) => {
                    const isFree = slot.status === 'available';
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!isFree}
                        onClick={() => openBookingWithSlot(slot)}
                        className={`p-2 rounded-xl border text-center font-mono text-xs transition-all ${
                          isFree
                            ? 'bg-[#EBF9F3] border-[#5BC496]/50 text-[#1E293B] hover:border-[#4E6E81] cursor-pointer'
                            : slot.status === 'in_use'
                            ? 'bg-amber-50 border-[#F59E0B]/40 text-amber-800 cursor-not-allowed'
                            : 'bg-red-50 border-red-200 text-[#DC2626] cursor-not-allowed opacity-75'
                        }`}
                      >
                        <div className="font-bold">#{slot.code}</div>
                        <div className="text-[10px] uppercase">
                          {isFree ? 'Free' : slot.status === 'in_use' ? 'Busy' : 'Maint'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Storage Compartments S1-S5 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1E293B] flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#4E6E81]" />
                    Storage Compartments (S1–S5)
                  </span>
                  <span className="font-mono text-[#4E6E81] font-semibold">
                    {storageFreeCount}/{STORAGE_SLOT_COUNT} Free · ₱10–₱40
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {storageSlots.map((slot) => {
                    const isFree = slot.status === 'available';
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!isFree}
                        onClick={() => openBookingWithSlot(slot)}
                        className={`p-2.5 rounded-xl border text-center font-mono text-xs transition-all ${
                          isFree
                            ? 'bg-[#EDF2F5] border-[#4E6E81]/30 text-[#1E293B] hover:border-[#4E6E81] cursor-pointer'
                            : slot.status === 'in_use'
                            ? 'bg-amber-50 border-[#F59E0B]/40 text-amber-800 cursor-not-allowed'
                            : 'bg-red-50 border-red-200 text-[#DC2626] cursor-not-allowed opacity-75'
                        }`}
                      >
                        <div className="font-bold">{slot.code}</div>
                        <div className="text-[10px] uppercase">
                          {isFree ? 'Free' : slot.status === 'in_use' ? 'Busy' : 'Maint'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Unlock Confirmation Modal */}
          {showEndConfirm && activeSession && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 overflow-y-auto">
              <div className="w-full max-w-sm my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 shadow-xl">
                <h3 className="text-base font-bold text-[#1E293B]">
                  Unlock {formatCompartmentLabel(activeSession.slotNumber)}?
                </h3>
                <p className="text-xs text-[#64748B] mt-1 mb-5">
                  This will release the electronic solenoid deadbolt at{' '}
                  <strong className="text-[#1E293B]">{activeSession.stationName}</strong> and end your session.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    className="flex-1 h-10 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
                  >
                    Keep Session Active
                  </button>
                  <button
                    onClick={() => {
                      endActiveSession();
                      setShowEndConfirm(false);
                    }}
                    className="flex-1 h-10 rounded-xl bg-[#DC2626] text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
                  >
                    Confirm &amp; Unlock
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 2. LOCKER BOOKING & QR UNLOCK
    if (section === 'booking') {
      return (
        <div className="max-w-4xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">Avail a Locker</h1>
            <p className="text-sm text-[#64748B]">
              {station.name} ({station.campusCode}) · {CHARGING_SLOT_COUNT} Charging &amp; {STORAGE_SLOT_COUNT} Storage Compartments
            </p>
          </div>

          {pendingUnlockToken && (
            <div className="p-4 rounded-2xl bg-[#EBF9F3] border border-[#5BC496] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <QrCode className="w-5 h-5 text-[#4E6E81] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-[#1E293B] block">
                    Pending Kiosk Scan · {formatCompartmentLabel(pendingUnlockToken.slotNumber)} ({pendingUnlockToken.pricingTier})
                  </span>
                  <span className="text-xs text-[#64748B]">
                    PIN <strong className="font-mono text-[#1E293B]">{pendingUnlockToken.pinCode}</strong> ·{' '}
                    <strong className="font-mono text-[#4E6E81]">
                      {pendingSecondsLeft > 0 ? `${formatTimer(pendingSecondsLeft)} remaining` : 'Expired'}
                    </strong>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] cursor-pointer"
                >
                  Show Unlock QR
                </button>
                <button
                  onClick={() => onChangeSection('kiosk')}
                  className="px-3 py-1.5 rounded-lg bg-[#5BC496] text-[#1E293B] text-xs font-bold hover:bg-[#48AD80] cursor-pointer"
                >
                  Open Kiosk Scanner
                </button>
                <button
                  onClick={cancelPendingUnlock}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#64748B] hover:text-[#DC2626] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {bookingMessage && (
            <div
              className={`p-4 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                bookingMessage.type === 'success'
                  ? 'bg-[#EBF9F3] border-[#5BC496]/40 text-[#1E293B]'
                  : 'bg-red-50 border-red-200 text-[#DC2626]'
              }`}
            >
              {bookingMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#5BC496] shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
              )}
              <span>{bookingMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-5 bg-[#FFFFFF] p-6 rounded-2xl border border-[#E2E8F0]">
              {/* 1. Service Type */}
              <div>
                <label className="block text-xs font-bold text-[#1E293B] uppercase tracking-wider mb-2">
                  1. Service Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['charging', 'storage'] as ServiceType[]).map((svc) => (
                    <button
                      key={svc}
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setSelectedService(svc);
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedService === svc
                          ? 'bg-[#4E6E81] text-white border-[#4E6E81]'
                          : 'bg-[#F8FAFC] text-[#1E293B] border-[#E2E8F0] hover:bg-[#EDF2F5]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        {svc === 'charging' ? (
                          <Zap className="w-4 h-4 text-[#5BC496]" />
                        ) : (
                          <Package className="w-4 h-4 text-[#5BC496]" />
                        )}
                        <span
                          className={`text-[11px] font-mono font-bold ${
                            selectedService === svc ? 'text-[#5BC496]' : 'text-[#4E6E81]'
                          }`}
                        >
                          {svc === 'charging'
                            ? `${chargingFreeCount}/15 Free`
                            : `${storageFreeCount}/5 Free`}
                        </span>
                      </div>
                      <div className="text-sm font-bold capitalize">{svc}</div>
                      <span
                        className={`text-[11px] block mt-0.5 ${
                          selectedService === svc ? 'text-slate-200' : 'text-[#64748B]'
                        }`}
                      >
                        {svc === 'charging'
                          ? 'Compartments #01–#15 · ₱10–₱20'
                          : 'Compartments S1–S5 · ₱10–₱40'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Pricing Tier & Usage Duration */}
              <div>
                <label className="block text-xs font-bold text-[#1E293B] uppercase tracking-wider mb-2">
                  2. Pricing Tier &amp; Usage Duration
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeTiers.map((tier) => {
                    const isSelected = effectiveTier.id === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => {
                          sound.playTap();
                          setSelectedTier(tier);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#EDF2F5] border-[#4E6E81] text-[#1E293B] ring-1 ring-[#4E6E81]/30'
                            : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#1E293B] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-[#4E6E81]">{tier.name}</span>
                          <span className="font-mono text-sm font-bold text-[#1E293B]">
                            ₱{tier.fee}
                          </span>
                        </div>
                        <div className="text-xs font-mono font-semibold text-[#5BC496] mt-0.5">
                          {tier.durationLabel}
                        </div>
                        <span className="text-[11px] text-[#64748B] block mt-1">
                          {tier.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Compartment Picker */}
              <div>
                <label className="block text-xs font-bold text-[#1E293B] uppercase tracking-wider mb-2">
                  3. Select {selectedService === 'charging' ? 'Charging' : 'Storage'} Compartment
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {visibleCompartments.map((slot) => {
                    const isSel = activeCompartment?.slotNumber === slot.slotNumber;
                    const isFree = slot.status === 'available';
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!isFree}
                        onClick={() => {
                          sound.playTap();
                          setSelectedSlot(slot);
                        }}
                        className={`p-2.5 rounded-xl border text-center font-mono text-xs transition-all ${
                          isSel
                            ? 'bg-[#4E6E81] text-white border-[#4E6E81] font-bold'
                            : isFree
                            ? 'bg-[#EBF9F3] border-[#5BC496]/40 text-[#1E293B] hover:border-[#4E6E81] cursor-pointer'
                            : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div>{slot.category === 'charging' ? `#${slot.code}` : slot.code}</div>
                        <div className="text-[10px] mt-0.5">
                          {isSel ? 'Selected' : isFree ? 'Free' : slot.status === 'in_use' ? 'Busy' : 'Maint'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Summary & Payment Column */}
            <div className="lg:col-span-5 bg-[#FFFFFF] p-6 rounded-2xl border border-[#E2E8F0] space-y-4">
              <h3 className="text-base font-bold text-[#4E6E81]">Payment &amp; Solenoid Release</h3>
              <div className="space-y-2 text-xs border-b border-[#E2E8F0] pb-4">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Station</span>
                  <span className="font-semibold text-[#1E293B]">{station.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Tier</span>
                  <span className="font-semibold text-[#1E293B]">{effectiveTier.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Compartment</span>
                  <span className="font-mono font-semibold text-[#1E293B]">
                    {activeCompartment
                      ? formatCompartmentLabel(activeCompartment.slotNumber)
                      : 'None free'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Usage Duration</span>
                  <span className="font-mono font-semibold text-[#1E293B]">
                    {effectiveTier.durationLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Total Fee</span>
                  <span className="font-mono text-lg font-bold text-[#4E6E81]">₱{totalFee}.00</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#1E293B]">Payment Method</label>
                {(
                  [
                    { id: 'wallet', label: `Campus E-Wallet (₱${student.walletBalance.toFixed(2)})` },
                    { id: 'gcash', label: 'GCash Digital Wallet' },
                    { id: 'maya', label: 'Maya Wallet' },
                    { id: 'cash', label: 'Kiosk Coin / Cash Slot' },
                  ] as const
                ).map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setPaymentMethod(pm.id);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                      paymentMethod === pm.id
                        ? 'bg-[#EDF2F5] border-[#4E6E81] text-[#4E6E81] font-semibold'
                        : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#1E293B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <span>{pm.label}</span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border ${
                        paymentMethod === pm.id ? 'bg-[#5BC496] border-[#4E6E81]' : 'border-[#E2E8F0]'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void handleConfirmUnlock()}
                disabled={isGeneratingQr || !activeCompartment}
                className="w-full h-11 rounded-xl bg-[#4E6E81] text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#3D5767] disabled:opacity-60 cursor-pointer shadow-sm transition-colors"
              >
                {isGeneratingQr ? (
                  <Loader2 className="w-4 h-4 text-[#5BC496] animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4 text-[#5BC496]" />
                )}
                <span>
                  {isGeneratingQr
                    ? 'Generating & Emailing QR Pass...'
                    : `Authorize & Generate Unlock QR (₱${totalFee})`}
                </span>
              </button>
              <p className="text-[11px] text-[#64748B] text-center leading-relaxed">
                Generates a 5-minute single-use QR pass &amp; backup PIN and emails a scannable QR copy to {student.email}.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // 3. MY SESSIONS & HISTORY
    if (section === 'sessions') {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">My Charging &amp; Storage Sessions</h1>
            <p className="text-sm text-[#64748B]">Live locker telemetry, tamper controls, and past session receipts.</p>
          </div>

          {activeSession ? (
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1E293B] mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#5BC496] animate-pulse" />
                    <span>Session {activeSession.sessionId}</span>
                  </div>
                  <h2 className="text-lg font-bold text-[#4E6E81]">
                    {activeSession.stationName} — {formatCompartmentLabel(activeSession.slotNumber)}
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    {activeSession.pricingTier} · ₱{activeSession.totalFee}.00 Paid
                  </p>
                </div>
                <button
                  onClick={() => setShowEndConfirm(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#DC2626] text-white text-xs font-semibold hover:bg-red-700 flex items-center gap-2 cursor-pointer shrink-0 transition-colors"
                >
                  <Unlock className="w-4 h-4" />
                  <span>End Session &amp; Unlock Locker</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5">
                <div className="p-4 rounded-xl bg-[#4E6E81] text-white">
                  <span className="text-xs text-slate-100 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#5BC496]" /> Time Remaining
                  </span>
                  <span className="text-3xl font-bold font-mono text-[#5BC496] mt-1 block">
                    {formatTimer(activeSession.remainingSeconds)}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-xs text-[#64748B] flex items-center gap-1.5">
                    <BatteryCharging className="w-3.5 h-3.5 text-[#5BC496]" /> Device Charge
                  </span>
                  <span className="text-3xl font-bold font-mono text-[#1E293B] mt-1 block">
                    {activeSession.batteryCurrent}%
                  </span>
                  <span className="text-xs text-[#64748B] font-mono">
                    {activeSession.serviceType === 'storage'
                      ? 'Secure storage locked'
                      : `${activeSession.chargingRateWatts}W PD active`}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E2E8F0]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={toggleOverchargeProtection}
                    className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#1E293B] hover:bg-[#EDF2F5] flex items-center gap-2 cursor-pointer"
                  >
                    <Power className="w-3.5 h-3.5 text-[#4E6E81]" />
                    <span>
                      Overcharge Auto Cut-Off: {activeSession.isOverchargeProtectionActive ? 'ON' : 'OFF'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void simulateFullCharge()}
                    className="px-3.5 py-2 rounded-xl border border-[#5BC496]/50 bg-[#EBF9F3] text-xs font-semibold text-[#1E293B] hover:bg-[#5BC496]/20 flex items-center gap-2 cursor-pointer"
                  >
                    <BatteryCharging className="w-3.5 h-3.5 text-[#5BC496]" />
                    <span>Simulate 100% Charge</span>
                  </button>
                  <button
                    onClick={triggerSimulatedTamper}
                    className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 text-xs font-semibold text-[#DC2626] hover:bg-red-100 flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#DC2626]" />
                    <span>Simulate Unexpected Door Open</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-8 text-center">
              <p className="text-sm font-semibold text-[#1E293B]">No active session right now</p>
              <p className="text-xs text-[#64748B] mt-1 mb-4">
                Avail any available charging or storage compartment to begin.
              </p>
              <button
                onClick={() => openBookingWithSlot()}
                className="px-4 py-2 rounded-xl bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] cursor-pointer"
              >
                Avail a Locker
              </button>
            </div>
          )}

          {/* History Table */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#4E6E81]">Past Session History</h3>
              <span className="text-xs text-[#64748B] font-mono">{sessionHistory.length} records</span>
            </div>
            <div className="overflow-x-auto">
              {sessionHistory.length === 0 ? (
                <div className="py-10 px-6 text-center text-xs text-[#64748B]">
                  No completed sessions yet. Avail a locker to view your receipts here.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-6 font-semibold">Receipt</th>
                      <th className="py-3 px-4 font-semibold">Tier</th>
                      <th className="py-3 px-4 font-semibold">Compartment</th>
                      <th className="py-3 px-4 font-semibold">Duration</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-6 font-semibold text-right">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {sessionHistory.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedReceipt(item)}
                        className="hover:bg-[#F8FAFC] cursor-pointer"
                      >
                        <td className="py-3 px-6 font-mono font-semibold text-[#4E6E81]">{item.receiptNumber}</td>
                        <td className="py-3 px-4 text-[#1E293B] font-medium">{item.pricingTier}</td>
                        <td className="py-3 px-4 font-mono">{formatCompartmentLabel(item.slotNumber)}</td>
                        <td className="py-3 px-4 font-mono">{formatDuration(item.durationMinutes)}</td>
                        <td className="py-3 px-4 text-[#64748B]">{item.date}</td>
                        <td className="py-3 px-6 text-right font-mono font-bold text-[#4E6E81]">₱{item.totalFee}.00</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Receipt Modal */}
          {selectedReceipt && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 overflow-y-auto">
              <div className="w-full max-w-sm my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                  <div>
                    <span className="text-[11px] font-semibold text-[#4E6E81] uppercase">Official E-Receipt</span>
                    <h4 className="text-sm font-bold font-mono text-[#1E293B]">{selectedReceipt.receiptNumber}</h4>
                  </div>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="text-xs text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-[#64748B]">Station</span><span className="font-semibold text-[#1E293B]">{selectedReceipt.stationName}</span></div>
                  <div className="flex justify-between"><span className="text-[#64748B]">Tier</span><span className="font-semibold text-[#1E293B]">{selectedReceipt.pricingTier}</span></div>
                  <div className="flex justify-between"><span className="text-[#64748B]">Compartment</span><span className="font-mono text-[#1E293B]">{formatCompartmentLabel(selectedReceipt.slotNumber)}</span></div>
                  <div className="flex justify-between"><span className="text-[#64748B]">Duration</span><span className="font-mono text-[#1E293B]">{formatDuration(selectedReceipt.durationMinutes)}</span></div>
                  <div className="flex justify-between"><span className="text-[#64748B]">Date</span><span className="font-mono text-[#1E293B]">{selectedReceipt.date}</span></div>
                  <div className="flex justify-between"><span className="text-[#64748B]">Amount Paid</span><span className="font-mono font-bold text-[#4E6E81]">₱{selectedReceipt.totalFee}.00</span></div>
                </div>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="w-full h-10 rounded-xl bg-[#4E6E81] text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#3D5767] cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#5BC496]" />
                  <span>Done</span>
                </button>
              </div>
            </div>
          )}

          {/* End Session Confirm */}
          {showEndConfirm && activeSession && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 overflow-y-auto">
              <div className="w-full max-w-sm my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 shadow-xl">
                <h3 className="text-base font-bold text-[#1E293B]">
                  Unlock {formatCompartmentLabel(activeSession.slotNumber)}?
                </h3>
                <p className="text-xs text-[#64748B] mt-1 mb-5">
                  Confirm you are standing at <strong className="text-[#1E293B]">{activeSession.stationName}</strong> to unlatch the solenoid and retrieve your device.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    className="flex-1 h-10 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      endActiveSession();
                      setShowEndConfirm(false);
                    }}
                    className="flex-1 h-10 rounded-xl bg-[#DC2626] text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
                  >
                    Unlatch &amp; End
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 4. WALLET & COINS
    if (section === 'wallet') {
      return (
        <div className="max-w-3xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">Wallet &amp; Coins</h1>
            <p className="text-sm text-[#64748B]">Manage your USTP Campus E-Wallet credits for instant 1-scan locker unlocks.</p>
          </div>

          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Available Balance</span>
              <div className="text-4xl font-bold font-mono text-[#1E293B] mt-1">
                ₱{student.walletBalance.toFixed(2)}
              </div>
              <p className="text-xs text-[#64748B] mt-1">Zero transaction surcharge at {station.name}.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => topUpWallet(amt)}
                  className="px-4 py-2.5 rounded-xl bg-[#5BC496] text-[#1E293B] text-xs font-bold font-mono hover:bg-[#48AD80] flex items-center gap-1 cursor-pointer shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#1E293B]" />
                  <span>Reload ₱{amt}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 space-y-3">
            <h3 className="text-sm font-bold text-[#4E6E81]">Recent Wallet Activity</h3>
            {sessionHistory.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#64748B]">
                No transactions yet. Reload your wallet above or avail a locker to get started.
              </p>
            ) : (
              <div className="divide-y divide-[#E2E8F0] text-xs">
                {sessionHistory.map((h) => (
                  <div key={h.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#1E293B] block">
                        {h.pricingTier} ({formatCompartmentLabel(h.slotNumber)})
                      </span>
                      <span className="text-[#64748B]">{h.date} · {h.receiptNumber}</span>
                    </div>
                    <span className="font-mono font-bold text-[#1E293B]">-₱{h.totalFee.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // 5. PHYSICAL KIOSK QR SCANNER & HARDWARE TERMINAL
    if (section === 'kiosk') {
      return (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-[#4E6E81] tracking-tight">
              Kiosk QR Scanner &amp; Hardware Terminal
            </h1>
            <p className="text-xs text-[#64748B]">
              Tap Scan QR on the 20-compartment {station.name} touchscreen to open your camera, upload your QR PNG, or enter your 6-digit backup PIN to unlock a compartment.
            </p>
          </div>

          {pendingUnlockToken && (
            <div className="p-4 rounded-2xl bg-[#FFFFFF] border-2 border-[#5BC496] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EBF9F3] text-[#4E6E81] flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5 text-[#5BC496]" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#1E293B] block">
                    Active Unlock QR Ready for Kiosk Scan · {formatCompartmentLabel(pendingUnlockToken.slotNumber)} ({pendingUnlockToken.pricingTier})
                  </span>
                  <span className="text-xs text-[#64748B]">
                    Tap <strong className="text-[#4E6E81]">&ldquo;Scan QR&rdquo;</strong> on the kiosk touchscreen below, hold your emailed QR pass to the camera, or enter PIN{' '}
                    <strong className="font-mono text-[#1E293B]">{pendingUnlockToken.pinCode}</strong> ({formatTimer(pendingSecondsLeft)} left).
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] cursor-pointer"
                >
                  View QR Modal
                </button>
                <button
                  onClick={cancelPendingUnlock}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs text-[#64748B] hover:text-[#DC2626] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="w-full min-h-[720px] rounded-2xl border border-[#E2E8F0] overflow-hidden bg-[#F8FAFC] shadow-sm">
            <KioskHardwareSimulator />
          </div>
        </div>
      );
    }

    // 6. SETTINGS & HELP SUPPORT
    return (
      <div className="max-w-2xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">
            {section === 'support' ? 'Help & Campus Support' : 'Student Account Settings'}
          </h1>
          <p className="text-sm text-[#64748B]">
            {section === 'support'
              ? 'Report compartment issues or contact USTP UniCharge hardware operations.'
              : 'Configure security, biometric lock retrieval, and notification alerts.'}
          </p>
        </div>

        {section === 'settings' ? (
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Fingerprint className="w-5 h-5 text-[#4E6E81]" />
                <div>
                  <span className="text-sm font-semibold text-[#1E293B] block">Biometric Locker Retrieval</span>
                  <span className="text-xs text-[#64748B]">Allow Face ID / Fingerprint verification when unlocking</span>
                </div>
              </div>
              <button
                onClick={toggleBiometrics}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  student.biometricEnabled ? 'bg-[#5BC496]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    student.biometricEnabled ? 'translate-x-5.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-[#4E6E81]" />
                <div>
                  <span className="text-sm font-semibold text-[#1E293B] block">Charging Completion Alerts</span>
                  <span className="text-xs text-[#64748B]">Notify at 80% and 100% battery capacity</span>
                </div>
              </div>
              <button
                onClick={togglePushNotifications}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  student.pushNotifications ? 'bg-[#5BC496]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    student.pushNotifications ? 'translate-x-5.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#4E6E81]">
              <PhoneCall className="w-4 h-4 text-[#5BC496]" />
              <span>UniCharge Station Hardware &amp; Security Desk</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              If a locker solenoid latch does not release or you left personal items inside after session expiration, contact campus ICT support immediately with your receipt number.
            </p>
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1 font-mono text-[#1E293B]">
              <div>Hotline: (088) 856-1738 loc. 204</div>
              <div>Station: {station.name} ({station.campusCode})</div>
              <div>Support Email: unicharge.ustp@gmail.com</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {renderSection()}

      {/* QR CODE VERIFICATION MODAL */}
      {showQrModal && pendingUnlockToken && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md my-auto max-h-[calc(100dvh-1.5rem)] overflow-y-auto bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] border-t-4 border-t-[#4E6E81] shadow-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5BC496] block">
                  Physical Kiosk Authorization
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#1E293B] leading-snug">
                  Scan QR at {pendingUnlockToken.stationName}
                </h3>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                aria-label="Close QR modal"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#EDF2F5] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#EDF2F5] border border-[#4E6E81]/20 text-xs text-[#1E293B] leading-relaxed">
              Walk up to the <strong>{pendingUnlockToken.stationName}</strong>, tap{' '}
              <strong>&lsquo;Scan QR&rsquo;</strong> on the touchscreen, and hold this QR code (or the PNG from your email) to the kiosk camera to release{' '}
              <strong>{formatCompartmentLabel(pendingUnlockToken.slotNumber)}</strong> ({pendingUnlockToken.pricingTier}).
            </div>

            {pendingUnlockToken.emailSent ? (
              <div className="p-2.5 sm:p-3 rounded-xl bg-[#EBF9F3] border border-[#5BC496]/40 text-xs text-[#1E293B] flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-[#5BC496] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-semibold block break-words">
                      QR pass emailed to {pendingUnlockToken.emailSentTo || student.email}
                    </span>
                    <span className="text-[11px] text-[#64748B] block break-words">
                      {pendingUnlockToken.emailSentFrom
                        ? `From ${pendingUnlockToken.emailSentFrom} · Check Inbox, Spam, or search "UniCharge".`
                        : 'Check Inbox, Updates, or Spam if it doesn\u2019t appear right away.'}
                    </span>
                    {pendingUnlockToken.emailPreviewUrl && (
                      <a
                        href={pendingUnlockToken.emailPreviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-[#4E6E81] underline"
                      >
                        Open test email preview
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isResendingQrEmail}
                  onClick={() => void handleResendQrEmail()}
                  className="text-[11px] font-bold text-[#4E6E81] hover:text-[#1E293B] underline shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isResendingQrEmail ? 'Sending...' : 'Resend'}
                </button>
              </div>
            ) : (
              <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
                <span className="flex-1">
                  {pendingUnlockToken.emailError ||
                    `Want a copy in your inbox? Send this scannable QR pass to ${student.email}.`}
                </span>
                <button
                  type="button"
                  disabled={isResendingQrEmail}
                  onClick={() => void handleResendQrEmail()}
                  className="px-2.5 py-1 rounded-lg bg-[#4E6E81] text-white text-[11px] font-bold shrink-0 cursor-pointer hover:bg-[#3D5767] disabled:opacity-50"
                >
                  {isResendingQrEmail ? 'Sending...' : 'Email QR Pass'}
                </button>
              </div>
            )}

            {resendStatusMessage && (
              <div
                className={`p-2.5 rounded-lg text-[11px] font-medium ${
                  resendStatusMessage.type === 'success'
                    ? 'bg-[#EBF9F3] text-[#1E293B] border border-[#5BC496]/30'
                    : 'bg-red-50 text-[#DC2626] border border-red-200'
                }`}
              >
                {resendStatusMessage.text}
              </div>
            )}

            <div className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="p-2 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
                <QrMatrixSvg
                  value={pendingUnlockToken.qrPayload}
                  size={136}
                  foreground="#1E293B"
                  accent="#5BC496"
                />
              </div>

              <div className="mt-3 flex items-center gap-4 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                    6-Digit Backup PIN
                  </span>
                  <span className="text-lg sm:text-xl font-bold font-mono tracking-[0.2em] text-[#4E6E81]">
                    {pendingUnlockToken.pinCode}
                  </span>
                </div>
                <div className="h-8 w-px bg-[#E2E8F0]" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                    Expires In
                  </span>
                  <span
                    className={`text-lg sm:text-xl font-bold font-mono flex items-center gap-1 ${
                      pendingSecondsLeft === 0
                        ? 'text-[#DC2626]'
                        : pendingSecondsLeft <= 30
                        ? 'text-[#F59E0B]'
                        : 'text-[#5BC496]'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    {formatTimer(pendingSecondsLeft)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleDownloadQrPng()}
                className="mt-2.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#EDF2F5] text-[11px] font-semibold text-[#4E6E81] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#5BC496]" />
                <span>Download QR PNG</span>
              </button>
            </div>

            {pendingSecondsLeft === 0 && (
              <button
                onClick={() => void regenerateUnlockToken()}
                className="w-full h-10 rounded-xl bg-[#F59E0B] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-600 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>QR Expired — Regenerate 5-Minute Unlock Token</span>
              </button>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
              <button
                onClick={() => {
                  sound.playTap();
                  setShowQrModal(false);
                  onChangeSection('kiosk');
                }}
                className="flex-1 h-10 rounded-xl bg-[#5BC496] hover:bg-[#48AD80] text-[#1E293B] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ScanLine className="w-4 h-4" />
                <span>Go to Kiosk Scanner</span>
              </button>
              <button
                onClick={() => {
                  cancelPendingUnlock();
                  setShowQrModal(false);
                }}
                className="h-10 px-4 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
