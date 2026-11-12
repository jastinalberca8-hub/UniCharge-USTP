import React, { useState } from 'react';
import { useUniCharge } from '../context/UniChargeContext';
import { LockerCompartment, LockerSize } from '../types';
import {
  MapPin,
  Zap,
  Lock,
  Unlock,
  AlertTriangle,
  Laptop,
  Smartphone,
  Gauge,
  Thermometer,
  Wind,
  Coins,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export const LiveStationGrid: React.FC = () => {
  const {
    stations,
    activeStationId,
    setActiveStationId,
    setSelectedCompartment,
    setIsBookingModalOpen,
    setBookingTarget,
    setIsKioskModalOpen,
    setKioskInitialStationId,
  } = useUniCharge();

  const [sizeFilter, setSizeFilter] = useState<'all' | 'standard' | 'large'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'in_use'>('all');

  const currentStation = stations.find(s => s.id === activeStationId) || stations[0];

  const availableCount = currentStation.compartments.filter(c => c.status === 'available').length;
  const inUseCount = currentStation.compartments.filter(c => c.status === 'in_use').length;
  const alertCount = currentStation.compartments.filter(
    c => c.status === 'tamper_alert' || c.status === 'maintenance'
  ).length;

  const filteredCompartments = currentStation.compartments.filter(c => {
    if (sizeFilter !== 'all' && c.size !== sizeFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  const handleCompartmentClick = (comp: LockerCompartment) => {
    setSelectedCompartment(comp);
    if (comp.status === 'available') {
      setBookingTarget({
        stationId: currentStation.id,
        compartmentNumber: comp.compartmentNumber,
      });
      setIsBookingModalOpen(true);
    }
  };

  return (
    <section id="campus-grid" className="py-16 bg-white dark:bg-[#0B192C] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FFC107] uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Campus Network Telemetry</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Live Campus Station Grid
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Select a USTP campus hub to inspect compartment status, fast-charging wattage, and reserve immediately.
            </p>
          </div>

          {/* Quick Telemetry Summary */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <strong className="tabular-nums">{availableCount}</strong> Free
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FFC107]/10 text-[#FFC107] border border-[#FFC107]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
              <strong className="tabular-nums">{inUseCount}</strong> In-Use
            </span>
            {alertCount > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <strong className="tabular-nums">{alertCount}</strong> Alert
              </span>
            )}
          </div>
        </div>

        {/* Station Navigation Tabs - Segmented Button Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {stations.map(station => {
            const isSelected = station.id === activeStationId;
            const freeCount = station.compartments.filter(c => c.status === 'available').length;
            const hasAlert = station.compartments.some(c => c.status === 'tamper_alert');

            return (
              <button
                key={station.id}
                onClick={() => setActiveStationId(station.id)}
                className={`p-4 rounded-xl text-left border transition-all relative ${
                  isSelected
                    ? 'bg-slate-50 dark:bg-[#1E3E62]/40 border-[#FFC107] shadow-sm'
                    : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-4 h-4 ${isSelected ? 'text-[#FFC107]' : 'text-slate-400'}`} />
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {station.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {station.buildingCode}
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {station.locationDetails}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-500 font-semibold tabular-nums">
                    {freeCount} of {station.compartments.length} Available
                  </span>
                  {hasAlert && (
                    <span className="text-red-400 flex items-center gap-1 text-[11px]">
                      <AlertTriangle className="w-3 h-3" />
                      Tamper
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Station Operational Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#121212]/80 p-5 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            
            {/* Info */}
            <div className="md:col-span-2 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-bold text-slate-900 dark:text-white text-base">
                  {currentStation.name}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  [{currentStation.buildingCode}]
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {currentStation.campusZone} · {currentStation.locationDetails}
              </p>
            </div>

            {/* Live Hardware Telemetry Chips */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5" title="AC Line Voltage">
                <Gauge className="w-3.5 h-3.5 text-sky-400" />
                <span>Voltage:</span>
                <strong className="text-slate-900 dark:text-white tabular-nums">
                  {currentStation.voltage.toFixed(1)}V
                </strong>
              </div>
              <div className="flex items-center gap-1.5" title="Locker Rack Internal Temperature">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span>Temp:</span>
                <strong className="text-slate-900 dark:text-white tabular-nums">
                  {currentStation.temperature.toFixed(1)}°C
                </strong>
              </div>
            </div>

            {/* Launch Kiosk directly at this station */}
            <div className="flex justify-start md:justify-end">
              <button
                onClick={() => {
                  setKioskInitialStationId(currentStation.id);
                  setIsKioskModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#0B192C] bg-[#FFC107] hover:bg-[#FFB200] rounded-lg transition-colors whitespace-nowrap shadow-sm"
              >
                <span>Open Terminal for {currentStation.buildingCode}</span>
              </button>
            </div>

          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Filter Size:</span>
            <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-[#1A1A2E] text-xs">
              <button
                onClick={() => setSizeFilter('all')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  sizeFilter === 'all'
                    ? 'bg-white dark:bg-[#0B192C] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Sizes
              </button>
              <button
                onClick={() => setSizeFilter('standard')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
                  sizeFilter === 'standard'
                    ? 'bg-white dark:bg-[#0B192C] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Standard (Phones)</span>
              </button>
              <button
                onClick={() => setSizeFilter('large')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
                  sizeFilter === 'large'
                    ? 'bg-white dark:bg-[#0B192C] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Laptop className="w-3 h-3" />
                <span>Large (Laptops)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Availability:</span>
            <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-[#1A1A2E] text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-[#0B192C] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('available')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === 'available'
                    ? 'bg-white dark:bg-[#0B192C] text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Available Only
              </button>
              <button
                onClick={() => setStatusFilter('in_use')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === 'in_use'
                    ? 'bg-white dark:bg-[#0B192C] text-[#FFC107] font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                In Use
              </button>
            </div>
          </div>
        </div>

        {/* Visual Compartment Matrix (Realistic Smart Locker Grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {filteredCompartments.map(comp => {
            const isAvailable = comp.status === 'available';
            const isInUse = comp.status === 'in_use';
            const isTamper = comp.status === 'tamper_alert';
            const isMaintenance = comp.status === 'maintenance';

            // Theme status styling
            let statusBadge = (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Available
              </span>
            );

            if (isInUse) {
              statusBadge = (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-[#FFC107]">
                  <Zap className="w-3 h-3 text-[#FFC107] fill-current" />
                  {comp.currentPowerDrawWatts > 0 ? `${comp.currentPowerDrawWatts}W` : 'Charging'}
                </span>
              );
            } else if (isTamper) {
              statusBadge = (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-red-500">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  Tamper
                </span>
              );
            } else if (isMaintenance) {
              statusBadge = (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-amber-500">
                  Service
                </span>
              );
            }

            return (
              <div
                key={comp.id}
                onClick={() => handleCompartmentClick(comp)}
                className={`relative rounded-xl border p-4 transition-all cursor-pointer flex flex-col justify-between h-44 ${
                  isAvailable
                    ? 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-md'
                    : isInUse
                    ? 'bg-amber-500/5 dark:bg-[#1A1A2E] border-amber-500/30 hover:border-amber-500/60'
                    : isTamper
                    ? 'bg-red-500/10 dark:bg-red-950/20 border-red-500/50'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 opacity-70'
                }`}
              >
                {/* Header: Door Number & Size Icon */}
                <div className="flex items-start justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                      #{comp.compartmentNumber.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {comp.id}
                    </span>
                  </div>

                  <div
                    className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    title={comp.size === 'large' ? 'Large (15-16" Laptop)' : 'Standard (Phone / Powerbank)'}
                  >
                    {comp.size === 'large' ? (
                      <Laptop className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                </div>

                {/* Center: Solenoid Lock Visualization */}
                <div className="my-2 py-2 border-y border-dashed border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    {comp.lockStatus === 'locked' ? (
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span className="text-[11px] uppercase tracking-wider font-mono">
                      {comp.lockStatus}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {comp.size === 'large' ? '₱15/hr' : '₱10/hr'}
                  </span>
                </div>

                {/* Footer: Live Status & CTA */}
                <div>
                  <div className="flex items-center justify-between">
                    {statusBadge}
                  </div>

                  {isAvailable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBookingTarget({
                          stationId: currentStation.id,
                          compartmentNumber: comp.compartmentNumber,
                        });
                        setIsBookingModalOpen(true);
                      }}
                      className="mt-2 w-full py-1 text-[11px] font-semibold text-[#0B192C] bg-[#FFC107] hover:bg-[#FFB200] rounded transition-colors text-center"
                    >
                      Reserve Now
                    </button>
                  )}

                  {isInUse && comp.currentSession && (
                    <div className="mt-1 text-[10px] text-slate-500 truncate">
                      {comp.currentSession.userName.split(' ')[0]}
                    </div>
                  )}

                  {isTamper && (
                    <div className="mt-1 text-[10px] text-red-400 font-semibold truncate">
                      Vibration Alert
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {filteredCompartments.length === 0 && (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <p className="text-sm text-slate-500">No compartments match the selected filters.</p>
            <button
              onClick={() => {
                setSizeFilter('all');
                setStatusFilter('all');
              }}
              className="mt-3 px-3 py-1.5 text-xs font-semibold text-[#0B192C] bg-[#FFC107] rounded-lg"
            >
              Reset Filters
            </button>
          </div>
        )}

      </div>
    </section>
  );
};
