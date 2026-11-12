import React, { useState } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { Zap, ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2, Lock, Mail, User, BookOpen } from 'lucide-react';

interface SignUpPageProps {
  onSuccess: (message: string) => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onSuccess }) => {
  const { signUpStudent, setCurrentRoute } = useUniCharge();

  const [fullName, setFullName] = useState('Jastin Alberca');
  const [studentId, setStudentId] = useState('2023-30192');
  const [college, setCollege] = useState('CITC (College of Information Technology and Computing)');
  const [email, setEmail] = useState('jastinalberca8@gmail.com');
  const [password, setPassword] = useState('ustp2026!');
  const [confirmPassword, setConfirmPassword] = useState('ustp2026!');
  const [termsAgreed, setTermsAgreed] = useState(true);

  // Verification modal state
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('492018');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const collegesList = [
    'CITC (College of Information Technology and Computing)',
    'CEA (College of Engineering and Architecture)',
    'CSM (College of Science and Mathematics)',
    'COT (College of Technology)',
    'CPES (College of Physical Education and Sports)',
  ];

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !studentId || !email || !password) {
      setFormError('Please complete all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (!termsAgreed) {
      setFormError('Please agree to the USTP Campus Facility Usage Terms.');
      return;
    }

    setFormError(null);
    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(mockCode);
    setIsOtpModalOpen(true);
  };

  const handleVerifyOtp = () => {
    if (enteredOtp !== generatedOtp && enteredOtp !== '492018') {
      setOtpError('Invalid 6-digit verification code. Please check your simulated OTP.');
      return;
    }

    // Register student
    signUpStudent({
      name: fullName,
      studentId,
      college,
      email,
    });

    setIsOtpModalOpen(false);
    onSuccess(`Account verified! Welcome, ${fullName}. Please log in with your credentials.`);
    setCurrentRoute('login');
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        
        {/* Header Lockup */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1B1448] text-[#FBB03B] shadow-md mb-2 border-2 border-[#FBB03B]/30">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1B1448] tracking-tight">
            Create Student Account
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Join the UniCharge Smart Locker Network across USTP Campus
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xl overflow-hidden p-6 sm:p-8 space-y-5">
          
          <div className="h-1 -mt-6 -mx-6 sm:-mt-8 sm:-mx-8 bg-gradient-to-r from-[#1B1448] via-[#1B1448] to-[#FBB03B] mb-4" />

          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {formError}
            </div>
          )}

          <form onSubmit={handleInitialSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jastin Alberca"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#1B1448] focus:ring-1 focus:ring-[#1B1448]"
                />
              </div>
            </div>

            {/* Student ID & College Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Student ID Number
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. 2023-30192"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#1B1448] focus:ring-1 focus:ring-[#1B1448]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  College / Department
                </label>
                <select
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] text-xs text-slate-900 bg-white focus:outline-none focus:border-[#1B1448]"
                >
                  {collegesList.map(c => (
                    <option key={c} value={c}>{c.split(' ')[0]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Campus Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Campus Email Address
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
              <span className="text-[10px] text-slate-500">Official verification OTP will be transmitted to this inbox.</span>
            </div>

            {/* Password and Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#1B1448]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#1B1448]"
                />
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#1B1448] focus:ring-[#1B1448]"
                />
                <span>
                  I agree to the <strong className="text-[#1B1448]">USTP UniCharge Locker Rules</strong>: Devices left beyond 24 hours are subject to security safekeeping.
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#1B1448] hover:bg-[#1B1448]/90 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Continue to Student ID Verification</span>
              <ArrowRight className="w-4 h-4 text-[#FBB03B]" />
            </button>
          </form>

          {/* Back to Login */}
          <div className="text-center pt-2 border-t border-slate-100">
            <button
              onClick={() => setCurrentRoute('login')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B1448] hover:text-[#FBB03B] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Already registered? Return to Login</span>
            </button>
          </div>

        </div>

      </div>

      {/* Mock OTP / Student ID Verification Confirmation Modal */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl p-6 space-y-5 text-slate-900">
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1B1448]">
                USTP Student Verification
              </h3>
              <p className="text-xs text-slate-500">
                A 6-digit confirmation code was sent to <strong className="text-slate-800">{email}</strong> to verify your student record.
              </p>
            </div>

            {/* Simulated OTP Display Helper */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-center space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold block text-amber-700">
                Simulated Campus Gateway SMS / Email OTP
              </span>
              <span className="font-mono text-xl font-extrabold text-[#1B1448] tracking-widest block">
                {generatedOtp}
              </span>
              <button
                type="button"
                onClick={() => setEnteredOtp(generatedOtp)}
                className="text-[11px] font-bold text-[#1B1448] underline mt-0.5"
              >
                Auto-fill Code ({generatedOtp})
              </button>
            </div>

            {otpError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {otpError}
              </div>
            )}

            {/* Input */}
            <div className="space-y-1.5 text-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Enter 6-Digit Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-48 mx-auto text-center font-mono text-xl tracking-widest py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#1B1448] focus:ring-1 focus:ring-[#1B1448]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOtpModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-[#1B1448] hover:bg-[#1B1448]/90 rounded-xl transition-colors shadow-sm"
              >
                Confirm & Register
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
