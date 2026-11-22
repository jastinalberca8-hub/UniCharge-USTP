import React, { useState } from 'react';
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
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  GraduationCap,
  IdCard,
  LogOut,
  User,
} from 'lucide-react';

const STUDENT_ID_REGEX = /^[A-Za-z0-9-]{4,24}$/;

export const GoogleOnboardingPage: React.FC = () => {
  const { currentUser, completeGoogleOnboarding, logout } = useUniCharge();

  const [fullName, setFullName] = useState(currentUser?.name || '');
  const initialCollege =
    currentUser?.college && ALLOWED_USTP_COLLEGE_VALUES.has(currentUser.college)
      ? currentUser.college
      : '';
  const [college, setCollege] = useState(initialCollege);
  const [course, setCourse] = useState(
    initialCollege &&
      currentUser?.degree &&
      isCourseValidForCollege(initialCollege, currentUser.degree)
      ? currentUser.degree
      : ''
  );
  const [studentId, setStudentId] = useState(
    currentUser?.studentIdNumber && !currentUser.studentIdNumber.startsWith('USTP-')
      ? currentUser.studentIdNumber
      : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const availableCourses = getCoursesForCollege(college);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    const cleanName = fullName.trim();
    const cleanId = studentId.trim();

    if (cleanName.length < 2) {
      setErrorBanner('Please enter your full name (at least 2 characters).');
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

    if (!STUDENT_ID_REGEX.test(cleanId)) {
      setErrorBanner(
        'Enter a valid USTP Student ID (4–24 letters, numbers, or hyphens, e.g. 2023-30192).'
      );
      return;
    }

    setSubmitting(true);
    const res = await completeGoogleOnboarding({
      name: cleanName,
      studentIdNumber: cleanId,
      college,
      course,
    });
    setSubmitting(false);

    if (!res.success) {
      setErrorBanner(res.error || 'Failed to save your onboarding details.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between text-[#1E293B]">
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

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] border-t-4 border-t-[#4E6E81] shadow-sm p-7">
          <div className="mb-5 flex flex-col items-center text-center">
            <UniChargeLogo variant="stacked" size="md" className="mb-3" />
            <h1 className="text-xl font-bold text-[#1E293B] tracking-tight">
              Complete Your Student Profile
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              Welcome to UniCharge USTP. Select your College and enter your official Student ID to activate your portal.
            </p>
          </div>

          {currentUser?.email && (
            <div className="mb-5 p-3 rounded-xl bg-[#EBF9F3] border border-[#5BC496]/50 text-xs text-[#1E293B] flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#5BC496] shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold">Google Account Verified</div>
                <div className="text-[#475569] truncate">{currentUser.email}</div>
              </div>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="onboarding-name"
                className="block text-xs font-semibold text-[#1E293B] mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3" />
                <input
                  id="onboarding-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jastin Alberca"
                  required
                  className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#4E6E81] focus:ring-2 focus:ring-[#4E6E81]/15"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="onboarding-college"
                className="block text-xs font-semibold text-[#1E293B] mb-1.5"
              >
                College
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3 pointer-events-none" />
                <select
                  id="onboarding-college"
                  value={college}
                  onChange={(e) => {
                    setCollege(e.target.value);
                    setCourse('');
                  }}
                  required
                  className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:border-[#4E6E81] focus:ring-2 focus:ring-[#4E6E81]/15"
                >
                  <option value="" disabled>
                    Select your College...
                  </option>
                  {USTP_COLLEGES.map((col) => (
                    <option key={col.code} value={col.value}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="onboarding-course"
                className="block text-xs font-semibold text-[#1E293B] mb-1.5"
              >
                Course / Program
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3 pointer-events-none" />
                <select
                  id="onboarding-course"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  disabled={!college}
                  required
                  className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:border-[#4E6E81] focus:ring-2 focus:ring-[#4E6E81]/15 disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] disabled:cursor-not-allowed"
                >
                  <option value="" disabled>
                    {college ? 'Select your Course / Program...' : 'Select a college first...'}
                  </option>
                  {availableCourses.map((prog) => (
                    <option key={prog} value={prog}>
                      {prog}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="onboarding-student-id"
                className="block text-xs font-semibold text-[#1E293B] mb-1.5"
              >
                USTP Student ID Number
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3" />
                <input
                  id="onboarding-student-id"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. 2023-30192"
                  required
                  className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm font-mono text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#4E6E81] focus:ring-2 focus:ring-[#4E6E81]/15"
                />
              </div>
              <p className="mt-1 text-[11px] text-[#64748B]">
                Enter your official USTP Student ID (4–24 characters, letters, numbers, or hyphens).
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group w-full h-11 rounded-xl bg-[#5BC496] text-[#1E293B] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#48AD80] active:scale-[0.99] transition-all cursor-pointer shadow-sm mt-2 disabled:opacity-60"
            >
              <span>{submitting ? 'Saving Profile...' : 'Save & Go to Dashboard'}</span>
              <ArrowRight className="w-4 h-4 text-[#1E293B] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#E2E8F0] text-center">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                logout();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#DC2626] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out and use another account</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="py-4 px-6 text-center text-xs text-[#64748B] border-t border-[#E2E8F0] bg-[#FFFFFF]">
        UniCharge Smart Campus Locker System · USTP Cagayan de Oro
      </footer>
    </div>
  );
};
