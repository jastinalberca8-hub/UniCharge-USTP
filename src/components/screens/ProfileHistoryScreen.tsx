import React, { useState, useRef } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { sound } from '../../utils/audio';
import { formatDuration } from '../../utils/format';
import { UserAvatar } from '../brand/UserAvatar';
import {
  Wallet,
  Bell,
  Fingerprint,
  PhoneCall,
  Download,
  Plus,
  ShieldCheck,
  LogOut,
  Zap,
  Camera,
} from 'lucide-react';
import { SessionHistoryItem } from '../../types';

export const ProfileHistoryScreen: React.FC = () => {
  const {
    student,
    sessionHistory,
    topUpWallet,
    toggleBiometrics,
    togglePushNotifications,
    updateUserProfile,
    logout,
  } = useUniCharge();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'settings'>('profile');
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<SessionHistoryItem | null>(null);

  const handleMobileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        sound.playTap();
        updateUserProfile({ avatar: reader.result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleTopUp = (amount: number) => {
    topUpWallet(amount);
    setShowTopUpModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-[#1E293B] overflow-y-auto pb-6">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-[#FFFFFF]/95 backdrop-blur-md px-4 pt-3 pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-[#4E6E81] uppercase tracking-wider">
            USTP Student Account
          </span>
          <button
            onClick={logout}
            className="text-xs font-semibold text-[#DC2626] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-[#EDF2F5] p-1 rounded-xl border border-[#E2E8F0]">
          {(
            [
              { id: 'profile', label: 'Wallet' },
              { id: 'history', label: `History (${sessionHistory.length})` },
              { id: 'settings', label: 'Settings' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                sound.playTap();
                setActiveTab(t.id);
              }}
              className={`py-1.5 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === t.id
                  ? 'bg-[#4E6E81] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 space-y-3.5">
        {activeTab === 'profile' && (
          <div className="space-y-3.5">
            {/* Student ID Card */}
            <div className="p-4 rounded-2xl bg-[#4E6E81] text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <UserAvatar
                    src={student.avatar}
                    name={student.name}
                    size="lg"
                    className="rounded-xl border-2 border-[#5BC496]"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Change profile picture"
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#5BC496] text-[#1E293B] flex items-center justify-center shadow cursor-pointer"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleMobileFileChange}
                    className="hidden"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold text-white truncate">{student.name}</h2>
                    <ShieldCheck className="w-4 h-4 text-[#5BC496] shrink-0" />
                  </div>
                  <span className="text-xs text-[#EBF9F3] font-mono font-semibold block">
                    ID: {student.studentIdNumber}
                  </span>
                  <span className="text-[10px] text-slate-200 block truncate">
                    {student.college}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-[11px] text-slate-200 font-mono">
                <span className="truncate">{student.email}</span>
                <span className="text-[#5BC496] font-bold shrink-0 ml-2">Active</span>
              </div>
            </div>

            {/* Campus E-Wallet Card */}
            <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#EDF2F5] text-[#4E6E81] flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[#1E293B]">Campus E-Wallet</span>
                </div>
                <button
                  onClick={() => {
                    sound.playTap();
                    setShowTopUpModal(true);
                  }}
                  className="px-3 py-1 rounded-lg bg-[#5BC496] text-[#1E293B] font-bold text-xs flex items-center gap-1 hover:bg-[#48AD80] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Top Up</span>
                </button>
              </div>

              <div>
                <span className="text-2xl font-extrabold text-[#1E293B] font-mono">
                  ₱{student.walletBalance.toFixed(2)}
                </span>
                <span className="text-[11px] text-[#64748B] block mt-0.5">
                  Zero merchant surcharge across all USTP campus kiosks.
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E2E8F0]">
                {[100, 200, 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleTopUp(amt)}
                    className="py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold text-[#4E6E81] font-mono hover:border-[#4E6E81] cursor-pointer"
                  >
                    +₱{amt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2.5">
            {sessionHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  sound.playTap();
                  setSelectedReceipt(item);
                }}
                className="p-3 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#4E6E81] transition-all cursor-pointer flex items-start justify-between gap-2"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EDF2F5] text-[#4E6E81] flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-[#5BC496]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1E293B]">{item.stationName}</h4>
                    <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
                      Slot #{item.slotNumber} · {formatDuration(item.durationMinutes)} · {item.date}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-[#4E6E81] font-mono block">
                    ₱{item.totalFee}.00
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#EBF9F3] text-[#1E293B] border border-[#5BC496]/40 font-semibold">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EDF2F5] text-[#4E6E81] flex items-center justify-center">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#1E293B] block">Biometric Lock</span>
                  <span className="text-[10px] text-[#64748B]">Face ID / Fingerprint retrieval</span>
                </div>
              </div>
              <button
                onClick={toggleBiometrics}
                className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer ${
                  student.biometricEnabled ? 'bg-[#5BC496]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                    student.biometricEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EDF2F5] text-[#4E6E81] flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#1E293B] block">Charging Alerts</span>
                  <span className="text-[10px] text-[#64748B]">Notify at 80% &amp; 100%</span>
                </div>
              </div>
              <button
                onClick={togglePushNotifications}
                className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer ${
                  student.pushNotifications ? 'bg-[#5BC496]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                    student.pushNotifications ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#4E6E81]">
                <PhoneCall className="w-3.5 h-3.5 text-[#5BC496]" />
                <span>USTP CITC Hardware Support</span>
              </div>
              <div className="text-[11px] text-[#64748B] font-mono">
                Hotline: (088) 856-1738 · CITC Room 204
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TOP UP MODAL */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-5 shadow-2xl text-[#1E293B]">
            <h3 className="text-base font-bold text-[#1E293B]">Top Up Campus E-Wallet</h3>
            <p className="text-xs text-[#64748B] mt-1 mb-4">
              Select an amount to reload via GCash or Maya.
            </p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleTopUp(amt)}
                  className="py-2.5 rounded-xl bg-[#EDF2F5] border border-[#E2E8F0] font-mono font-bold text-sm text-[#4E6E81] hover:bg-[#4E6E81] hover:text-white cursor-pointer"
                >
                  +₱{amt}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTopUpModal(false)}
              className="w-full h-9 rounded-xl border border-[#E2E8F0] text-[#64748B] font-semibold text-xs hover:bg-[#F8FAFC] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-5 shadow-2xl text-[#1E293B] space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <div>
                <span className="text-[10px] text-[#4E6E81] font-bold uppercase tracking-wider">
                  Official E-Receipt
                </span>
                <h3 className="text-sm font-bold font-mono text-[#1E293B]">
                  {selectedReceipt.receiptNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-xs text-[#64748B] hover:text-[#1E293B] cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Station:</span>
                <span className="font-semibold text-[#1E293B]">{selectedReceipt.stationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Slot:</span>
                <span className="font-mono text-[#1E293B]">#{selectedReceipt.slotNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Paid:</span>
                <span className="font-mono font-bold text-[#4E6E81]">
                  ₱{selectedReceipt.totalFee}.00
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedReceipt(null)}
              className="w-full h-9 rounded-xl bg-[#4E6E81] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#3D5767] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#5BC496]" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
