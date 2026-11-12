import React, { useState } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { Zap, Shield, GraduationCap, Lock, Mail, ArrowRight, CheckCircle2, UserCheck } from 'lucide-react';

interface LoginPageProps {
  successMessage?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ successMessage }) => {
  const { authRole, setAuthRole, loginAsStudent, loginAsAdmin, setCurrentRoute, currentUser, currentAdmin } = useUniCharge();
  
  const [emailOrId, setEmailOrId] = useState(authRole === 'student' ? 'jastinalberca8@gmail.com' : 'admin.unicharge@ustp.edu.ph');
  const [password, setPassword] = useState('ustp2026!');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleChange = (role: 'student' | 'admin') => {
    setAuthRole(role);
    setErrorMessage(null);
    if (role === 'student') {
      setEmailOrId('jastinalberca8@gmail.com');
      setPassword('ustp2026!');
    } else {
      setEmailOrId('admin.unicharge@ustp.edu.ph');
      setPassword('admin2026!');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrId.trim()) {
      setErrorMessage(authRole === 'student' ? 'Please enter your USTP Email or Student ID' : 'Please enter your Admin Email or Employee ID');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    if (authRole === 'student') {
      loginAsStudent(emailOrId);
    } else {
      loginAsAdmin(emailOrId);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Centered Institutional Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* USTP Official Crest Header Lockup */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1B1448] text-[#FBB03B] shadow-md mb-3 border-2 border-[#FBB03B]/30">
            <Zap className="w-7 h-7 fill-current" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1B1448] tracking-tight">
            UniCharge <span className="text-[#FBB03B]">USTP</span>
          </h1>
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mt-0.5">
            Smart Campus Charging & Storage Platform
          </p>
          <div className="mt-1 text-[11px] text-slate-400 font-medium">
            University of Science and Technology of Southern Philippines
          </div>
        </div>

        {/* Card Enclosure */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xl overflow-hidden">
          
          {/* Top Brand Stripe */}
          <div className="h-1.5 bg-gradient-to-r from-[#1B1448] via-[#1B1448] to-[#FBB03B]" />

          {/* Role Toggle Tabs */}
          <div className="grid grid-cols-2 border-b border-[#E5E7EB] bg-slate-50/50">
            <button
              type="button"
              onClick={() => handleRoleChange('student')}
              className={`py-3.5 text-xs font-bold transition-all flex items-center justify-center gap-2 border-b-2 ${
                authRole === 'student'
                  ? 'border-[#FBB03B] text-[#1B1448] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-[#FBB03B]" />
              <span>Student Login</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`py-3.5 text-xs font-bold transition-all flex items-center justify-center gap-2 border-b-2 ${
                authRole === 'admin'
                  ? 'border-[#FBB03B] text-[#1B1448] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-4 h-4 text-[#1B1448]" />
              <span>Admin / Staff Login</span>
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            
            {/* Success Banner (from reset password or signup) */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Role Helper Banner */}
            <div className="p-3 rounded-xl bg-slate-50 border border-[#E5E7EB] text-xs text-slate-600 flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#1B1448] block">
                  {authRole === 'student' ? 'Student Access Portal' : 'Campus Administration Portal'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {authRole === 'student' ? 'Routes to /student/dashboard' : 'Routes to /admin/dashboard'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1B1448] text-white">
                {authRole.toUpperCase()}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email / ID Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  {authRole === 'student' ? 'USTP Campus Email or Student ID' : 'Institutional Email or Staff ID'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={emailOrId}
                    onChange={(e) => setEmailOrId(e.target.value)}
                    placeholder={authRole === 'student' ? 'e.g. jastinalberca8@gmail.com or 2023-30192' : 'e.g. admin.unicharge@ustp.edu.ph'}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#1B1448] focus:ring-1 focus:ring-[#1B1448] transition-colors"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setCurrentRoute('forgot-password')}
                    className="text-xs font-semibold text-[#1B1448] hover:text-[#FBB03B] transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#1B1448] focus:ring-1 focus:ring-[#1B1448] transition-colors"
                  />
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#1B1448] focus:ring-[#1B1448]"
                  />
                  <span className="text-xs text-slate-600 font-medium">Keep me signed in on this campus kiosk</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#1B1448] hover:bg-[#1B1448]/90 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Sign In to {authRole === 'student' ? 'Student Dashboard' : 'Admin Facility Control'}</span>
                <ArrowRight className="w-4 h-4 text-[#FBB03B]" />
              </button>
            </form>

            {/* Quick Demo Pre-fill helpers for effortless evaluation */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block text-center">
                Instant 1-Click Evaluation Credentials
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    handleRoleChange('student');
                    setEmailOrId('jastinalberca8@gmail.com');
                    setPassword('ustp2026!');
                  }}
                  className="p-2 rounded-lg border border-[#E5E7EB] hover:border-[#FBB03B] bg-slate-50 text-left transition-colors"
                >
                  <span className="font-bold text-[#1B1448] block text-[11px]">Student Account</span>
                  <span className="text-[10px] text-slate-500 block truncate">Jastin Alberca (CITC)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleRoleChange('admin');
                    setEmailOrId('admin.unicharge@ustp.edu.ph');
                    setPassword('admin2026!');
                  }}
                  className="p-2 rounded-lg border border-[#E5E7EB] hover:border-[#1B1448] bg-slate-50 text-left transition-colors"
                >
                  <span className="font-bold text-[#1B1448] block text-[11px]">Admin Officer</span>
                  <span className="text-[10px] text-slate-500 block truncate">Engr. Roland Morales</span>
                </button>
              </div>
            </div>

            {/* Sign Up Redirect */}
            {authRole === 'student' && (
              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  New USTP Trailblazer?{' '}
                  <button
                    onClick={() => setCurrentRoute('signup')}
                    className="font-bold text-[#1B1448] hover:text-[#FBB03B] underline underline-offset-2 transition-colors"
                  >
                    Create Student UniCharge Account
                  </button>
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Footer Notice */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          Authorized for USTP Students, Faculty & Personnel · Information Technology Services
        </p>

      </div>
    </div>
  );
};
