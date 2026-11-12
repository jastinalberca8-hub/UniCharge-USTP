import React, { useState, useEffect } from 'react';
import { useUniCharge } from '../context/UniChargeContext';
import {
  User,
  CreditCard,
  Clock,
  Zap,
  QrCode,
  Lock,
  Unlock,
  PlusCircle,
  Receipt,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { TransactionRecord } from '../types';

export const StudentPortal: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    studentsList,
    activeUserSessions,
    transactions,
    topUpWallet,
    extendSession,
    unlockAndEndSession,
    setIsKioskModalOpen,
    setKioskInitialStationId,
    setReceiptModalData,
  } = useUniCharge();

  // Top up modal state
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(100);
  const [topUpMethod, setTopUpMethod] = useState<'GCash' | 'Maya' | 'Campus Cashier'>('GCash');

  // Extend session modal state
  const [extendCompId, setExtendCompId] = useState<string | null>(null);
  const [extendMinutes, setExtendMinutes] = useState<number>(30);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Filter transaction history
  const [txnFilter, setTxnFilter] = useState<'all' | 'wallet' | 'coins'>('all');

  const filteredTransactions = transactions.filter(t => {
    if (txnFilter === 'wallet') return t.paymentMethod === 'wallet';
    if (txnFilter === 'coins') return t.paymentMethod === 'coins';
    return true;
  });

  const handleTopUpConfirm = () => {
    topUpWallet(topUpAmount, topUpMethod);
    setIsTopUpOpen(false);
    setStatusNotification(`Successfully topped up ₱${topUpAmount.toFixed(2)} via ${topUpMethod}!`);
    setTimeout(() => setStatusNotification(null), 4000);
  };

  const handleExtendConfirm = () => {
    if (!extendCompId) return;
    const res = extendSession(extendCompId, extendMinutes);
    setExtendCompId(null);
    setStatusNotification(res.message);
    setTimeout(() => setStatusNotification(null), 4000);
  };

  const handleUnlockClick = (compartmentId: string) => {
    const res = unlockAndEndSession(compartmentId);
    setStatusNotification(res.message);
    setTimeout(() => setStatusNotification(null), 5000);
  };

  return (
    <div className="py-10 bg-slate-50 dark:bg-[#0B192C] min-h-[calc(100vh-4rem)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Toast Notification */}
        {statusNotification && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{statusNotification}</span>
            </div>
            <button onClick={() => setStatusNotification(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Header: Student Profile Banner & Demo Switcher */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121212] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E3E62] to-[#0B192C] dark:from-[#FFC107] dark:to-[#FFB200] flex items-center justify-center font-bold font-mono text-xl text-[#FFC107] dark:text-[#0B192C] shadow-sm">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    {currentUser.name}
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-bold">
                    ACTIVE STUDENT
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 space-x-2 font-mono">
                  <span>ID: {currentUser.studentId}</span>
                  <span>·</span>
                  <span>{currentUser.email}</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {currentUser.program}
                </div>
              </div>
            </div>

            {/* Switch Demo Student Account */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1A1A2E] p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold pl-1">
                Demo User:
              </span>
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const selected = studentsList.find(s => s.id === e.target.value);
                  if (selected) setCurrentUser(selected);
                }}
                className="text-xs bg-white dark:bg-[#0B192C] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:border-[#FFC107]"
              >
                {studentsList.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.studentId})
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Top Grid: E-Wallet Balance + Active Session Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* E-Wallet Balance Card */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121212] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#FFC107]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    USTP Campus E-Wallet
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  RFID: {currentUser.campusCardRfid}
                </span>
              </div>

              <div className="py-6">
                <span className="text-xs text-slate-400 block mb-1">Available Balance</span>
                <div className="text-4xl font-black font-mono text-slate-900 dark:text-white tabular-nums tracking-tight">
                  ₱{currentUser.walletBalance.toFixed(2)}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Auto-deductible for locker fast-charging and temporary campus storage.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <button
                onClick={() => setIsTopUpOpen(true)}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-[#0B192C] bg-[#FFC107] hover:bg-[#FFB200] rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Instant Top-Up</span>
              </button>

              <button
                onClick={() => {
                  setTopUpAmount(50);
                  topUpWallet(50, 'GCash Quick Pay');
                  setStatusNotification('Quick ₱50.00 reload credited!');
                  setTimeout(() => setStatusNotification(null), 3000);
                }}
                className="py-2.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                title="Quick ₱50 Reload"
              >
                +₱50 Fast
              </button>
            </div>
          </div>

          {/* Active Locker Sessions Section */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121212] p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Active Locker Session ({activeUserSessions.length})
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-500">
                MONITORED VIA ESP32 IOT
              </span>
            </div>

            {activeUserSessions.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Active Locker Reserved
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Your devices are with you. Need to charge or store your backpack safely? Reserve a locker from the campus grid.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-4 space-y-4">
                {activeUserSessions.map(({ compartment, session, station }) => {
                  const endTimestamp = new Date(session.endTime).getTime();
                  const remainingMs = Math.max(0, endTimestamp - Date.now());
                  const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
                  const isExpiringSoon = remainingMinutes < 15;

                  return (
                    <div
                      key={session.sessionId}
                      className="p-5 rounded-xl border border-amber-500/40 bg-amber-500/5 dark:bg-[#1A1A2E] space-y-4"
                    >
                      {/* Top Row: Compartment #, Station, and Countdown */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#FFC107] text-[#0B192C] font-mono font-bold text-lg flex items-center justify-center">
                            #{compartment.compartmentNumber}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white text-sm block">
                              {station.name} [{compartment.id}]
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {session.deviceType || 'Device in charging cycle'}
                            </span>
                          </div>
                        </div>

                        {/* Live Timer Countdown */}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Remaining Time
                          </span>
                          <span
                            className={`font-mono text-xl font-black tabular-nums ${
                              isExpiringSoon ? 'text-red-400 animate-pulse' : 'text-[#FFC107]'
                            }`}
                          >
                            {Math.floor(remainingMinutes / 60)}h {remainingMinutes % 60}m
                          </span>
                        </div>
                      </div>

                      {/* Live Hardware Telemetry Strip */}
                      <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-white/80 dark:bg-[#0B192C]/80 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Charging Draw</span>
                          <span className="text-[#FFC107] font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-current" />
                            {compartment.currentPowerDrawWatts.toFixed(1)} W
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Rack Temp</span>
                          <span className="text-slate-700 dark:text-slate-300 font-semibold">
                            {compartment.temperature.toFixed(1)}°C
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Solenoid Door</span>
                          <span className="text-emerald-500 font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            LOCKED
                          </span>
                        </div>
                      </div>

                      {/* PIN & QR Pass Box */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg bg-slate-100 dark:bg-[#121212] border border-slate-200 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-3">
                          <QrCode className="w-8 h-8 text-slate-700 dark:text-slate-300" />
                          <div>
                            <span className="text-slate-400 block text-[10px]">Kiosk One-Time PIN</span>
                            <span className="font-mono text-base font-extrabold text-[#FFC107] tracking-wider">
                              {session.pinCode}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setKioskInitialStationId(station.id);
                            setIsKioskModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-white bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <span>Test on Kiosk Screen</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => handleUnlockClick(compartment.id)}
                          className="flex-1 py-2 px-3 text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 hover:bg-red-600 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Unlock & End Session</span>
                        </button>

                        <button
                          onClick={() => setExtendCompId(compartment.id)}
                          className="py-2 px-4 text-xs font-bold text-[#0B192C] bg-[#FFC107] hover:bg-[#FFB200] rounded-lg transition-colors"
                        >
                          Extend Time
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Transaction History Section */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121212] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Usage & Transaction History
              </h3>
              <p className="text-xs text-slate-500">
                Official records of locker rentals, wallet debits, and coin slot deposits.
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-[#1A1A2E] text-xs">
              <button
                onClick={() => setTxnFilter('all')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  txnFilter === 'all'
                    ? 'bg-white dark:bg-[#0B192C] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTxnFilter('wallet')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  txnFilter === 'wallet'
                    ? 'bg-white dark:bg-[#0B192C] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                E-Wallet
              </button>
              <button
                onClick={() => setTxnFilter('coins')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  txnFilter === 'coins'
                    ? 'bg-white dark:bg-[#0B192C] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Coin Slot
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#0B192C] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Ref Code</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Location / Locker</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                {filteredTransactions.map(txn => (
                  <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-[#1E3E62]/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {txn.id}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-500">
                      {txn.timestamp}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="font-semibold">{txn.stationName}</span>
                      {txn.compartmentNumber > 0 && (
                        <span className="text-slate-400 ml-1">#{txn.compartmentNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {txn.durationMinutes > 0 ? `${txn.durationMinutes} mins` : '—'}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {txn.paymentMethod === 'wallet' ? (
                        <span className="text-sky-500 font-medium">E-Wallet</span>
                      ) : (
                        <span className="text-[#FFC107] font-medium">Coin Slot</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                      ₱{txn.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setReceiptModalData(txn)}
                        className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-slate-600 dark:text-slate-300 hover:text-[#FFC107] transition-colors"
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

      {/* Top-Up Modal */}
      {isTopUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B192C] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Top-Up USTP E-Wallet
              </h3>
              <button onClick={() => setIsTopUpOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Select Preset Reload Amount
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[50, 100, 200, 300, 500].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopUpAmount(amt)}
                      className={`py-2.5 rounded-xl border font-mono font-bold text-sm transition-all ${
                        topUpAmount === amt
                          ? 'border-[#FFC107] bg-[#FFC107]/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      ₱{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Payment Gateway
                </label>
                <div className="space-y-2">
                  {(['GCash', 'Maya', 'Campus Cashier'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTopUpMethod(m)}
                      className={`w-full p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between ${
                        topUpMethod === m
                          ? 'border-[#FFC107] bg-[#FFC107]/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      <span>{m} Online Checkout</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">Instant credit to {currentUser.studentId}</span>
              <button
                onClick={handleTopUpConfirm}
                className="px-5 py-2.5 text-xs font-bold text-[#0B192C] bg-[#FFC107] hover:bg-[#FFB200] rounded-xl shadow-sm"
              >
                Pay ₱{topUpAmount.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Session Modal */}
      {extendCompId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0B192C] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Extend Active Locker Time
            </h3>
            <p className="text-xs text-slate-500">
              Need more time? Deduct from your wallet to extend without visiting the kiosk.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[30, 60, 120].map(mins => (
                <button
                  key={mins}
                  onClick={() => setExtendMinutes(mins)}
                  className={`p-3 rounded-xl border text-center font-mono text-xs font-bold ${
                    extendMinutes === mins
                      ? 'border-[#FFC107] bg-[#FFC107]/10 text-[#FFC107]'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
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
                className="flex-1 py-2 text-xs font-semibold text-slate-500 hover:text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendConfirm}
                className="flex-1 py-2 text-xs font-bold text-[#0B192C] bg-[#FFC107] hover:bg-[#FFB200] rounded-lg"
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
