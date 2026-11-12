import React, { useState } from 'react';
import { useUniCharge } from '../context/UniChargeContext';
import { PaymentMethod } from '../types';
import {
  X,
  Zap,
  Lock,
  Laptop,
  Smartphone,
  CreditCard,
  Coins,
  QrCode,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const LockerModal: React.FC = () => {
  const {
    isBookingModalOpen,
    setIsBookingModalOpen,
    bookingTarget,
    stations,
    currentUser,
    bookLocker,
    setActiveStudentTab,
    setIsKioskModalOpen,
    setKioskInitialStationId,
  } = useUniCharge();

  const [durationHours, setDurationHours] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [deviceType, setDeviceType] = useState<string>('MacBook / Phone');
  const [bookingResult, setBookingResult] = useState<{
    success: boolean;
    qrToken: string;
    pinCode: string;
    message: string;
  } | null>(null);

  if (!isBookingModalOpen || !bookingTarget) return null;

  const targetStation = stations.find(s => s.id === bookingTarget.stationId);
  const targetComp = targetStation?.compartments.find(
    c => c.compartmentNumber === bookingTarget.compartmentNumber
  );

  if (!targetStation || !targetComp) return null;

  const hourlyRate = targetComp.size === 'large' ? 15 : 10;
  const totalCost = hourlyRate * durationHours;
  const hasSufficientBalance = currentUser.walletBalance >= totalCost;

  const handleConfirmReservation = () => {
    const res = bookLocker(
      targetStation.id,
      targetComp.compartmentNumber,
      durationHours,
      paymentMethod,
      deviceType
    );
    setBookingResult(res);
  };

  const handleClose = () => {
    setIsBookingModalOpen(false);
    setBookingResult(null);
  };

  const handleOpenKioskWithPin = () => {
    setKioskInitialStationId(targetStation.id);
    setIsBookingModalOpen(false);
    setIsKioskModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-[#E5E7EB] shadow-2xl overflow-hidden transition-colors text-slate-900">
        
        {/* Top Brand Stripe */}
        <div className="h-1 bg-gradient-to-r from-[#1B1448] via-[#1B1448] to-[#FBB03B]" />

        {/* Modal Header */}
        <div className="p-5 border-b border-[#E5E7EB] bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1B1448] text-[#FBB03B] flex items-center justify-center font-mono font-bold text-lg shadow-xs">
              #{targetComp.compartmentNumber.toString().padStart(2, '0')}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1B1448]">
                {targetComp.size === 'large' ? 'Large Locker (Laptop / Bag)' : 'Standard Locker (Phone / Tablet)'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {targetStation.name} · [{targetComp.id}]
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {bookingResult ? (
            /* Success State with Dynamic QR & PIN */
            <div className="space-y-5 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-lg font-extrabold text-[#1B1448]">
                  Reservation Confirmed!
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Compartment #{targetComp.compartmentNumber} is ready at {targetStation.buildingCode}.
                </p>
              </div>

              {/* Dynamic QR & PIN Box */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-[#E5E7EB] space-y-3">
                <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center">
                  <QrCode className="w-28 h-28 text-slate-900" />
                </div>

                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
                    One-Time 6-Digit Kiosk PIN
                  </span>
                  <span className="font-mono text-3xl font-black text-[#1B1448] tracking-widest tabular-nums block mt-0.5">
                    {bookingResult.pinCode.split('').join(' ')}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  Token: {bookingResult.qrToken}
                </div>
              </div>

              {/* Navigation CTAs */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleOpenKioskWithPin}
                  className="w-full py-2.5 px-3 text-xs font-bold text-[#1B1448] bg-[#FBB03B] hover:bg-[#FBB03B]/90 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>Open Kiosk Simulator</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    handleClose();
                    setActiveStudentTab('dashboard');
                  }}
                  className="w-full py-2.5 px-3 text-xs font-bold text-white bg-[#1B1448] hover:bg-[#1B1448]/90 rounded-xl transition-colors"
                >
                  View in Dashboard
                </button>
              </div>
            </div>
          ) : (
            /* Reservation Form */
            <>
              {/* Hardware Specs Preview */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-[#E5E7EB] text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Charging Outlet</span>
                  <span className="font-mono font-bold text-[#1B1448] flex items-center gap-1 mt-0.5">
                    <Zap className="w-3.5 h-3.5 text-[#FBB03B] fill-current" />
                    65W USB-PD
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">AC Socket</span>
                  <span className="font-mono font-bold text-slate-800 block mt-0.5">
                    220V 60Hz
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Dimensions</span>
                  <span className="font-mono font-bold text-slate-800 block mt-0.5">
                    {targetComp.size === 'large' ? '18"×14"×6"' : '12"×8"×5"'}
                  </span>
                </div>
              </div>

              {/* Select Duration */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Select Usage Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(hours => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => setDurationHours(hours)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        durationHours === hours
                          ? 'border-[#1B1448] bg-slate-50 text-[#1B1448] font-bold ring-1 ring-[#1B1448]'
                          : 'border-[#E5E7EB] hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="text-sm block">{hours} {hours === 1 ? 'Hour' : 'Hours'}</span>
                      <span className="text-xs font-mono font-bold text-[#1B1448] block tabular-nums">
                        ₱{(hourlyRate * hours).toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Device Description (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Device Being Stored
                </label>
                <input
                  type="text"
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  placeholder="e.g. MacBook Pro, iPad, Realme Phone"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5E7EB] text-xs text-slate-900 bg-white focus:outline-none focus:border-[#1B1448]"
                />
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      paymentMethod === 'wallet'
                        ? 'border-[#1B1448] bg-slate-50 text-[#1B1448] ring-1 ring-[#1B1448]'
                        : 'border-[#E5E7EB] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-4 h-4 text-[#FBB03B]" />
                      <span className="text-xs font-bold">USTP E-Wallet</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 block tabular-nums">
                      Bal: ₱{currentUser.walletBalance.toFixed(2)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('coins')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      paymentMethod === 'coins'
                        ? 'border-[#1B1448] bg-slate-50 text-[#1B1448] ring-1 ring-[#1B1448]'
                        : 'border-[#E5E7EB] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Coins className="w-4 h-4 text-[#FBB03B]" />
                      <span className="text-xs font-bold">Coin Slot</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 block">
                      Drop ₱5, ₱10, ₱20 coins
                    </span>
                  </button>
                </div>
              </div>

              {/* Insufficient Balance Warning */}
              {paymentMethod === 'wallet' && !hasSufficientBalance && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>
                    Insufficient E-Wallet balance. Required ₱{totalCost.toFixed(2)}, currently ₱{currentUser.walletBalance.toFixed(2)}. Please choose Coin Slot or reload wallet.
                  </span>
                </div>
              )}

              {/* Summary Bar */}
              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Total Due</span>
                  <span className="text-2xl font-mono font-black text-[#1B1448] tabular-nums">
                    ₱{totalCost.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={handleConfirmReservation}
                  disabled={paymentMethod === 'wallet' && !hasSufficientBalance}
                  className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-sm ${
                    paymentMethod === 'wallet' && !hasSufficientBalance
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-[#1B1448] hover:bg-[#1B1448]/90 text-white active:scale-95'
                  }`}
                >
                  Confirm & Generate Locker Token
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
