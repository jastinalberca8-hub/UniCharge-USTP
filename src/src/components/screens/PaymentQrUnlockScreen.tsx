import React, { useState } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { sound } from '../../utils/audio';
import { formatDuration } from '../../utils/format';
import { PRICING_RATES } from '../../data/mockData';
import { QrMatrixSvg } from '../hardware/QrMatrixSvg';
import {
  QrCode,
  Wallet,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Clock,
  RotateCcw,
} from 'lucide-react';

interface PaymentQrUnlockScreenProps {
  onUnlockSuccess: () => void;
  onBackToConfig: () => void;
}

export const PaymentQrUnlockScreen: React.FC<PaymentQrUnlockScreenProps> = ({
  onUnlockSuccess,
  onBackToConfig,
}) => {
  const {
    selectedStation,
    selectedSlot,
    selectedService,
    selectedSize,
    selectedDuration,
    calculateFee,
    student,
    pendingUnlockToken,
    pendingSecondsLeft,
    generateUnlockToken,
    regenerateUnlockToken,
    activeSession,
  } = useUniCharge();

  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'gcash' | 'maya' | 'cash'>(
    'wallet'
  );
  const [statusError, setStatusError] = useState<string | null>(null);

  const totalFee = calculateFee(selectedSize, selectedDuration, selectedService);
  const targetSlotNumber = selectedSlot?.slotNumber || 1;

  const handleGenerateQr = () => {
    setStatusError(null);
    const res = generateUnlockToken(paymentMethod);
    if (!res.success) {
      setStatusError(res.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-[#1E293B] overflow-y-auto">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-[#FFFFFF]/95 backdrop-blur-md px-4 pt-3 pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => {
              sound.playTap();
              onBackToConfig();
            }}
            className="text-xs font-semibold text-[#4E6E81] hover:text-[#3D5767] flex items-center gap-1 cursor-pointer"
          >
            ← Modify Booking
          </button>
          <span className="text-[10px] font-bold text-[#48AD80] uppercase tracking-wider">
            Step 2 of 2
          </span>
        </div>
        <h1 className="text-base font-bold text-[#1E293B] tracking-tight">
          Payment &amp; Kiosk QR Authorization
        </h1>
      </div>

      <div className="px-4 py-3 space-y-3.5 flex-1">
        {/* If session became active via Kiosk Scan, show success shortcut */}
        {activeSession && !pendingUnlockToken && (
          <div className="p-3.5 rounded-2xl bg-[#EBF9F3] border border-[#5BC496] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1E293B]">
              <CheckCircle2 className="w-4 h-4 text-[#5BC496]" />
              <span>Kiosk Verified! Slot #{activeSession.slotNumber} Active</span>
            </div>
            <button
              onClick={onUnlockSuccess}
              className="w-full h-9 rounded-xl bg-[#4E6E81] text-white text-xs font-bold cursor-pointer hover:bg-[#3D5767]"
            >
              View Active Session Telemetry →
            </button>
          </div>
        )}

        {/* Active Generated QR inside Phone Companion */}
        {pendingUnlockToken ? (
          <div className="p-4 rounded-2xl bg-[#FFFFFF] border-2 border-[#5BC496] shadow-xs text-center space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#4E6E81]">
                {pendingUnlockToken.stationCode} · Slot #{pendingUnlockToken.slotNumber}
              </span>
              <span
                className={`font-mono font-bold flex items-center gap-1 ${
                  pendingSecondsLeft === 0 ? 'text-[#DC2626]' : 'text-[#48AD80]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {pendingSecondsLeft}s
              </span>
            </div>

            <div className="inline-block p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <QrMatrixSvg
                value={pendingUnlockToken.qrPayload}
                size={136}
                foreground="#1E293B"
                accent="#5BC496"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                6-Digit Kiosk PIN
              </span>
              <span className="text-lg font-extrabold font-mono tracking-[0.2em] text-[#4E6E81]">
                {pendingUnlockToken.pinCode}
              </span>
            </div>

            <p className="text-[11px] text-[#64748B] leading-relaxed bg-[#EDF2F5] p-2.5 rounded-xl">
              Tap <strong>&lsquo;Scan QR&rsquo;</strong> on the 8-Door Kiosk touchscreen beside this phone to unlatch Compartment #{pendingUnlockToken.slotNumber}.
            </p>

            {pendingSecondsLeft === 0 && (
              <button
                onClick={regenerateUnlockToken}
                className="w-full h-9 rounded-xl bg-[#F59E0B] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Regenerate 60s Unlock QR</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* PAYMENT METHOD SELECTOR */}
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                Select Payment Method
              </label>

              <div className="space-y-2">
                <div
                  onClick={() => {
                    sound.playTap();
                    setPaymentMethod('wallet');
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'wallet'
                      ? 'bg-[#EDF2F5] border-[#4E6E81]'
                      : 'bg-[#FFFFFF] border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        paymentMethod === 'wallet'
                          ? 'bg-[#4E6E81] text-[#5BC496]'
                          : 'bg-[#EDF2F5] text-[#4E6E81]'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#1E293B]">USTP Campus E-Wallet</h4>
                      <span className="text-[11px] text-[#64748B] font-mono">
                        Balance: ₱{student.walletBalance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      paymentMethod === 'wallet'
                        ? 'border-[#4E6E81] bg-[#5BC496]'
                        : 'border-[#CBD5E1]'
                    }`}
                  />
                </div>

                {(
                  [
                    { id: 'gcash', label: 'GCash Digital Wallet', sub: 'Link 09** *** 1924', tag: 'GCash' },
                    { id: 'maya', label: 'Maya Philippines', sub: 'Instant QRPH', tag: 'Maya' },
                  ] as const
                ).map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      sound.playTap();
                      setPaymentMethod(m.id);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      paymentMethod === m.id
                        ? 'bg-[#EDF2F5] border-[#4E6E81]'
                        : 'bg-[#FFFFFF] border-[#E2E8F0]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#EDF2F5] text-[#4E6E81] flex items-center justify-center font-bold text-[10px]">
                        {m.tag}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[#1E293B]">{m.label}</h4>
                        <span className="text-[11px] text-[#64748B]">{m.sub}</span>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        paymentMethod === m.id
                          ? 'border-[#4E6E81] bg-[#5BC496]'
                          : 'border-[#CBD5E1]'
                      }`}
                    />
                  </div>
                ))}

                <div
                  onClick={() => {
                    sound.playTap();
                    setPaymentMethod('cash');
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'cash'
                      ? 'bg-[#EDF2F5] border-[#4E6E81]'
                      : 'bg-[#FFFFFF] border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#EDF2F5] text-[#4E6E81] flex items-center justify-center">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#1E293B]">Kiosk Coin / Cash Slot</h4>
                      <span className="text-[11px] text-[#64748B]">₱5, ₱10, or ₱20 coins at kiosk</span>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      paymentMethod === 'cash'
                        ? 'border-[#4E6E81] bg-[#5BC496]'
                        : 'border-[#CBD5E1]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* SUMMARY CARD */}
            <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B]">Target Kiosk:</span>
                <span className="font-semibold text-[#1E293B]">{selectedStation.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B]">Compartment:</span>
                <span className="font-bold text-[#4E6E81] font-mono">
                  Slot #{targetSlotNumber} ({selectedSize} · {PRICING_RATES[selectedSize].power.split(' ')[0]})
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B]">Duration / Total:</span>
                <span className="font-bold text-sm text-[#4E6E81] font-mono">
                  {formatDuration(selectedDuration)} · ₱{totalFee}.00
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#EDF2F5] text-[11px] text-[#1E293B] flex items-start gap-2">
                <Shield className="w-4 h-4 text-[#4E6E81] shrink-0 mt-0.5" />
                <span>
                  Generates a 60s Unlock QR &amp; PIN to scan on the physical kiosk touchscreen.
                </span>
              </div>
            </div>

            {statusError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#DC2626] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{statusError}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* STICKY BOTTOM BUTTON */}
      {!pendingUnlockToken && (
        <div className="sticky bottom-0 p-3 bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#E2E8F0] z-20">
          <button
            onClick={handleGenerateQr}
            className="w-full h-11 rounded-xl bg-[#4E6E81] text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#3D5767] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
          >
            <QrCode className="w-4 h-4 text-[#5BC496]" />
            <span>Generate Kiosk Unlock QR (₱{totalFee})</span>
          </button>
        </div>
      )}
    </div>
  );
};
