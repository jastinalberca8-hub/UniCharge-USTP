import React, { useState } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { sound } from '../../utils/audio';
import { UniChargeLogo } from '../brand/UniChargeLogo';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Building2,
} from 'lucide-react';

export const UnifiedAuthPage: React.FC = () => {
  const {
    currentRoute,
    navigate,
    loginWithAccount,
    loginWithGoogle,
    registerStudentAccount,
    authSuccessMessage,
    clearAuthSuccess,
  } = useUniCharge();

  const isSignUp = currentRoute === '/signup';

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Signup form state
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [college, setCollege] = useState('College of Information Technology and Computing (CITC)');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    const result = loginWithAccount(identifier, password);
    if (!result.success) {
      setErrorBanner(result.error || 'Invalid email/ID or password');
    }
  };

  const handleGoogleLogin = async () => {
    setErrorBanner(null);
    setGoogleLoading(true);
    const result = await loginWithGoogle();
    setGoogleLoading(false);
    if (!result.success) {
      setErrorBanner(result.error || 'Google Sign-In failed. Please try again.');
    }
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (signupPassword !== confirmPassword) {
      setErrorBanner('Passwords do not match.');
      return;
    }

    if (signupPassword.length < 6) {
      setErrorBanner('Password must be at least 6 characters.');
      return;
    }

    const res = registerStudentAccount({
      name: fullName,
      studentIdNumber: studentId,
      email: signupEmail,
      password: signupPassword,
      college,
    });

    if (!res.success) {
      setErrorBanner(res.error || 'Unable to create account.');
    } else {
      setFullName('');
      setStudentId('');
      setSignupEmail('');
      setSignupPassword('');
      setConfirmPassword('');
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playTap();
    setForgotSent(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between text-[#1E293B]">
      {/* Subtle Institutional Top Bar */}
      <header className="w-full bg-[#FFFFFF] border-b border-[#E2E8F0] px-6 py-3 flex items-center justify-between">
        <UniChargeLogo
          variant="horizontal"
          size="sm"
          subtitle="Smart Campus Charging & Locker Platform"
        />
        <div className="hidden sm:flex items-center gap-2 text-xs text-[#64748B]">
          <Building2 className="w-3.5 h-3.5 text-[#4E6E81]" />
          <span>University of Science and Technology of Southern Philippines</span>
        </div>
      </header>

      {/* Main Centered Auth Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {!isSignUp ? (
            /* UNIFIED SIGN-IN CARD (/login) */
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] border-t-4 border-t-[#4E6E81] shadow-sm p-7">
              <div className="mb-6 flex flex-col items-center text-center">
                <UniChargeLogo variant="stacked" size="md" className="mb-4" />
                <h1 className="text-xl font-bold text-[#1E293B] tracking-tight">
                  Sign In to UniCharge
                </h1>
                <p className="text-sm text-[#64748B] mt-1">
                  Enter your USTP credentials to access your portal.
                </p>
              </div>

              {authSuccessMessage && (
                <div
                  role="status"
                  className="mb-5 p-3 rounded-xl bg-[#EBF9F3] border border-[#5BC496]/50 text-[#1E293B] text-xs font-medium flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#5BC496] shrink-0" />
                  <span>{authSuccessMessage}</span>
                </div>
              )}

              {errorBanner && (
                <div
                  role="alert"
                  className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                  <span>{errorBanner}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-xs font-semibold text-[#1E293B] mb-1.5"
                  >
                    USTP Campus Email or ID Number
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3" />
                    <input
                      id="login-identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="jastinalberca8@gmail.com or 2023-30192"
                      required
                      className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#4E6E81] focus:ring-2 focus:ring-[#4E6E81]/15 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-[#1E293B]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setForgotSent(false);
                        setForgotEmail(identifier.includes('@') ? identifier : '');
                        setShowForgotModal(true);
                      }}
                      className="text-xs font-medium text-[#4E6E81] hover:text-[#5BC496] transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full h-10 pl-10 pr-10 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#4E6E81] focus:ring-2 focus:ring-[#4E6E81]/15 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-2.5 text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="group w-full h-11 rounded-xl bg-[#4E6E81] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#3D5767] active:scale-[0.99] transition-all cursor-pointer shadow-sm mt-2"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 text-[#5BC496] group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E2E8F0]" />
                <span className="text-[11px] font-medium text-[#94A3B8] uppercase">or</span>
                <div className="h-px flex-1 bg-[#E2E8F0]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full h-10 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-[#1E293B] font-semibold text-xs flex items-center justify-center gap-2.5 hover:bg-[#F8FAFC] hover:border-[#4E6E81]/50 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              <div className="mt-6 pt-4 border-t border-[#E2E8F0] text-center">
                <p className="text-xs text-[#64748B]">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setErrorBanner(null);
                      clearAuthSuccess();
                      navigate('/signup');
                    }}
                    className="font-semibold text-[#4E6E81] hover:text-[#5BC496] transition-colors cursor-pointer"
                  >
                    Create Student Account
                  </button>
                </p>
              </div>
            </div>
          ) : (
            /* STUDENT REGISTRATION CARD (/signup) */
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] border-t-4 border-t-[#4E6E81] shadow-sm p-7">
              <div className="mb-5 flex flex-col items-center text-center">
                <UniChargeLogo variant="stacked" size="md" className="mb-3" />
                <h1 className="text-xl font-bold text-[#1E293B] tracking-tight">
                  Create Student Account
                </h1>
                <p className="text-sm text-[#64748B] mt-1">
                  Register with your USTP ID and campus email. Student portal access is provisioned automatically.
                </p>
              </div>

              {errorBanner && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                  <span>{errorBanner}</span>
                </div>
              )}

              <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Maria Clara Santos"
                    required
                    className="w-full h-10 px-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#4E6E81] focus:ring-2 focus:ring-[#4E6E81]/15"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                      USTP Student ID
                    </label>
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="2024-30512"
                      required
                      className="w-full h-10 px-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm font-mono text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#4E6E81] focus:ring-2 focus:ring-[#4E6E81]/15"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                      College
                    </label>
                    <select
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-xs text-[#1E293B] focus:outline-none focus:border-[#4E6E81]"
                    >
                      <option value="College of Information Technology and Computing (CITC)">CITC</option>
                      <option value="College of Engineering and Architecture (CEA)">CEA</option>
                      <option value="College of Science and Mathematics (CSM)">CSM</option>
                      <option value="College of Technology (COT)">COT</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                    USTP Campus Email
                  </label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="m.santos@ustp.edu.ph"
                    required
                    className="w-full h-10 px-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#4E6E81] focus:ring-2 focus:ring-[#4E6E81]/15"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      className="w-full h-10 px-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#4E6E81]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                      className="w-full h-10 px-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#4E6E81]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="group w-full h-11 rounded-xl bg-[#5BC496] text-[#1E293B] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#48AD80] active:scale-[0.99] transition-all cursor-pointer shadow-sm mt-2"
                >
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 text-[#1E293B] group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-[#E2E8F0] text-center">
                <p className="text-xs text-[#64748B]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setErrorBanner(null);
                      navigate('/login');
                    }}
                    className="font-semibold text-[#4E6E81] hover:text-[#5BC496] transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="py-4 px-6 text-center text-xs text-[#64748B] border-t border-[#E2E8F0] bg-[#FFFFFF]">
        UniCharge Smart Campus Locker System · USTP Cagayan de Oro
      </footer>

      {/* Password Reset Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] border-t-4 border-t-[#4E6E81] shadow-xl p-6">
            <div className="flex flex-col items-center text-center mb-4">
              <UniChargeLogo variant="stacked" size="sm" className="mb-3" />
              <h3 className="text-base font-bold text-[#1E293B]">Reset UniCharge Password</h3>
            </div>
            {forgotSent ? (
              <div className="mt-3 space-y-4">
                <div className="p-3 rounded-xl bg-[#EBF9F3] border border-[#5BC496]/40 text-[#1E293B] text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5BC496] shrink-0 mt-0.5" />
                  <span>
                    If an account matches <strong className="font-mono">{forgotEmail}</strong>, a reset link has been dispatched to your campus inbox.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full h-10 rounded-xl bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="mt-2 space-y-3">
                <p className="text-xs text-[#64748B] text-center">
                  Enter your USTP campus email or ID number and we will send recovery instructions.
                </p>
                <input
                  type="text"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="jastinalberca8@gmail.com"
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:border-[#4E6E81]"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 h-10 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-10 rounded-xl bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
