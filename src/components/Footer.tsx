import React from 'react';
import { useUniCharge } from '../context/UniChargeContext';
import { Zap, MapPin, Phone, Mail, Shield, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  const { setCurrentView, setIsKioskModalOpen } = useUniCharge();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#08121E] text-slate-600 dark:text-slate-400 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand & Overview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FFC107] text-[#0B192C] flex items-center justify-center font-bold">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                UniCharge USTP
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              The official smart charging and temporary secure storage locker network of the University of Science and Technology of Southern Philippines.
            </p>
            <div className="pt-1 text-[11px] text-slate-400 font-mono">
              USTP System · CDO Campus
            </div>
          </div>

          {/* Campus Hub Locations */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Locker Stations
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FFC107] shrink-0 mt-0.5" />
                <span>Main Library Atrium (Ground Floor)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FFC107] shrink-0 mt-0.5" />
                <span>CITC Complex (2nd Floor Commons)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FFC107] shrink-0 mt-0.5" />
                <span>Engineering Quad (Study Sheds B)</span>
              </li>
            </ul>
          </div>

          {/* Quick Platform Links */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Platform Navigation
            </h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => {
                    setCurrentView('landing');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#FFC107] transition-colors"
                >
                  Campus Live Grid
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setCurrentView('dashboard');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#FFC107] transition-colors"
                >
                  Student E-Wallet & Portal
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setCurrentView('admin');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#FFC107] transition-colors"
                >
                  Admin Telemetry & Alarms
                </button>
              </li>
              <li>
                <button
                  onClick={() => setIsKioskModalOpen(true)}
                  className="hover:text-[#FFC107] transition-colors"
                >
                  Kiosk Terminal Simulator
                </button>
              </li>
            </ul>
          </div>

          {/* Emergency & Support */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Assistance & Security
            </h4>
            <p className="text-slate-500 text-xs">
              For lost locker PINs, stuck compartments, or device safety concerns:
            </p>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Security: (088) 856-1738 loc. 4102</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>unicharge@ustp.edu.ph</span>
              </div>
            </div>
          </div>

        </div>

        {/* Quiet Copyright Row */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} University of Science and Technology of Southern Philippines. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>Student Handbook Compliance</span>
            <span aria-hidden="true">·</span>
            <span>Data Privacy Act of 2012</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
