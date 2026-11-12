import React from 'react';
import { useUniCharge } from '../context/UniChargeContext';
import {
  Zap,
  BatteryCharging,
  ShieldCheck,
  Coins,
  ArrowRight,
  Terminal,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const LandingHero: React.FC = () => {
  const { stations, setIsKioskModalOpen, setCurrentView } = useUniCharge();

  // Aggregate stats
  const totalCompartments = stations.reduce((acc, s) => acc + s.compartments.length, 0);
  const availableCompartments = stations.reduce(
    (acc, s) => acc + s.compartments.filter(c => c.status === 'available').length,
    0
  );
  const inUseCompartments = stations.reduce(
    (acc, s) => acc + s.compartments.filter(c => c.status === 'in_use').length,
    0
  );

  return (
    <section className="relative overflow-hidden pt-8 pb-14 lg:py-16 bg-[#0B192C] text-white">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#1E3E62]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-72 h-72 bg-[#FFC107]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Kicker - Zero Pill rule: quiet unboxed text */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-4 tracking-wide uppercase">
          <span className="text-[#FFC107] font-semibold">University of Science and Technology of Southern Philippines</span>
          <span aria-hidden="true">·</span>
          <span>Official Smart Campus Infrastructure</span>
        </div>

        {/* Hero Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Headline & Action */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] text-white" style={{ textWrap: 'balance' }}>
              Power Up & Secure Your Gear with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFC107] to-[#FFB200]">
                UniCharge Smart Lockers
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              Never let a drained battery interrupt your thesis defense, lab experiment, or study session. Deposit your laptop, phone, or tablet in a climate-controlled, magnetic solenoid-locked locker right on campus.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#campus-grid"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-[#0B192C] bg-[#FFC107] hover:bg-[#FFB200] rounded-lg transition-all shadow-md active:scale-95"
              >
                <span>Find Free Compartment</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <button
                onClick={() => setIsKioskModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#1E3E62] hover:bg-[#1E3E62]/80 border border-slate-700 rounded-lg transition-all active:scale-95"
              >
                <Terminal className="w-4 h-4 text-[#FFC107]" />
                <span>Simulate Kiosk Terminal</span>
              </button>

              <button
                onClick={() => setCurrentView('dashboard')}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                <span>Student E-Wallet Portal</span>
              </button>
            </div>

            {/* Quick Trust / Safety Features - No Pill Badges, clean typographic list */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#FFC107]" />
                <span>USB-C PD 65W & 220V AC</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Solenoid Tamper Detection</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-[#FFC107]" />
                <span>GCash, Maya & Coin Slots</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>Library · CITC · Sheds</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Asset Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#121212] shadow-2xl group">
              <img
                src="/src/assets/images/unicharge_hero_kiosk_1794473141244.jpg"
                alt="UniCharge Smart Campus Locker Kiosk at USTP"
                className="w-full h-[360px] sm:h-[420px] object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback container if image fails
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  if (target.parentElement) {
                    target.parentElement.classList.add('bg-gradient-to-br', 'from-[#1E3E62]', 'to-[#0B192C]');
                  }
                }}
              />
              
              {/* Gradient Scrim for Legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B192C] via-transparent to-black/30 pointer-events-none" />

              {/* Real-time Status Card Overlay */}
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-[#0B192C]/90 backdrop-blur-md border border-slate-700 text-xs text-slate-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-white">USTP Main Library Kiosk #01</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-semibold tabular-nums">ONLINE</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Available</span>
                    <span className="font-mono text-emerald-400 font-bold tabular-nums text-sm">
                      {availableCompartments} Slots
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">AC Line</span>
                    <span className="font-mono text-white font-bold tabular-nums text-sm">
                      221.4 V
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Fast Charge</span>
                    <span className="font-mono text-[#FFC107] font-bold tabular-nums text-sm">
                      65W PD
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Full-width 4-Metric Proof Bar Below Hero (Anti-slop quantitative rigor) */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Live Campus Capacity</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 tabular-nums">
                {availableCompartments}
              </span>
              <span className="text-xs text-slate-400">/ {totalCompartments} available now</span>
            </div>
            <p className="text-xs text-slate-400">Zero wait-time across all 3 station hubs</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Currently Charging</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#FFC107] tabular-nums">
                {inUseCompartments}
              </span>
              <span className="text-xs text-slate-400">active devices</span>
            </div>
            <p className="text-xs text-slate-400">Safely powered with USB-PD 3.0 smart negotiation</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Student Hourly Rate</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tabular-nums">
                ₱10.00
              </span>
              <span className="text-xs text-slate-400">/ hour</span>
            </div>
            <p className="text-xs text-slate-400">Includes 15-minute grace period before overtime</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Physical & Digital Pay</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-sky-400 tabular-nums">
                Dual Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">GCash / Maya E-Wallet + ₱5, ₱10, ₱20 coin hoppers</p>
          </div>
        </div>

      </div>
    </section>
  );
};
