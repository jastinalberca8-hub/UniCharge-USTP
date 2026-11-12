/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UniChargeProvider, useUniCharge, AppRoute } from './context/UniChargeContext';
import { LoginPage } from './components/auth/LoginPage';
import { SignUpPage } from './components/auth/SignUpPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { StudentPortal } from './components/student/StudentPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { LockerModal } from './components/LockerModal';
import { KioskSimulatorModal } from './components/KioskSimulatorModal';
import { ReceiptModal } from './components/ReceiptModal';
import { Sparkles, Terminal, Shield, GraduationCap, ArrowRightLeft } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentRoute, setCurrentRoute, setAuthRole, setIsKioskModalOpen, currentUser } = useUniCharge();
  const [authBanner, setAuthBanner] = useState<string | null>(null);
  const [showDemoSwitcher, setShowDemoSwitcher] = useState(true);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 font-sans antialiased selection:bg-[#FBB03B] selection:text-[#1B1448]">
      
      {/* 1. AUTHENTICATION SCREENS */}
      {currentRoute === 'login' && (
        <LoginPage successMessage={authBanner} />
      )}

      {currentRoute === 'signup' && (
        <SignUpPage
          onSuccess={(msg) => {
            setAuthBanner(msg);
            setCurrentRoute('login');
          }}
        />
      )}

      {currentRoute === 'forgot-password' && (
        <ForgotPasswordPage
          onSuccess={(msg) => {
            setAuthBanner(msg);
            setCurrentRoute('login');
          }}
        />
      )}

      {/* 2. STRICTLY SEPARATED STUDENT PORTAL */}
      {currentRoute === 'student-dashboard' && (
        <StudentPortal />
      )}

      {/* 3. STRICTLY SEPARATED ADMIN PORTAL */}
      {currentRoute === 'admin-dashboard' && (
        <AdminPortal />
      )}

      {/* Interactive Global Hardware Modals */}
      <LockerModal />
      <KioskSimulatorModal />
      <ReceiptModal />

      {/* 4. DISCREET DEMO ROLE SWITCHER (For Testing & Evaluation) */}
      <aside aria-label="Demo Role Switcher" className="fixed bottom-4 right-4 z-50 print:hidden">
        {showDemoSwitcher ? (
          <div className="p-3 rounded-2xl bg-white border border-[#E5E7EB] shadow-2xl space-y-2 w-72 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5 font-bold text-[#1B1448]">
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#FBB03B]" />
                <span>Demo View Navigator</span>
              </div>
              <button
                onClick={() => setShowDemoSwitcher(false)}
                className="text-slate-400 hover:text-slate-700 text-[11px]"
                title="Minimize switcher"
              >
                Hide
              </button>
            </div>

            <p className="text-[10px] text-slate-500">
              Active: <strong className="text-[#1B1448] font-mono">{currentRoute}</strong>
            </p>

            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                onClick={() => {
                  setAuthRole('student');
                  setCurrentRoute('student-dashboard');
                }}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${
                  currentRoute === 'student-dashboard'
                    ? 'bg-[#1B1448] text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <GraduationCap className="w-3 h-3 text-[#FBB03B]" />
                <span>Student Portal</span>
              </button>

              <button
                onClick={() => {
                  setAuthRole('admin');
                  setCurrentRoute('admin-dashboard');
                }}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${
                  currentRoute === 'admin-dashboard'
                    ? 'bg-[#1B1448] text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-3 h-3 text-red-500" />
                <span>Admin Portal</span>
              </button>

              <button
                onClick={() => setCurrentRoute('login')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors ${
                  currentRoute === 'login'
                    ? 'bg-[#1B1448] text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Login View
              </button>

              <button
                onClick={() => setCurrentRoute('signup')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors ${
                  currentRoute === 'signup'
                    ? 'bg-[#1B1448] text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Sign Up View
              </button>
            </div>

            <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setCurrentRoute('forgot-password')}
                className="text-[10px] text-slate-500 hover:text-[#1B1448] underline"
              >
                Forgot Password
              </button>

              <button
                onClick={() => setIsKioskModalOpen(true)}
                className="py-1 px-2 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold flex items-center gap-1"
              >
                <Terminal className="w-3 h-3 text-[#FBB03B]" />
                <span>Kiosk Terminal</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDemoSwitcher(true)}
            className="py-2 px-3 rounded-full bg-white border border-[#E5E7EB] text-[#1B1448] font-bold text-xs shadow-lg hover:border-[#FBB03B] transition-colors flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#FBB03B]" />
            <span>Switch Role / View</span>
          </button>
        )}
      </aside>

    </div>
  );
};

export default function App() {
  return (
    <UniChargeProvider>
      <AppContent />
    </UniChargeProvider>
  );
}
