import React, { useRef, useState, useEffect } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { sound } from '../../utils/audio';
import { UserAvatar } from '../brand/UserAvatar';
import {
  Camera,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Mail,
  IdCard,
  Building2,
  GraduationCap,
  Calendar,
  Wallet,
  BatteryCharging,
  Save,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';

interface UserProfileViewProps {
  onBackToDashboard: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ onBackToDashboard }) => {
  const { currentUser, activeSession, updateUserProfile } = useUniCharge();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(currentUser?.name ?? '');
  const [college, setCollege] = useState(currentUser?.college ?? '');
  const [degree, setDegree] = useState(currentUser?.degree ?? '');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setCollege(currentUser.college);
      setDegree(currentUser.degree);
    }
  }, [currentUser?.id]);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const hasCustomPhoto = Boolean(
    currentUser.avatar && currentUser.avatar.trim() !== '' && currentUser.avatar !== 'default'
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', text: 'Please select a valid image file (PNG, JPG, WEBP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', text: 'Image must be smaller than 5MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        sound.playTap();
        updateUserProfile({ avatar: reader.result });
        setFeedback({ type: 'success', text: 'Profile picture updated from your file explorer.' });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetAvatar = () => {
    sound.playTap();
    updateUserProfile({ avatar: '' });
    setFeedback({ type: 'success', text: 'Profile picture reset to default avatar.' });
  };

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({ type: 'error', text: 'Full name cannot be empty.' });
      return;
    }
    sound.playTap();
    updateUserProfile({
      name: name.trim(),
      college: college.trim(),
      degree: degree.trim(),
    });
    setFeedback({ type: 'success', text: 'Personal information saved successfully.' });
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            onClick={() => {
              sound.playTap();
              onBackToDashboard();
            }}
            className="text-xs font-semibold text-[#4E6E81] hover:text-[#5BC496] inline-flex items-center gap-1 mb-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {isAdmin ? 'Fleet Dashboard' : 'Dashboard'}</span>
          </button>
          <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">
            My Profile &amp; Account Status
          </h1>
          <p className="text-sm text-[#64748B]">
            View your institutional status, personal details, and upload a profile picture from your device.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#EBF9F3] border border-[#5BC496]/50 text-xs font-bold text-[#1E293B] self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-[#5BC496] animate-pulse" />
          <span>Account Active · {isAdmin ? 'Admin Role' : 'Student Role'}</span>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-[#EBF9F3] border-[#5BC496]/50 text-[#1E293B]'
              : 'bg-red-50 border-red-200 text-[#DC2626]'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#5BC496] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Avatar & Status Summary */}
        <div className="lg:col-span-5 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 space-y-5">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <UserAvatar
                src={currentUser.avatar}
                name={currentUser.name}
                size="xl"
                className="border-2 border-[#4E6E81]/30 shadow-xs"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Choose profile picture from file explorer"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#4E6E81] hover:bg-[#3D5767] text-white flex items-center justify-center border-2 border-white shadow-md cursor-pointer transition-colors"
              >
                <Camera className="w-4 h-4 text-[#5BC496]" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <h2 className="text-lg font-bold text-[#1E293B] mt-3">{currentUser.name}</h2>
            <span className="text-xs font-mono font-semibold text-[#4E6E81]">
              {currentUser.studentIdNumber}
            </span>
            <p className="text-xs text-[#64748B] mt-1">{currentUser.degree}</p>

            <div className="w-full flex flex-col gap-2 mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-10 rounded-xl bg-[#4E6E81] hover:bg-[#3D5767] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <Camera className="w-4 h-4 text-[#5BC496]" />
                <span>Choose Picture from File Explorer</span>
              </button>

              {hasCustomPhoto && (
                <button
                  type="button"
                  onClick={handleResetAvatar}
                  className="w-full h-9 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Use Default Profile Avatar</span>
                </button>
              )}
            </div>
          </div>

          {/* Account Status Breakdown */}
          <div className="pt-4 border-t border-[#E2E8F0] space-y-2.5 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
              Account Status &amp; Telemetry
            </span>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
              <span className="text-[#64748B] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#5BC496]" /> Verification Status
              </span>
              <span className="font-bold text-[#1E293B]">Verified USTP</span>
            </div>

            {!isAdmin && (
              <>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-[#64748B] flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-[#4E6E81]" /> E-Wallet Balance
                  </span>
                  <span className="font-mono font-bold text-[#4E6E81]">
                    ₱{currentUser.walletBalance.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-[#64748B] flex items-center gap-1.5">
                    <BatteryCharging className="w-4 h-4 text-[#5BC496]" /> Locker Session
                  </span>
                  <span className="font-mono font-semibold text-[#1E293B]">
                    {activeSession ? `Active · Slot #${activeSession.slotNumber}` : 'Idle'}
                  </span>
                </div>
              </>
            )}

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
              <span className="text-[#64748B] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#4E6E81]" /> Member Since
              </span>
              <span className="font-mono text-[#1E293B]">{currentUser.createdAt}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Personal Information Editor */}
        <div className="lg:col-span-7 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6">
          <h3 className="text-base font-bold text-[#4E6E81] mb-1">Personal Information</h3>
          <p className="text-xs text-[#64748B] mb-5">
            Institutional email and ID are bound to your USTP RBAC record.
          </p>

          <form onSubmit={handleSaveInfo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full h-10 px-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:border-[#4E6E81] focus:ring-2 focus:ring-[#4E6E81]/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                  {isAdmin ? 'Staff ID Number' : 'USTP Student ID'}
                </label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={currentUser.studentIdNumber}
                    disabled
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm font-mono text-[#64748B] cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                USTP Campus Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#64748B] cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                College / Department
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:border-[#4E6E81] focus:ring-2 focus:ring-[#4E6E81]/15"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                {isAdmin ? 'Role Title' : 'Degree / Program'}
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                <input
                  type="text"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:border-[#4E6E81] focus:ring-2 focus:ring-[#4E6E81]/15"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 h-10 rounded-xl bg-[#5BC496] hover:bg-[#48AD80] text-[#1E293B] text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Save Personal Info</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
