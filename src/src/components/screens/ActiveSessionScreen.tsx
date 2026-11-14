import React, { useState } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { sound } from '../../utils/audio';
import {
  Zap,
  Lock,
  Unlock,
  ShieldCheck,
  Thermometer,
  Clock,
  BatteryCharging,
  Power,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface ActiveSessionScreenProps {
  onStartNewSession: () => void;
}

export const ActiveSessionScreen: React.FC<ActiveSessionScreenProps> = ({
  onStartNewSession,
}) => {
  const {
    activeSession,
    endActiveSession,
    toggleOverchargeProtection,
    triggerSimulatedTamper,
  } = useUniCharge();

  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isTerminating, setIsTerminating] = useState<boolean>(false);

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#F8FAFC] text-[#1E293B]">
        <div className="w-14 h-14 rounded-2xl bg-[#EDF2F5] text-[#4E6E81] flex items-center justify-center mb-4">
          <Zap className="w-7 h-7 text-[#5BC496]" />
        </div>
        <h2 className="text-base font-bold text-[#1E293B]">No Active Locker Session</h2>
        <p className="text-xs text-[#64748B] max-w-xs mt-1 mb-5">
          You do not currently have any charging or storage compartment locked on campus.
        </p>
        <button
          onClick={() => {
            sound.playTap();
            onStartNewSession();
          }}
          className="px-5 py-2.5 rounded-xl bg-[#4E6E81] text-white font-bold text-xs flex items-center gap-2 hover:bg-[#3D5767] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
        >
          <span>Find Nearest Station &amp; Book</span>
        </button>
      </div>
    );
  }

  const minutes = Math.floor(activeSession.remainingSeconds / 60);
  const seconds = activeSession.remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalSessionSeconds = activeSession.durationMinutes * 60;
  const progressPercent = Math.min(
    100,
    Math.round(((totalSessionSeconds - activeSession.remainingSeconds) / totalSessionSeconds) * 100)
  );

  const handleConfirmEndSession = () => {
    sound.playTap();
    setIsTerminating(true);

    setTimeout(() => {
      endActiveSession();
      setIsTerminating(false);
      setShowConfirmModal(false);
    }, 500);
  };

  const isTempHigh = activeSession.lockerTemperature > 38;

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-[#1E293B] overflow-y-auto">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-[#FFFFFF]/95 backdrop-blur-md px-4 pt-3 pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#48AD80] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#5BC496] animate-pulse" />
              <span>Session In Progress</span>
            </div>
            <h1 className="text-base font-bold text-[#1E293B] tracking-tight truncate">
              {activeSession.stationName}
            </h1>
          </div>
          <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-[#4E6E81] text-white shrink-0">
            Slot #{activeSession.slotNumber}
          </span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3.5 flex-1">
        {/* CIRCULAR TIMER & BATTERY HERO CARD */}
        <div className="p-4 rounded-2xl bg-[#4E6E81] text-white shadow-sm text-center">
          <div className="relative w-36 h-36 mx-auto my-1 flex items-center justify-center">
            <svg viewBox="0 0 176 176" className="w-full h-full -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="74"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="88"
                cy="88"
                r="74"
                stroke="#5BC496"
                strokeWidth="8"
                strokeDasharray="465"
                strokeDashoffset={465 - (465 * progressPercent) / 100}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-200 uppercase font-semibold tracking-wider">
                Time Left
              </span>
              <span className="text-2xl font-extrabold text-white font-mono tracking-tight my-0.5">
                {formattedTime}
              </span>
              <span className="text-[10px] text-[#5BC496] font-mono flex items-center gap-1 font-semibold">
                <Clock className="w-3 h-3" />
                {progressPercent}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/15 mt-2">
            <div>
              <span className="text-[10px] text-slate-200 block">Battery</span>
              <span className="text-xs font-bold text-white font-mono flex items-center justify-center gap-1">
                <BatteryCharging className="w-3.5 h-3.5 text-[#5BC496]" />
                {activeSession.batteryCurrent}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-200 block">Power</span>
              <span className="text-xs font-bold text-[#5BC496] font-mono flex items-center justify-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-[#5BC496]" />
                {activeSession.chargingRateWatts}W
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-200 block">Temp</span>
              <span
                className={`text-xs font-bold font-mono flex items-center justify-center gap-1 ${
                  isTempHigh ? 'text-red-300' : 'text-white'
                }`}
              >
                <Thermometer className="w-3.5 h-3.5" />
                {activeSession.lockerTemperature}°C
              </span>
            </div>
          </div>
        </div>

        {/* TELEMETRY & SMART SAFETY CONTROLS */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
            IoT Safety &amp; Security Controls
          </label>

          <div className="p-3 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EBF9F3] text-[#48AD80] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#1E293B] block">Solenoid Deadbolt</span>
                <span className="text-[10px] text-[#48AD80] font-mono font-semibold">
                  LOCKED · Latch Engaged
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#EBF9F3] text-[#1E293B] border border-[#5BC496]/40">
              SECURE
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EDF2F5] text-[#4E6E81] flex items-center justify-center">
                <Power className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#1E293B] block">Overcharge Auto Cut-Off</span>
                <span className="text-[10px] text-[#64748B]">Disconnects at 100%</span>
              </div>
            </div>
            <button
              onClick={toggleOverchargeProtection}
              className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer ${
                activeSession.isOverchargeProtectionActive ? 'bg-[#5BC496]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                  activeSession.isOverchargeProtectionActive ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="p-3 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EDF2F5] text-[#4E6E81] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#1E293B] block">Tamper Accelerometer</span>
                <span className="text-[10px] text-[#64748B]">Vibration &amp; entry guard</span>
              </div>
            </div>
            <button
              onClick={triggerSimulatedTamper}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[#EDF2F5] text-[#4E6E81] hover:bg-[#4E6E81] hover:text-white transition-colors cursor-pointer"
            >
              Test Sensor
            </button>
          </div>
        </div>

        {/* DETAILS SUMMARY */}
        <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#64748B]">Session ID:</span>
            <span className="font-mono text-[#1E293B] font-bold">{activeSession.sessionId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#64748B]">Service Mode:</span>
            <span className="capitalize text-[#1E293B] font-semibold">
              {activeSession.serviceType} (Size {activeSession.compartmentSize})
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#64748B]">Total Billed:</span>
            <span className="font-bold text-[#4E6E81] font-mono">
              ₱{activeSession.totalFee}.00 (Paid)
            </span>
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM BUTTON */}
      <div className="sticky bottom-0 p-3 bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#E2E8F0] z-20">
        <button
          onClick={() => {
            sound.playTap();
            setShowConfirmModal(true);
          }}
          className="w-full h-11 rounded-xl bg-[#DC2626] text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
        >
          <Unlock className="w-4 h-4" />
          <span>End Session &amp; Unlock (Slot #{activeSession.slotNumber})</span>
        </button>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-5 shadow-2xl text-[#1E293B]">
            <div className="w-11 h-11 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center mb-3">
              <Unlock className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-[#1E293B]">
              Unlock Compartment #{activeSession.slotNumber}?
            </h3>
            <p className="text-xs text-[#64748B] mt-1 mb-4 leading-relaxed">
              This will trigger the electronic solenoid release at{' '}
              <strong className="text-[#1E293B]">{activeSession.stationName}</strong>.
            </p>

            <div className="space-y-2">
              <button
                disabled={isTerminating}
                onClick={handleConfirmEndSession}
                className="w-full h-10 rounded-xl bg-[#DC2626] text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-700 cursor-pointer"
              >
                {isTerminating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Unlatching Solenoid...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Yes, Unlatch &amp; Retrieve Now</span>
                  </>
                )}
              </button>

              <button
                disabled={isTerminating}
                onClick={() => {
                  sound.playTap();
                  setShowConfirmModal(false);
                }}
                className="w-full h-9 rounded-xl border border-[#E2E8F0] text-[#64748B] font-semibold text-xs hover:bg-[#F8FAFC] cursor-pointer"
              >
                Cancel, Keep Charging
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
