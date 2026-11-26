import React, { useEffect, useState } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import {
  ALLOWED_USTP_COLLEGE_VALUES,
  USTP_COLLEGES,
  getCoursesForCollege,
  isCourseValidForCollege,
} from '../../constants/colleges';
import { sound } from '../../utils/audio';
import { UniChargeLogo } from '../brand/UniChargeLogo';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Building2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STUDENT_ID_REGEX = /^[A-Za-z0-9-]{4,24}$/;

export const UnifiedAuthPage: React.FC = () => {
  const {
    currentRoute,
    navigate,
    loginWithAccount,
    loginWithGoogle,
    sendSignupVerificationCode,
    registerStudentAccount,
    sendPasswordResetCode,
    resetPasswordWithCode,
    accessDeniedMessage,
    authSuccessMessage,
    clearAuthSuccess,
  } = useUniCharge();

  const isSignUp = currentRoute === '/signup';

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotPreviewUrl, setForgotPreviewUrl] = useState<string | null>(null);
  const [forgotCooldown, setForgotCooldown] = useState(0);

  // Signup form state
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [college, setCollege] = useState('');
  const [course, setCourse] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupStep, setSignupStep] = useState<'details' | 'verify'>('details');
  const availableCourses = getCoursesForCollege(college);
  const [verificationCode, setVerificationCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [verificationBanner, setVerificationBanner] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0 && forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
      setForgotCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown, forgotCooldown]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setAuthLoading(true);
    const result = await loginWithAccount(identifier, password);
    setAuthLoading(false);
    if (!result.success) {
      setErrorBanner(result.error || 'Invalid email/ID or password');
    }
  };

  const handleGoogleLogin = async () => {
    setErrorBanner(null);
    setGoogleLoading(true);
    const result = await loginWithGoogle();
    setGoogleLoading(false);
    if (!result.success && !result.cancelled) {
      setErrorBanner(result.error || 'Google Sign-In failed. Please try again.');
    }
  };

  const triggerSendVerification = async () => {
    setErrorBanner(null);
    setVerificationBanner(null);

    const cleanName = fullName.trim();
    const cleanId = studentId.trim();
    const cleanEmail = signupEmail.trim().toLowerCase();

    if (cleanName.length < 2) {
      setErrorBanner('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!STUDENT_ID_REGEX.test(cleanId)) {
      setErrorBanner(
        'Enter a valid Student ID (4–24 letters, numbers, or hyphens, e.g. 2024-30512).'
      );
      return;
    }

    if (!college || !ALLOWED_USTP_COLLEGE_VALUES.has(college)) {
      setErrorBanner('Please select your College from the dropdown menu.');
      return;
    }

    if (!course) {
      setErrorBanner('Please select your Course / Program from the dropdown menu.');
      return;
    }

    if (!isCourseValidForCollege(college, course)) {
      setErrorBanner('Selected course does not belong to the chosen college.');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setErrorBanner('Please enter a valid USTP or personal email address.');
      return;
    }

    if (signupPassword.length < 6) {
      setErrorBanner('Password must be at least 6 characters.');
      return;
    }

    if (signupPassword !== confirmPassword) {
      setErrorBanner('Passwords do not match.');
      return;
    }

    setAuthLoading(true);
    const sendRes = await sendSignupVerificationCode({
      name: cleanName,
      studentIdNumber: cleanId,
      email: cleanEmail,
      password: signupPassword,
      college,
      course,
    });
    setAuthLoading(false);

    if (!sendRes.success) {
      setErrorBanner(sendRes.error || 'Unable to send verification code.');
      return;
    }

    const safePreviewUrl =
      sendRes.previewUrl &&
      (sendRes.previewUrl.startsWith('https://') ||
        sendRes.previewUrl.startsWith('http://'))
        ? sendRes.previewUrl
        : null;

    setEmailPreviewUrl(safePreviewUrl);
    setVerificationCode('');
    setResendCooldown(30);
    setSignupStep('verify');
    setVerificationBanner(
      `A 6-digit verification code has been sent to ${sendRes.email || cleanEmail}.`
    );
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await triggerSendVerification();
  };

  const handleVerifyAndComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!college || !ALLOWED_USTP_COLLEGE_VALUES.has(college)) {
      setErrorBanner('Please select your College from the dropdown menu.');
      return;
    }

    if (!course || !isCourseValidForCollege(college, course)) {
      setErrorBanner('Selected course does not belong to the chosen college.');
      return;
    }

    const cleanCode = verificationCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setErrorBanner('Please enter the 6-digit verification code from your email.');
      return;
    }

    setAuthLoading(true);
    const res = await registerStudentAccount({
      name: fullName.trim(),
      studentIdNumber: studentId.trim(),
      email: signupEmail.trim().toLowerCase(),
      password: signupPassword,
      college,
      course,
      verificationCode: cleanCode,
    });
    setAuthLoading(false);

    if (!res.success) {
      setErrorBanner(res.error || 'Unable to verify code and complete registration.');
    } else {
      setFullName('');
      setStudentId('');
      setSignupEmail('');
      setCollege('');
      setCourse('');
      setSignupPassword('');
      setConfirmPassword('');
      setVerificationCode('');
      setEmailPreviewUrl(null);
      setVerificationBanner(null);
      setSignupStep('details');
    }
  };

  const triggerSendPasswordReset = async () => {
    setForgotError(null);
    const cleanIdentifier = forgotIdentifier.trim();
    if (!cleanIdentifier) {
      setForgotError('Please enter your registered USTP/personal email or USTP Student ID.');
      return;
    }

    setForgotLoading(true);
    const res = await sendPasswordResetCode(cleanIdentifier);
    setForgotLoading(false);

    if (!res.success) {
      setForgotError(res.error || 'Unable to send password reset code.');
      return;
    }

    const safePreviewUrl =
      res.previewUrl &&
      (res.previewUrl.startsWith('https://') || res.previewUrl.startsWith('http://'))
        ? res.previewUrl
        : null;

    setForgotMaskedEmail(res.maskedEmail || cleanIdentifier);
    setForgotPreviewUrl(safePreviewUrl);
    setForgotCode('');
    setForgotCooldown(30);
    setForgotStep('verify');
  };

  const handleForgotRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await triggerSendPasswordReset();
  };

  const handleForgotResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    const cleanCode = forgotCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setForgotError('Please enter the 6-digit password reset code from your email.');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError('New password must be at least 6 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    const res = await resetPasswordWithCode({
      identifier: forgotIdentifier.trim(),
      verificationCode: cleanCode,
      newPassword: forgotNewPassword,
    });
    setForgotLoading(false);

    if (!res.success) {
      setForgotError(res.error || 'Unable to reset password.');
      return;
    }

    setIdentifier(forgotIdentifier.trim());
    setPassword('');
    setErrorBanner(null);
    setForgotCode('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotPreviewUrl(null);
    setForgotStep('request');
    setShowForgotModal(false);
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

              {accessDeniedMessage && (
                <div
                  role="alert"
                  className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                  <span>{accessDeniedMessage}</span>
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
                        setForgotStep('request');
                        setForgotError(null);
                        setForgotCode('');
                        setForgotNewPassword('');
                        setForgotConfirmPassword('');
                        setForgotPreviewUrl(null);
                        setForgotIdentifier(identifier.trim());
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
                  disabled={authLoading}
                  className="group w-full h-11 rounded-xl bg-[#4E6E81] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#3D5767] active:scale-[0.99] transition-all cursor-pointer shadow-sm mt-2 disabled:opacity-60"
                >
                  <span>{authLoading ? 'Signing In...' : 'Sign In'}</span>
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
                      setSignupStep('details');
                      setVerificationBanner(null);
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
                  {signupStep === 'details'
                    ? 'Create Student Account'
                    : 'Verify Your Email Address'}
                </h1>
                <p className="text-sm text-[#64748B] mt-1">
                  {signupStep === 'details'
                    ? 'Register with your USTP ID and USTP or personal email. We will email a 6-digit verification code to confirm your account.'
                    : 'Enter the 6-digit verification code sent to your inbox to complete sign-up.'}
                </p>
              </div>

              {verificationBanner && signupStep === 'verify' && (
                <div
                  role="status"
                  className="mb-4 p-3 rounded-xl bg-[#EBF9F3] border border-[#5BC496]/50 text-[#1E293B] text-xs font-medium flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#5BC496] shrink-0" />
                    <span>{verificationBanner}</span>
                  </div>
                  <p className="text-[11px] text-[#475569] pl-6">
                    Didn&apos;t see it in Primary Inbox? Check your Spam, Promotions, or All Mail folder, or double-check your email spelling.
                  </p>
                  {emailPreviewUrl && (
                    <a
                      href={emailPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#4E6E81] underline font-semibold pl-6"
                    >
                      Open test email preview
                    </a>
                  )}
                </div>
              )}

              {errorBanner && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                  <span>{errorBanner}</span>
                </div>
              )}

              {signupStep === 'details' ? (
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
                      <label
                        htmlFor="signup-college"
                        className="block text-xs font-semibold text-[#1E293B] mb-1"
                      >
                        College
                      </label>
                      <select
                        id="signup-college"
                        value={college}
                        onChange={(e) => {
                          setCollege(e.target.value);
                          setCourse('');
                        }}
                        required
                        className="w-full h-10 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-xs text-[#1E293B] focus:outline-none focus:border-[#4E6E81]"
                      >
                        <option value="" disabled>
                          Select College...
                        </option>
                        {USTP_COLLEGES.map((col) => (
                          <option key={col.code} value={col.value}>
                            {col.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-course"
                      className="block text-xs font-semibold text-[#1E293B] mb-1"
                    >
                      Course / Program
                    </label>
                    <select
                      id="signup-course"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      disabled={!college}
                      required
                      className="w-full h-10 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-xs text-[#1E293B] focus:outline-none focus:border-[#4E6E81] focus:ring-2 focus:ring-[#4E6E81]/15 disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>
                        {college ? 'Select Course / Program...' : 'Select a college first...'}
                      </option>
                      {availableCourses.map((prog) => (
                        <option key={prog} value={prog}>
                          {prog}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                      USTP or Personal Email
                    </label>
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="m.santos@ustp.edu.ph or name@gmail.com"
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
                    disabled={authLoading}
                    className="group w-full h-11 rounded-xl bg-[#5BC496] text-[#1E293B] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#48AD80] active:scale-[0.99] transition-all cursor-pointer shadow-sm mt-2 disabled:opacity-60"
                  >
                    <span>
                      {authLoading ? 'Sending Verification Code...' : 'Create Account'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#1E293B] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyAndComplete} className="space-y-4">
                  <div>
                    <label
                      htmlFor="verification-code"
                      className="block text-xs font-semibold text-[#1E293B] mb-1.5"
                    >
                      6-Digit Verification Code
                    </label>
                    <div className="relative">
                      <ShieldCheck className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3" />
                      <input
                        id="verification-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) =>
                          setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        placeholder="000000"
                        required
                        autoFocus
                        className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-base font-mono tracking-[0.35em] text-center text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#4E6E81] focus:ring-2 focus:ring-[#4E6E81]/15"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="group w-full h-11 rounded-xl bg-[#5BC496] text-[#1E293B] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#48AD80] active:scale-[0.99] transition-all cursor-pointer shadow-sm disabled:opacity-60"
                  >
                    <span>
                      {authLoading ? 'Verifying & Creating...' : 'Verify & Complete Sign-Up'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#1E293B] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setErrorBanner(null);
                        setSignupStep('details');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Edit details</span>
                    </button>

                    <button
                      type="button"
                      disabled={authLoading || resendCooldown > 0}
                      onClick={triggerSendVerification}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4E6E81] hover:text-[#5BC496] disabled:text-[#94A3B8] cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>
                        {resendCooldown > 0
                          ? `Resend in ${resendCooldown}s`
                          : 'Resend code'}
                      </span>
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-5 pt-4 border-t border-[#E2E8F0] text-center">
                <p className="text-xs text-[#64748B]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setErrorBanner(null);
                      setSignupStep('details');
                      setVerificationBanner(null);
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

            {forgotError && (
              <div
                role="alert"
                className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-medium flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotStep === 'request' ? (
              <form onSubmit={handleForgotRequestSubmit} className="mt-2 space-y-3">
                <p className="text-xs text-[#64748B] text-center">
                  Enter your registered email or USTP Student ID and we will send a 6-digit reset code to your account email.
                </p>
                <div>
                  <label
                    htmlFor="forgot-identifier"
                    className="block text-xs font-semibold text-[#1E293B] mb-1"
                  >
                    USTP/Personal Email or ID Number
                  </label>
                  <input
                    id="forgot-identifier"
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="jastinalberca8@gmail.com or 2023-30192"
                    autoFocus
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:border-[#4E6E81]"
                  />
                </div>
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
                    disabled={forgotLoading}
                    className="flex-1 h-10 rounded-xl bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] cursor-pointer disabled:opacity-60"
                  >
                    {forgotLoading ? 'Sending Code...' : 'Send Reset Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotResetSubmit} className="mt-2 space-y-3">
                <div className="p-3 rounded-xl bg-[#EBF9F3] border border-[#5BC496]/50 text-[#1E293B] text-xs flex flex-col gap-1">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#5BC496] shrink-0 mt-0.5" />
                    <span>
                      A 6-digit password reset code has been sent to{' '}
                      <strong className="font-mono">{forgotMaskedEmail}</strong>.
                    </span>
                  </div>
                  <p className="text-[11px] text-[#475569] pl-6">
                    Check Inbox, Spam, or Promotions if you don&apos;t see it within 30 seconds.
                  </p>
                  {forgotPreviewUrl && (
                    <a
                      href={forgotPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#4E6E81] underline font-semibold pl-6"
                    >
                      Open test email preview
                    </a>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="forgot-code"
                    className="block text-xs font-semibold text-[#1E293B] mb-1"
                  >
                    6-Digit Reset Code
                  </label>
                  <input
                    id="forgot-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={forgotCode}
                    onChange={(e) =>
                      setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="000000"
                    required
                    autoFocus
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm font-mono tracking-[0.3em] text-center text-[#1E293B] focus:outline-none focus:border-[#4E6E81]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="forgot-new-password"
                    className="block text-xs font-semibold text-[#1E293B] mb-1"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="forgot-new-password"
                      type={showForgotNewPassword ? 'text' : 'password'}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      className="w-full h-10 pl-3 pr-9 rounded-xl border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:border-[#4E6E81]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword((prev) => !prev)}
                      aria-label={showForgotNewPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-2.5 text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                    >
                      {showForgotNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="forgot-confirm-password"
                    className="block text-xs font-semibold text-[#1E293B] mb-1"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="forgot-confirm-password"
                    type="password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:border-[#4E6E81]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full h-10 rounded-xl bg-[#5BC496] hover:bg-[#48AD80] text-[#1E293B] text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {forgotLoading ? 'Resetting Password...' : 'Verify Code & Reset Password'}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setForgotError(null);
                      setForgotStep('request');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change email/ID</span>
                  </button>

                  <button
                    type="button"
                    disabled={forgotLoading || forgotCooldown > 0}
                    onClick={triggerSendPasswordReset}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#4E6E81] hover:text-[#5BC496] disabled:text-[#94A3B8] cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>
                      {forgotCooldown > 0 ? `Resend in ${forgotCooldown}s` : 'Resend code'}
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full h-9 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
