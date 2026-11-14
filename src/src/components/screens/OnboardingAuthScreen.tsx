import React, { useState } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { sound } from '../../utils/audio';
import { Shield, Zap, Lock, Fingerprint, Mail, KeyRound, ArrowRight, CheckCircle2, Building2 } from 'lucide-react';

export const OnboardingAuthScreen: React.FC = () => {
  const { loginDemo, loginWithCredentials } = useUniCharge();
  const [mode, setMode] = useState<'welcome' | 'login' | 'otp'>('welcome');
  const [studentId, setStudentId] = useState('2021-301924');
  const [email, setEmail] = useState('j.alberca@ustp.edu.ph');
  const [otp, setOtp] = useState(['8', '4', '2', '1', '', '']);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val[0];
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    sound.playTap();
  };

  const handleProceedToOtp = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playTap();
    if (!studentId.trim() || !email.trim()) {
      setErrorMsg('Please enter your USTP Student ID and webmail.');
      return;
    }
    if (!email.toLowerCase().includes('@ustp.edu.ph') && !email.includes('@')) {
      setErrorMsg('Please enter a valid USTP campus email (@ustp.edu.ph).');
      return;
    }
    setErrorMsg('');
    setOtp(['8', '4', '2', '1', '9', '0']);
    setMode('otp');
  };

  const handleVerifyOtp = () => {
    sound.playTap();
    loginWithCredentials(studentId, email);
  };

  return (
    <div className="flex flex-col min-h-full bg-[#0B192C] text-white">
      {/* Welcome Screen */}
      {mode === 'welcome' && (
        <div className="flex-1 flex flex-col justify-between p-6">
          {/* Header Brand */}
          <div className="pt-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#FFC107] text-[#0B192C] flex items-center justify-center font-bold text-2xl shadow-lg shadow-[#FFC107]/20">
                <Zap className="w-7 h-7 fill-[#0B192C]" />
              </div>
              <div>
                <span className="text-2xl font-bold tracking-tight text-white block">
                  UniCharge<span className="text-[#FFC107]">.</span>
                </span>
                <span className="text-xs font-medium text-slate-300 tracking-wide uppercase">
                  USTP Smart Campus Lockers
                </span>
              </div>
            </div>

            {/* Campus Photo Hero Banner */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl mb-6 aspect-video">
              <img
                src="/src/assets/images/ustp_campus_drone_1794365236993.jpg"
                alt="University of Science and Technology of Southern Philippines"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B192C] via-[#0B192C]/40 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <div className="flex items-center gap-2 text-xs text-[#FFC107] font-semibold mb-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Cagayan de Oro Main Campus</span>
                </div>
                <p className="text-xs text-slate-200">
                  Fast 65W–140W PD charging & tamper-proof physical storage.
                </p>
              </div>
            </div>

            {/* Value Proposition Cards */}
            <div className="space-y-3">
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#1E3E62]/40 border border-[#1E3E62]">
                <div className="w-9 h-9 rounded-lg bg-[#FFC107]/15 text-[#FFC107] flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">High-Speed GaN Charging</h3>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    65W to 140W multi-protocol USB-C & MagSafe inside ventilated fire-safe lockers.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#1E3E62]/40 border border-[#1E3E62]">
                <div className="w-9 h-9 rounded-lg bg-emerald-400/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Smart Solenoid Security</h3>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    Anti-theft tamper accelerometers and thermal protection monitored in real time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-6 pb-2 space-y-3">
            <button
              onClick={() => {
                sound.playTap();
                setMode('login');
              }}
              className="w-full h-12 rounded-xl bg-[#FFC107] text-[#0B192C] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FFC107]/25 hover:bg-[#FFB200] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Get Started with USTP ID</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={loginDemo}
              className="w-full h-11 rounded-xl bg-[#1E3E62] text-white font-medium text-xs flex items-center justify-center gap-2 hover:bg-[#254d79] active:scale-[0.98] transition-all border border-slate-600/50 cursor-pointer"
            >
              <span>Quick Demo Sign In (Engr. Justin Alberca)</span>
            </button>
            <p className="text-center text-[11px] text-slate-400">
              USTP Information and Communications Technology Division
            </p>
          </div>
        </div>
      )}

      {/* Login Screen */}
      {mode === 'login' && (
        <div className="flex-1 flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center justify-between mb-6 pt-2">
              <button
                onClick={() => {
                  sound.playTap();
                  setMode('welcome');
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Back
              </button>
              <span className="text-xs font-semibold text-[#FFC107] uppercase tracking-wider">
                Student Verification
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">Enter Your USTP Portal ID</h2>
              <p className="text-xs text-slate-300 mt-1">
                Authenticate with your university student number to access the campus smart locker network.
              </p>
            </div>

            <form onSubmit={handleProceedToOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  USTP Student ID Number
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. 2021-301924"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#121212] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FFC107]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Campus Webmail (@ustp.edu.ph)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name.surname@ustp.edu.ph"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#121212] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FFC107]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Portal Password / PIN
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    defaultValue="••••••••"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#121212] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FFC107]"
                  />
                </div>
              </div>

              {/* Biometric Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1E3E62]/30 border border-[#1E3E62] mt-2">
                <div className="flex items-center gap-2.5">
                  <Fingerprint className="w-5 h-5 text-[#FFC107]" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Face ID / Biometric Lock</span>
                    <span className="text-[11px] text-slate-400">Quick locker retrieval without typing PIN</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setBiometricEnabled(!biometricEnabled);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    biometricEnabled ? 'bg-[#FFC107]' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-[#0B192C] absolute top-0.5 transition-transform ${
                      biometricEnabled ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-500/40 text-xs text-red-200">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#FFC107] text-[#0B192C] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FFC107]/20 hover:bg-[#FFB200] active:scale-[0.98] transition-all cursor-pointer mt-4"
              >
                <span>Send 6-Digit Verification OTP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="pt-4 text-center">
            <button
              onClick={loginDemo}
              className="text-xs text-slate-400 hover:text-[#FFC107] transition-colors"
            >
              Skip verification & continue as Test Student →
            </button>
          </div>
        </div>
      )}

      {/* OTP Screen */}
      {mode === 'otp' && (
        <div className="flex-1 flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center justify-between mb-6 pt-2">
              <button
                onClick={() => {
                  sound.playTap();
                  setMode('login');
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Back
              </button>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Code Sent
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">Verify Student Identity</h2>
              <p className="text-xs text-slate-300 mt-1">
                We sent a 6-digit confirmation code to <span className="text-[#FFC107] font-medium">{email}</span>.
              </p>
            </div>

            <div className="flex justify-between gap-2 my-6">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  className="w-12 h-14 text-center font-bold text-xl rounded-xl bg-[#121212] border border-slate-700 text-white focus:outline-none focus:border-[#FFC107] focus:bg-[#1A1A2E]"
                />
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-[#1E3E62]/40 border border-[#1E3E62] text-xs text-slate-300 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Student Profile:</span>
                <span className="font-semibold text-white">Justin Alberca</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="text-white">CITC · BS Information Technology</span>
              </div>
            </div>
          </div>

          <div className="pt-6 pb-2 space-y-3">
            <button
              onClick={handleVerifyOtp}
              className="w-full h-12 rounded-xl bg-[#FFC107] text-[#0B192C] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FFC107]/20 hover:bg-[#FFB200] active:scale-[0.98] transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify & Enter UniCharge Hub</span>
            </button>

            <button
              onClick={() => {
                sound.playTap();
                setOtp(['8', '4', '2', '1', '9', '0']);
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-[#FFC107]"
            >
              Didn't receive code? Resend SMS / Webmail OTP
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
