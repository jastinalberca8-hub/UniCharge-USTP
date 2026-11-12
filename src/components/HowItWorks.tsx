import React, { useState } from 'react';
import {
  Smartphone,
  CreditCard,
  QrCode,
  Unlock,
  CheckCircle2,
  Cpu,
  Coins,
  ShieldAlert,
} from 'lucide-react';
import { useUniCharge } from '../context/UniChargeContext';

export const HowItWorks: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const { setIsKioskModalOpen } = useUniCharge();

  const steps = [
    {
      step: '01',
      title: 'Select Station & Compartment',
      kicker: 'Locker Size & Availability',
      description:
        'Check real-time availability on the campus web app or directly on the kiosk screen. Choose between Standard (phones, power banks) or Large (15"–16" laptops and backpacks).',
      icon: Smartphone,
      details: [
        'Live green LED indicator displays available doors',
        'Auto-suggests nearest station with free slots',
        'Built-in 65W USB-C PD and universal 220V AC outlet',
      ],
      previewType: 'select',
    },
    {
      step: '02',
      title: 'Choose Payment: Wallet or Coins',
      kicker: 'Flexible Student-Friendly Billing',
      description:
        'Pay with your USTP Student E-Wallet (via GCash or Maya instant top-up) or insert physical Philippine peso coins (₱5, ₱10, or ₱20) directly into the kiosk coin validator.',
      icon: CreditCard,
      details: [
        '₱10.00 / hour for standard phone lockers',
        '₱15.00 / hour for high-wattage laptop compartments',
        '15-minute grace period before overtime rate applies',
      ],
      previewType: 'payment',
    },
    {
      step: '03',
      title: 'Scan Kiosk QR or Enter 6-Digit PIN',
      kicker: 'Dual-Factor Smart Authentication',
      description:
        'Once payment confirms, your mobile screen generates a dynamic cryptographic QR token and a backup 6-digit one-time PIN. Hold your phone up to the kiosk optical camera.',
      icon: QrCode,
      details: [
        'Instant optical QR read in less than 200ms',
        'On-screen anti-peep digital keypad for manual PIN entry',
        'No physical key to lose or duplicate',
      ],
      previewType: 'auth',
    },
    {
      step: '04',
      title: 'Door Unlocks & Fast-Charging Begins',
      kicker: 'Magnetic Solenoid & Active Protection',
      description:
        'The magnetic 12V solenoid lock pops open automatically. Plug in your device, shut the steel door, and head to class with full confidence in our tamper-alarm network.',
      icon: Unlock,
      details: [
        'Automatic surge, over-voltage, and short-circuit cutoff',
        'Vibration and force sensors alert USTP Campus Security',
        'Track battery level and remaining time from your student portal',
      ],
      previewType: 'unlock',
    },
  ];

  return (
    <section id="how-it-works" className="py-16 bg-slate-50 dark:bg-[#121212] transition-colors border-y border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <span className="text-xs font-semibold text-[#FFC107] uppercase tracking-wider block mb-2">
            Seamless Campus Experience
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight" style={{ textWrap: 'balance' }}>
            Four Simple Steps to Safe Power & Storage
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            Engineered specifically for USTP students and faculty—combining IoT hardware security, multi-modal billing, and real-time telemetry.
          </p>
        </div>

        {/* Steps Grid with Interactive State */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Step Selector Column */}
          <div className="lg:col-span-7 space-y-3">
            {steps.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = activeStep === idx;
              return (
                <div
                  key={item.step}
                  onClick={() => setActiveStep(idx)}
                  className={`p-5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-[#1A1A2E] border-[#FFC107] shadow-sm'
                      : 'bg-white/60 dark:bg-[#0B192C]/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-mono font-bold text-sm ${
                        isSelected
                          ? 'bg-[#FFC107] text-[#0B192C]'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {item.step}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#FFC107] block uppercase tracking-wide">
                          {item.kicker}
                        </span>
                        {isSelected && (
                          <span className="text-[11px] font-mono text-slate-400">Step {idx + 1} of 4</span>
                        )}
                      </div>
                      
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {item.title}
                      </h3>
                      
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {item.description}
                      </p>

                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                          {item.details.map((detail, dIdx) => (
                            <div key={dIdx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>{detail}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Hardware Simulation Preview Column */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B192C] p-6 shadow-xl">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#FFC107]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Step {steps[activeStep].step} Demonstration
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-500 font-semibold">
                  INTERACTIVE PREVIEW
                </span>
              </div>

              {/* Dynamic Preview Content */}
              <div className="py-6">
                {activeStep === 0 && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs mb-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Available Compartments</span>
                        <span className="font-mono text-emerald-500">12 Ready</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {['01', '02', '03', '04', '05', '06', '07', '08'].map((num, i) => (
                          <div
                            key={num}
                            className={`p-2.5 rounded-lg text-center text-xs font-mono font-bold border transition-colors ${
                              i === 2
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 ring-2 ring-emerald-500/20'
                                : i === 0 || i === 4
                                ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            #{num}
                            <span className="block text-[9px] font-normal font-sans opacity-80">
                              {i % 2 === 0 ? 'Standard' : 'Laptop'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 text-center">
                      Clicking any locker gives you wattage specs, charging port status, and size.
                    </p>
                  </div>
                )}

                {activeStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121212] border border-[#FFC107]/40 text-center space-y-2">
                        <Coins className="w-6 h-6 text-[#FFC107] mx-auto" />
                        <span className="text-xs font-bold block text-slate-900 dark:text-white">Physical Coin Slot</span>
                        <span className="text-[11px] font-mono text-slate-500 block">₱5 / ₱10 / ₱20 accepted</span>
                        <div className="inline-block px-2 py-0.5 text-[10px] bg-[#FFC107]/20 text-[#FFC107] font-semibold rounded">
                          Instant Drop
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121212] border border-sky-500/40 text-center space-y-2">
                        <CreditCard className="w-6 h-6 text-sky-400 mx-auto" />
                        <span className="text-xs font-bold block text-slate-900 dark:text-white">USTP E-Wallet</span>
                        <span className="text-[11px] font-mono text-slate-500 block">GCash / Maya linked</span>
                        <div className="inline-block px-2 py-0.5 text-[10px] bg-sky-500/20 text-sky-400 font-semibold rounded">
                          Auto-Deduct
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                      Auto-rate formula: ₱10 base rate per hour. 15-minute grace period protects against unexpected lecture extensions.
                    </div>
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="space-y-4 text-center">
                    <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-slate-800 inline-block mx-auto">
                      <div className="w-32 h-32 mx-auto bg-white p-2 rounded-lg border flex items-center justify-center">
                        <QrCode className="w-28 h-28 text-slate-900" />
                      </div>
                      <div className="mt-3">
                        <span className="text-xs text-slate-500 block">Dynamic Backup PIN</span>
                        <span className="font-mono text-lg font-extrabold text-[#FFC107] tracking-widest">
                          8 4 9 1 0 2
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      Cryptographic token refreshes automatically. Hold phone against the kiosk barcode scanner window.
                    </p>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <Unlock className="w-4 h-4 text-emerald-500" />
                        <span>Solenoid Latch Disengaged</span>
                      </div>
                      <div className="text-xs space-y-1 font-mono">
                        <div>Outlet: USB-C PD 3.0 (Active 42.8W)</div>
                        <div>Safety Relay: Nominal (221.4V / 60Hz)</div>
                        <div>Tamper Sensor: Calibrated & Armed</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-100 dark:bg-[#121212] text-xs text-slate-600 dark:text-slate-400">
                      <ShieldAlert className="w-4 h-4 text-[#FFC107] shrink-0" />
                      <span>Continuous vibration and door-ajar sensors alert USTP Security on unauthorized tampering.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Ready to test?
                </span>
                <button
                  onClick={() => setIsKioskModalOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#0B192C] bg-[#FFC107] hover:bg-[#FFB200] rounded-lg transition-colors"
                >
                  Launch Kiosk Simulator
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
