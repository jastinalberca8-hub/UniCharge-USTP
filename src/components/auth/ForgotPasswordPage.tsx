import React, { useState } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { Zap, ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail, KeyRound } from 'lucide-react';

interface ForgotPasswordPageProps {
  onSuccess: (message: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onSuccess }) => {
  const { setCurrentRoute } = useUniCharge();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('jastinalberca8@gmail.com');
  const [generatedCode, setGeneratedCode] = useState('628104');
  const [enteredCode, setEnteredCode] = useState('');
  const [newPassword, setNewPassword] = useState('ustp2026!');
  const [confirmPassword, setConfirmPassword] = useState('ustp2026!');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }
    setErrorMsg(null);
    const mockPin = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(mockPin);
    setStep(2);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredCode !== generatedCode && enteredCode !== '628104') {
      setErrorMsg('Invalid 6-digit verification code.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    onSuccess('Password updated successfully! You can now sign in with your new password.');
    setCurrentRoute('login');
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Header Lockup */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1B1448] text-[#FBB03B] shadow-md mb-2 border-2 border-[#FBB03B]/30">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1B1448] tracking-tight">
            Reset Account Password
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            UniCharge Smart Locker Identity Recovery
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xl overflow-hidden p-6 sm:p-8 space-y-5">
          
          <div className="h-1 -mt-6 -mx-6 sm:-mt-8 sm:-mx-8 bg-gradient-to-r from-[#1B1448] via-[#1B1448] to-[#FBB03B] mb-4" />

          {/* Stepper Indicator */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
            <span className={`font-bold ${step === 1 ? 'text-[#1B1448]' : 'text-slate-400'}`}>
              Step 1: Verify Email
            </span>
            <span className="text-slate-300">→</span>
            <span className={`font-bold ${step === 2 ? 'text-[#1B1448]' : 'text-slate-400'}`}>
              Step 2: Set New Password
            </span>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}

          {step === 1 ? (
            /* Step 1: Request Code */
            <form onSubmit={handleSendCode} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter your registered USTP campus email or student email address. A 6-digit security code will be dispatched to verify your account.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Registered Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. jastinalberca8@gmail.com or j.alberca@ustp.edu.ph"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#1B1448] focus:ring-1 focus:ring-[#1B1448]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#1B1448] hover:bg-[#1B1448]/90 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Send 6-Digit Verification Code</span>
                <ArrowRight className="w-4 h-4 text-[#FBB03B]" />
              </button>
            </form>
          ) : (
            /* Step 2: Enter Code & New Password */
            <form onSubmit={handleResetPassword} className="space-y-4">
              
              {/* Simulated OTP Helper */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-center space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold block text-amber-700">
                  Simulated OTP Sent to {email}
                </span>
                <span className="font-mono text-xl font-extrabold text-[#1B1448] tracking-widest block">
                  {generatedCode}
                </span>
                <button
                  type="button"
                  onClick={() => setEnteredCode(generatedCode)}
                  className="text-[11px] font-bold text-[#1B1448] underline mt-0.5"
                >
                  Auto-fill ({generatedCode})
                </button>
              </div>

              {/* Code Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 628104"
                  required
                  className="w-full px-3.5 py-2.5 font-mono text-center tracking-widest text-base rounded-xl border border-[#E5E7EB] text-slate-900 bg-white focus:outline-none focus:border-[#1B1448]"
                />
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#1B1448]"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#1B1448]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#1B1448] hover:bg-[#1B1448]/90 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Save New Password & Sign In</span>
                <CheckCircle2 className="w-4 h-4 text-[#FBB03B]" />
              </button>
            </form>
          )}

          {/* Back button */}
          <div className="text-center pt-2 border-t border-slate-100">
            <button
              onClick={() => setCurrentRoute('login')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B1448] hover:text-[#FBB03B] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancel and return to Login</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
