import React, { useState } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { sound } from '../../utils/audio';
import { PRICING_RATES } from '../../data/mockData';
import { KioskStation, LockerSize, ServiceType, SessionHistoryItem } from '../../types';
import {
  Zap,
  MapPin,
  BatteryCharging,
  Thermometer,
  Clock,
  Lock,
  Unlock,
  Plus,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Search,
  Navigation,
  ArrowRight,
  Package,
  Sparkles,
  Power,
  Fingerprint,
  Bell,
  PhoneCall,
  Download,
  Smartphone,
  Columns,
  AlertTriangle,
  RotateCcw,
  ScanLine,
  X,
} from 'lucide-react';
import { KioskHardwareSimulator } from '../hardware/KioskHardwareSimulator';
import { QrMatrixSvg } from '../hardware/QrMatrixSvg';
import { StationDiscoveryScreen } from '../screens/StationDiscoveryScreen';
import { ServiceLockerSelectionScreen } from '../screens/ServiceLockerSelectionScreen';
import { PaymentQrUnlockScreen } from '../screens/PaymentQrUnlockScreen';
import { ActiveSessionScreen } from '../screens/ActiveSessionScreen';
import { ProfileHistoryScreen } from '../screens/ProfileHistoryScreen';

export type StudentSection =
  | 'dashboard'
  | 'stations'
  | 'sessions'
  | 'wallet'
  | 'booking'
  | 'mobile'
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
    setSelectedStation,
    selectedSlot,
    setSelectedSlot,
    selectedService,
    setSelectedService,
    selectedSize,
    setSelectedSize,
    selectedDuration,
    setSelectedDuration,
    calculateFee,
    activeSession,
    pendingUnlockToken,
    pendingSecondsLeft,
    sessionHistory,
    generateUnlockToken,
    regenerateUnlockToken,
    cancelPendingUnlock,
    endActiveSession,
    topUpWallet,
    toggleBiometrics,
    togglePushNotifications,
    toggleOverchargeProtection,
    triggerSimulatedTamper,
    setHardwareKioskStationId,
  } = useUniCharge();

  const [searchQuery, setSearchQuery] = useState('');
  const [stationFilter, setStationFilter] = useState<'all' | 'available' | 'nearest'>('all');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'gcash' | 'maya' | 'cash'>('wallet');
  const [bookingMessage, setBookingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<SessionHistoryItem | null>(null);
  const [mobileSubTab, setMobileSubTab] = useState<'stations' | 'services' | 'active' | 'profile'>('stations');
  const [mobilePaymentStep, setMobilePaymentStep] = useState(false);
  const [mobileLayoutMode, setMobileLayoutMode] = useState<
    'side-by-side' | 'mobile-only' | 'kiosk-only'
  >('side-by-side');

  const formatTimer = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const filteredStations = stations
    .filter((st) => {
      const q = searchQuery.toLowerCase();
      const matches =
        st.name.toLowerCase().includes(q) ||
        st.building.toLowerCase().includes(q) ||
        st.campusCode.toLowerCase().includes(q);
      if (!matches) return false;
      if (stationFilter === 'available') return st.availableSlots > 0;
      return true;
    })
    .sort((a, b) => (stationFilter === 'nearest' ? a.distanceMeters - b.distanceMeters : 0));

  const startBookingForStation = (station: KioskStation) => {
    sound.playTap();
    setSelectedStation(station);
    setHardwareKioskStationId(station.id);
    const firstFree = station.slots.find((s) => s.status === 'available') || null;
    setSelectedSlot(firstFree);
    if (firstFree) setSelectedSize(firstFree.size);
    setBookingMessage(null);
    onChangeSection('booking');
  };

  const totalFee = calculateFee(selectedSize, selectedDuration, selectedService);

  const handleConfirmUnlock = () => {
    const res = generateUnlockToken(paymentMethod);
    if (res.success) {
      setBookingMessage({ type: 'success', text: res.message });
      setShowQrModal(true);
    } else {
      setBookingMessage({ type: 'error', text: res.message });
    }
  };

  const renderSection = () => {
  // 1. DASHBOARD OVERVIEW
  if (section === 'dashboard') {
    const totalFreeSlots = stations.reduce((acc, s) => acc + s.availableSlots, 0);
    const totalSlots = stations.reduce((acc, s) => acc + s.totalSlots, 0);

    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight">
              Welcome back, <span className="text-[#4E6E81]">{student.name.split(' ')[0]}</span>
            </h1>
            <p className="text-sm text-[#64748B] mt-0.5">
              {student.college} · Student ID <span className="font-mono text-[#1E293B]">{student.studentIdNumber}</span>
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                sound.playTap();
                onChangeSection('mobile');
              }}
              className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-xs font-semibold text-[#1E293B] hover:bg-[#EDF2F5] flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Smartphone className="w-4 h-4 text-[#4E6E81]" />
              <span>Expo Mobile &amp; Kiosk View</span>
            </button>
            <button
              onClick={() => startBookingForStation(selectedStation)}
              className="px-4 py-2 rounded-xl bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
            >
              <Zap className="w-4 h-4 text-[#5BC496] fill-[#5BC496]" />
              <span>Reserve a Locker</span>
            </button>
          </div>
        </div>

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
              {activeSession ? `Slot #${activeSession.slotNumber}` : 'None'}
            </div>
            <span className="text-xs text-[#64748B] mt-2 block truncate">
              {activeSession ? `${activeSession.stationName} · ${formatTimer(activeSession.remainingSeconds)} left` : 'Ready to reserve any kiosk'}
            </span>
          </div>

          <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0]">
            <span className="text-xs font-medium text-[#64748B]">Campus Availability</span>
            <div className="text-2xl font-bold text-[#5BC496] font-mono mt-1">
              {totalFreeSlots} / {totalSlots} Free
            </div>
            <span className="text-xs text-[#64748B] mt-2 block">
              Across {stations.length} active USTP kiosks
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

        {/* Active Session Banner + Nearby Stations Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 cols: Active Session Live Card */}
          <div className="lg:col-span-5 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#4E6E81]">Live Session Telemetry</h2>
              {activeSession && (
                <span className="text-xs font-semibold text-[#1E293B] bg-[#EBF9F3] border border-[#5BC496]/40 px-2.5 py-0.5 rounded-md">
                  Charging Active
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
                      Slot #{activeSession.slotNumber} · Size {activeSession.compartmentSize}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-100/90 block">Battery</span>
                    <span className="text-2xl font-bold font-mono text-[#5BC496]">
                      {activeSession.batteryCurrent}%
                    </span>
                    <span className="text-[11px] text-slate-100/80 font-mono">
                      {activeSession.chargingRateWatts}W · {activeSession.lockerTemperature}°C
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

                <div className="flex gap-2">
                  <button
                    onClick={() => onChangeSection('sessions')}
                    className="flex-1 h-10 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#4E6E81] hover:bg-[#EDF2F5] cursor-pointer transition-colors"
                  >
                    Open Full Telemetry
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
                  Select any nearby USTP kiosk to start fast charging or secure storage.
                </p>
                <button
                  onClick={() => onChangeSection('stations')}
                  className="px-4 py-2 rounded-xl bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] cursor-pointer transition-colors"
                >
                  Browse Campus Stations
                </button>
              </div>
            )}
          </div>

          {/* Right 7 cols: Nearby Campus Stations List */}
          <div className="lg:col-span-7 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#4E6E81]">Nearby Campus Kiosks</h2>
              <button
                onClick={() => onChangeSection('stations')}
                className="text-xs font-semibold text-[#4E6E81] hover:text-[#5BC496] cursor-pointer transition-colors"
              >
                Open Interactive Map →
              </button>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {stations.slice(0, 4).map((station) => (
                <div
                  key={station.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EDF2F5] text-[#4E6E81] flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#1E293B]">{station.name}</h3>
                      <p className="text-xs text-[#64748B]">
                        {station.floor} · {station.distanceMeters}m ({station.walkMinutes} min walk)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-[#EBF9F3] text-[#1E293B] border border-[#5BC496]/30">
                      {station.availableSlots}/{station.totalSlots} Available
                    </span>
                    <button
                      onClick={() => startBookingForStation(station)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] cursor-pointer transition-colors"
                    >
                      Reserve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Unlock Confirmation Modal */}
        {showEndConfirm && activeSession && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 shadow-xl">
              <h3 className="text-base font-bold text-[#1E293B]">
                Unlock Compartment #{activeSession.slotNumber}?
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
                  Keep Charging
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

  // 2. STATIONS MAP & DISCOVERY
  if (section === 'stations') {
    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">USTP Campus Stations Map</h1>
            <p className="text-sm text-[#64748B]">Live compartment availability across Cagayan de Oro Campus.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search building or kiosk..."
                className="h-9 pl-9 pr-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-xs text-[#1E293B] focus:outline-none focus:border-[#4E6E81]"
              />
            </div>
            <div className="flex bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-0.5 text-xs">
              {(['all', 'available', 'nearest'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    sound.playTap();
                    setStationFilter(f);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium capitalize cursor-pointer ${
                    stationFilter === f ? 'bg-[#4E6E81] text-white' : 'text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Interactive SVG Map */}
          <div className="lg:col-span-5 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-4">
            <div className="relative rounded-xl overflow-hidden bg-[#3D5767] aspect-[4/3]">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect x="18" y="18" width="64" height="64" rx="8" fill="#4E6E81" />
                <path d="M 20 50 Q 50 40 80 50" stroke="#3D5767" strokeWidth="2.5" fill="none" />
                <path d="M 50 20 Q 40 50 50 80" stroke="#3D5767" strokeWidth="2.5" fill="none" />
                <g fill="#2C4250" stroke="#5BC496" strokeWidth="0.4" opacity="0.9">
                  <rect x="30" y="38" width="16" height="14" rx="2" />
                  <rect x="54" y="24" width="16" height="14" rx="2" />
                  <rect x="18" y="60" width="16" height="14" rx="2" />
                  <rect x="66" y="56" width="16" height="14" rx="2" />
                  <rect x="42" y="76" width="16" height="14" rx="2" />
                </g>
                <text x="38" y="44" fill="#F8FAFC" fontSize="2.8" textAnchor="middle" fontWeight="bold">CITC</text>
                <text x="62" y="30" fill="#F8FAFC" fontSize="2.8" textAnchor="middle" fontWeight="bold">LIBRARY</text>
                <text x="26" y="66" fill="#F8FAFC" fontSize="2.8" textAnchor="middle" fontWeight="bold">CEA</text>
                <text x="74" y="62" fill="#F8FAFC" fontSize="2.8" textAnchor="middle" fontWeight="bold">SAC</text>
                <text x="50" y="82" fill="#F8FAFC" fontSize="2.8" textAnchor="middle" fontWeight="bold">GYM</text>
              </svg>

              {stations.map((st) => {
                const isSel = selectedStation.id === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      sound.playTap();
                      setSelectedStation(st);
                    }}
                    style={{ left: `${st.mapCoords.x}%`, top: `${st.mapCoords.y}%` }}
                    title={st.name}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all cursor-pointer ${
                      isSel
                        ? 'bg-[#5BC496] text-[#1E293B] ring-4 ring-[#5BC496]/40 scale-125 z-10'
                        : 'bg-white text-[#4E6E81] hover:scale-110 shadow'
                    }`}
                  >
                    <MapPin className="w-4 h-4 fill-current" />
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">{selectedStation.name}</h3>
                <p className="text-xs text-[#64748B]">{selectedStation.floor}</p>
              </div>
              <button
                onClick={() => startBookingForStation(selectedStation)}
                className="px-3.5 py-2 rounded-xl bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] cursor-pointer transition-colors"
              >
                Reserve a Locker
              </button>
            </div>
          </div>

          {/* Stations List */}
          <div className="lg:col-span-7 space-y-3">
            {filteredStations.map((st) => (
              <div
                key={st.id}
                onClick={() => {
                  sound.playTap();
                  setSelectedStation(st);
                }}
                className={`bg-[#FFFFFF] rounded-2xl border p-4 transition-all cursor-pointer ${
                  selectedStation.id === st.id ? 'border-[#4E6E81] ring-1 ring-[#4E6E81]/20' : 'border-[#E2E8F0] hover:border-[#4E6E81]/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#1E293B]">{st.name}</h3>
                      <span className="text-[11px] font-mono text-[#64748B]">{st.campusCode}</span>
                    </div>
                    <p className="text-xs text-[#64748B] flex items-center gap-2 mt-0.5">
                      <span>{st.floor}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Navigation className="w-3 h-3 text-[#5BC496]" /> {st.distanceMeters}m ({st.walkMinutes} min)
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-[#EBF9F3] text-[#1E293B] border border-[#5BC496]/40 px-2.5 py-1 rounded-lg">
                      {st.availableSlots}/{st.totalSlots} Available
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startBookingForStation(st);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] cursor-pointer transition-colors"
                    >
                      Configure &amp; Unlock
                    </button>
                  </div>
                </div>

                {/* 8-Slot Matrix */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {st.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`p-1.5 rounded-lg border text-center font-mono text-[11px] ${
                        slot.status === 'available'
                          ? 'bg-[#EBF9F3] border-[#5BC496]/40 text-[#1E293B]'
                          : slot.status === 'in_use'
                          ? 'bg-amber-50 border-[#F59E0B]/40 text-amber-800'
                          : 'bg-red-50 border-red-200 text-[#DC2626]'
                      }`}
                    >
                      <div className="font-bold">#{slot.slotNumber} ({slot.size})</div>
                      <div className="text-[9px] uppercase">{slot.status === 'available' ? 'Free' : slot.status === 'in_use' ? 'Busy' : 'Maint'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. LOCKER BOOKING & QR UNLOCK
  if (section === 'booking') {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">Reserve a Locker</h1>
            <p className="text-sm text-[#64748B]">
              {selectedStation.name} · {selectedStation.floor}
            </p>
          </div>
          <button
            onClick={() => onChangeSection('stations')}
            className="text-xs font-semibold text-[#4E6E81] hover:text-[#5BC496] cursor-pointer"
          >
            Change Station
          </button>
        </div>

        {pendingUnlockToken && (
          <div className="p-4 rounded-2xl bg-[#EBF9F3] border border-[#5BC496] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <QrCode className="w-5 h-5 text-[#4E6E81] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-[#1E293B] block">
                  Pending Kiosk Scan · {pendingUnlockToken.stationName} Slot #{pendingUnlockToken.slotNumber}
                </span>
                <span className="text-xs text-[#64748B]">
                  PIN <strong className="font-mono text-[#1E293B]">{pendingUnlockToken.pinCode}</strong> ·{' '}
                  <strong className="font-mono text-[#4E6E81]">
                    {pendingSecondsLeft > 0 ? `${pendingSecondsLeft}s remaining` : 'Expired'}
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
                onClick={() => onChangeSection('mobile')}
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
            {/* Service Type */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] uppercase tracking-wider mb-2">
                1. Service Type
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['charging', 'storage', 'both'] as ServiceType[]).map((svc) => (
                  <button
                    key={svc}
                    onClick={() => {
                      sound.playTap();
                      setSelectedService(svc);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedService === svc
                        ? 'bg-[#4E6E81] text-white border-[#4E6E81]'
                        : 'bg-[#F8FAFC] text-[#1E293B] border-[#E2E8F0] hover:bg-[#EDF2F5]'
                    }`}
                  >
                    <div className="mb-1.5">
                      {svc === 'charging' && <Zap className="w-4 h-4 text-[#5BC496]" />}
                      {svc === 'storage' && <Package className="w-4 h-4 text-[#5BC496]" />}
                      {svc === 'both' && <Sparkles className="w-4 h-4 text-[#5BC496]" />}
                    </div>
                    <div className="text-xs font-bold capitalize">
                      {svc === 'both' ? 'Combined (Both)' : svc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Compartment Size */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] uppercase tracking-wider mb-2">
                2. Compartment Size
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['S', 'M', 'L'] as LockerSize[]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      sound.playTap();
                      setSelectedSize(sz);
                      const free = selectedStation.slots.find((s) => s.size === sz && s.status === 'available');
                      setSelectedSlot(free || null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedSize === sz
                        ? 'bg-[#EDF2F5] border-[#4E6E81] text-[#4E6E81]'
                        : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#1E293B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Size {sz}</span>
                      <span className="font-mono text-xs font-bold text-[#4E6E81]">₱{PRICING_RATES[sz].hourly}/hr</span>
                    </div>
                    <span className="text-[11px] text-[#64748B] block mt-1">{PRICING_RATES[sz].bestFor}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Slot Picker */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] uppercase tracking-wider mb-2">
                3. Select Hardware Compartment
              </label>
              <div className="grid grid-cols-4 gap-2">
                {selectedStation.slots.map((slot) => {
                  const isSel = selectedSlot?.slotNumber === slot.slotNumber;
                  const isFree = slot.status === 'available';
                  return (
                    <button
                      key={slot.id}
                      disabled={!isFree}
                      onClick={() => {
                        sound.playTap();
                        setSelectedSlot(slot);
                        setSelectedSize(slot.size);
                      }}
                      className={`p-2.5 rounded-xl border text-center font-mono text-xs transition-all ${
                        isSel
                          ? 'bg-[#4E6E81] text-white border-[#4E6E81] font-bold'
                          : isFree
                          ? 'bg-[#EBF9F3] border-[#5BC496]/40 text-[#1E293B] hover:border-[#4E6E81] cursor-pointer'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div>#{slot.slotNumber} · {slot.size}</div>
                      <div className="text-[10px] mt-0.5">{isSel ? 'Selected' : isFree ? 'Free' : slot.status}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">4. Duration</label>
                <span className="text-xs font-mono font-bold text-[#4E6E81]">{selectedDuration} mins</span>
              </div>
              <input
                type="range"
                min={30}
                max={240}
                step={30}
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                className="w-full accent-[#4E6E81] cursor-pointer"
              />
            </div>
          </div>

          {/* Summary & Payment Column */}
          <div className="lg:col-span-5 bg-[#FFFFFF] p-6 rounded-2xl border border-[#E2E8F0] space-y-4">
            <h3 className="text-base font-bold text-[#4E6E81]">Payment &amp; Solenoid Release</h3>
            <div className="space-y-2 text-xs border-b border-[#E2E8F0] pb-4">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Station</span>
                <span className="font-semibold text-[#1E293B]">{selectedStation.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Compartment</span>
                <span className="font-mono font-semibold text-[#1E293B]">
                  Slot #{selectedSlot?.slotNumber || 1} ({selectedSize})
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
                  <span className={`w-3.5 h-3.5 rounded-full border ${paymentMethod === pm.id ? 'bg-[#5BC496] border-[#4E6E81]' : 'border-[#E2E8F0]'}`} />
                </button>
              ))}
            </div>

            <button
              onClick={handleConfirmUnlock}
              className="w-full h-11 rounded-xl bg-[#4E6E81] text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#3D5767] cursor-pointer shadow-sm transition-colors"
            >
              <QrCode className="w-4 h-4 text-[#5BC496]" />
              <span>Authorize &amp; Generate Unlock QR (₱{totalFee})</span>
            </button>
            <p className="text-[11px] text-[#64748B] text-center leading-relaxed">
              Generates a time-sensitive 60s QR code &amp; PIN. Solenoid unlatches only when scanned at the physical kiosk.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 4. MY SESSIONS & HISTORY
  if (section === 'sessions') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">My Charging &amp; Storage Sessions</h1>
          <p className="text-sm text-[#64748B]">Live locker telemetry, tamper controls, and past session receipts.</p>
        </div>

        {/* Active Session Card */}
        {activeSession ? (
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1E293B] mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#5BC496] animate-pulse" />
                  <span>Session {activeSession.sessionId}</span>
                </div>
                <h2 className="text-lg font-bold text-[#4E6E81]">
                  {activeSession.stationName} — Slot #{activeSession.slotNumber}
                </h2>
                <p className="text-xs text-[#64748B] capitalize">
                  {activeSession.serviceType} · Size {activeSession.compartmentSize} · ₱{activeSession.totalFee}.00 Paid
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-5">
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
                <span className="text-xs text-[#64748B] font-mono">{activeSession.chargingRateWatts}W PD active</span>
              </div>
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B] flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-[#4E6E81]" /> Thermal Sensor
                </span>
                <span className="text-3xl font-bold font-mono text-[#1E293B] mt-1 block">
                  {activeSession.lockerTemperature}°C
                </span>
                <span className="text-xs text-[#5BC496] font-semibold">Nominal thermal range</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E2E8F0]">
              <div className="flex items-center gap-3">
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
                  onClick={triggerSimulatedTamper}
                  className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#1E293B] hover:bg-[#EDF2F5] flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#5BC496]" />
                  <span>Test Tamper Accelerometer</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-8 text-center">
            <p className="text-sm font-semibold text-[#1E293B]">No active session right now</p>
            <p className="text-xs text-[#64748B] mt-1 mb-4">Book any available station compartment to begin charging.</p>
            <button
              onClick={() => onChangeSection('stations')}
              className="px-4 py-2 rounded-xl bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] cursor-pointer"
            >
              Find Nearest Station
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
                No completed sessions yet. Reserve a locker to view your receipts here.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="py-3 px-6 font-semibold">Receipt</th>
                    <th className="py-3 px-4 font-semibold">Station</th>
                    <th className="py-3 px-4 font-semibold">Slot</th>
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
                      <td className="py-3 px-4 text-[#1E293B]">{item.stationName}</td>
                      <td className="py-3 px-4 font-mono">#{item.slotNumber} ({item.compartmentSize})</td>
                      <td className="py-3 px-4 font-mono">{item.durationMinutes} min</td>
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
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 shadow-xl space-y-4">
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
                <div className="flex justify-between"><span className="text-[#64748B]">Slot</span><span className="font-mono text-[#1E293B]">#{selectedReceipt.slotNumber}</span></div>
                <div className="flex justify-between"><span className="text-[#64748B]">Duration</span><span className="font-mono text-[#1E293B]">{selectedReceipt.durationMinutes} mins</span></div>
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
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 shadow-xl">
              <h3 className="text-base font-bold text-[#1E293B]">
                Unlock Compartment #{activeSession.slotNumber}?
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

  // 5. WALLET & COINS
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
            <p className="text-xs text-[#64748B] mt-1">Zero transaction surcharge across all USTP campus kiosks.</p>
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
              No transactions yet. Reload your wallet above or reserve a locker to get started.
            </p>
          ) : (
            <div className="divide-y divide-[#E2E8F0] text-xs">
              {sessionHistory.map((h) => (
                <div key={h.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#1E293B] block">{h.stationName} (Slot #{h.slotNumber})</span>
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

  // 6. INTERACTIVE MOBILE + HARDWARE KIOSK VIEW
  if (section === 'mobile') {
    const showPhone = mobileLayoutMode === 'side-by-side' || mobileLayoutMode === 'mobile-only';
    const showKiosk = mobileLayoutMode === 'side-by-side' || mobileLayoutMode === 'kiosk-only';

    return (
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#4E6E81] tracking-tight">
              Mobile Companion &amp; Hardware Kiosk
            </h1>
            <p className="text-xs text-[#64748B]">
              Side-by-side workspace linking the UniCharge mobile companion with the 8-door ESP32-S3 kiosk simulator.
            </p>
          </div>

          {/* Responsive Layout Mode Switch */}
          <div className="flex flex-wrap bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-1 text-xs gap-1">
            {(
              [
                { id: 'side-by-side', label: 'Side-by-Side (Phone + Kiosk)', icon: Columns },
                { id: 'mobile-only', label: 'Mobile Only', icon: Smartphone },
                { id: 'kiosk-only', label: 'Kiosk Only', icon: ScanLine },
              ] as const
            ).map((mode) => {
              const ModeIcon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    sound.playTap();
                    setMobileLayoutMode(mode.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    mobileLayoutMode === mode.id
                      ? 'bg-[#4E6E81] text-white'
                      : 'text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  <ModeIcon className="w-3.5 h-3.5" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Pending QR Banner inside Mobile & Expo for easy physical kiosk scanning */}
        {pendingUnlockToken && (
          <div className="p-4 rounded-2xl bg-[#FFFFFF] border-2 border-[#5BC496] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EBF9F3] text-[#4E6E81] flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5 text-[#5BC496]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#1E293B] block">
                  Active Unlock QR Ready for Kiosk Scan · {pendingUnlockToken.stationName} Slot #{pendingUnlockToken.slotNumber}
                </span>
                <span className="text-xs text-[#64748B]">
                  Tap <strong className="text-[#4E6E81]">&ldquo;Scan QR&rdquo;</strong> on the kiosk touchscreen below, or enter PIN{' '}
                  <strong className="font-mono text-[#1E293B]">{pendingUnlockToken.pinCode}</strong> ({pendingSecondsLeft}s left).
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

        {/* Spacious Responsive Workspace */}
        <div
          className={`flex flex-col ${
            mobileLayoutMode === 'side-by-side' ? 'xl:flex-row' : ''
          } gap-6 items-stretch`}
        >
          {showPhone && (
            <div className="flex justify-center shrink-0">
              <div className="relative w-[360px] h-[720px] bg-[#3D5767] rounded-[46px] p-3 shadow-xl border-[5px] border-[#4E6E81] flex flex-col">
                <div className="flex-1 w-full rounded-[38px] overflow-hidden bg-[#F8FAFC] flex flex-col relative">
                  <div className="flex-1 overflow-hidden relative">
                    {mobileSubTab === 'stations' && (
                      <StationDiscoveryScreen
                        onSelectStationToBook={(st) => {
                          setSelectedStation(st);
                          setMobilePaymentStep(false);
                          setMobileSubTab('services');
                        }}
                      />
                    )}
                    {mobileSubTab === 'services' &&
                      (mobilePaymentStep ? (
                        <PaymentQrUnlockScreen
                          onUnlockSuccess={() => {
                            setMobilePaymentStep(false);
                            setMobileSubTab('active');
                          }}
                          onBackToConfig={() => setMobilePaymentStep(false)}
                        />
                      ) : (
                        <ServiceLockerSelectionScreen
                          onProceedToPayment={() => setMobilePaymentStep(true)}
                          onBackToStations={() => setMobileSubTab('stations')}
                        />
                      ))}
                    {mobileSubTab === 'active' && (
                      <ActiveSessionScreen onStartNewSession={() => setMobileSubTab('stations')} />
                    )}
                    {mobileSubTab === 'profile' && <ProfileHistoryScreen />}
                  </div>
                  <nav className="bg-[#FFFFFF] border-t border-[#E2E8F0] grid grid-cols-4 h-14 text-[11px] shrink-0">
                    {(['stations', 'services', 'active', 'profile'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          sound.playTap();
                          setMobilePaymentStep(false);
                          setMobileSubTab(t);
                        }}
                        className={`capitalize font-semibold cursor-pointer transition-colors ${
                          mobileSubTab === t
                            ? 'text-[#4E6E81] bg-[#EDF2F5]/70 font-bold border-t-2 border-t-[#5BC496]'
                            : 'text-[#64748B] hover:text-[#1E293B]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}

          {showKiosk && (
            <div className="flex-1 min-w-0 min-h-[720px] rounded-2xl border border-[#E2E8F0] overflow-hidden bg-[#F8FAFC] shadow-sm">
              <KioskHardwareSimulator />
            </div>
          )}
        </div>
      </div>
    );
  }

  // 7. SETTINGS & HELP SUPPORT
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">
          {section === 'support' ? 'Help & Campus Support' : 'Student Account Settings'}
        </h1>
        <p className="text-sm text-[#64748B]">
          {section === 'support'
            ? 'Report compartment issues or contact USTP CITC hardware operations.'
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
            <span>USTP CITC Hardware &amp; Security Desk</span>
          </div>
          <p className="text-xs text-[#64748B] leading-relaxed">
            If a locker solenoid latch does not release or you left personal items inside after session expiration, contact campus ICT support immediately with your receipt number.
          </p>
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1 font-mono text-[#1E293B]">
            <div>Hotline: (088) 856-1738 loc. 204</div>
            <div>Desk: CITC Innovation Complex, Room 204</div>
            <div>Support Email: unicharge-support@ustp.edu.ph</div>
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] border-t-4 border-t-[#4E6E81] shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5BC496]">
                  Physical Kiosk Authorization
                </span>
                <h3 className="text-lg font-bold text-[#1E293B]">
                  Scan QR at {pendingUnlockToken.stationName}
                </h3>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                aria-label="Close QR modal"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#EDF2F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instructional Banner */}
            <div className="p-3.5 rounded-xl bg-[#EDF2F5] border border-[#4E6E81]/20 text-xs text-[#1E293B] leading-relaxed">
              Walk up to the <strong>{pendingUnlockToken.stationName}</strong> Kiosk, tap{' '}
              <strong>&lsquo;Scan QR&rsquo;</strong> on the touchscreen, and hold this QR code to the kiosk scanner to securely release{' '}
              <strong>Compartment #{pendingUnlockToken.slotNumber}</strong>.
            </div>

            {/* QR Matrix + 6-Digit PIN */}
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="p-3 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
                <QrMatrixSvg
                  value={pendingUnlockToken.qrPayload}
                  size={172}
                  foreground="#1E293B"
                  accent="#5BC496"
                />
              </div>

              <div className="mt-4 flex items-center gap-4 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                    6-Digit Backup PIN
                  </span>
                  <span className="text-xl font-bold font-mono tracking-[0.2em] text-[#4E6E81]">
                    {pendingUnlockToken.pinCode}
                  </span>
                </div>
                <div className="h-8 w-px bg-[#E2E8F0]" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                    Expires In
                  </span>
                  <span
                    className={`text-xl font-bold font-mono flex items-center gap-1 ${
                      pendingSecondsLeft === 0
                        ? 'text-[#DC2626]'
                        : pendingSecondsLeft <= 15
                        ? 'text-[#F59E0B]'
                        : 'text-[#5BC496]'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    {pendingSecondsLeft}s
                  </span>
                </div>
              </div>
            </div>

            {pendingSecondsLeft === 0 && (
              <button
                onClick={regenerateUnlockToken}
                className="w-full h-10 rounded-xl bg-[#F59E0B] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-600 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>QR Expired — Regenerate 60s Unlock Token</span>
              </button>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                onClick={() => {
                  sound.playTap();
                  setShowQrModal(false);
                  onChangeSection('mobile');
                }}
                className="flex-1 h-11 rounded-xl bg-[#5BC496] hover:bg-[#48AD80] text-[#1E293B] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ScanLine className="w-4 h-4" />
                <span>Go to Kiosk Scanner (Mobile &amp; Expo)</span>
              </button>
              <button
                onClick={() => {
                  cancelPendingUnlock();
                  setShowQrModal(false);
                }}
                className="h-11 px-4 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 cursor-pointer transition-colors"
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
