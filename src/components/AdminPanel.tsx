import React, { useState } from 'react';
import { useUniCharge } from '../context/UniChargeContext';
import {
  ShieldAlert,
  Gauge,
  Thermometer,
  Wind,
  Lock,
  Unlock,
  Coins,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Download,
  Power,
  RotateCw,
  Sliders,
  Key,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { TamperAlertEvent } from '../types';

export const AdminPanel: React.FC = () => {
  const {
    stations,
    alerts,
    resolveAlert,
    remoteForceUnlock,
    toggleStationMaintenance,
    toggleCompartmentMaintenance,
    emptyCoinHopper,
  } = useUniCharge();

  // Financial calculations
  const totalDigitalRev = stations.reduce((acc, s) => acc + s.digitalRevenue, 0);
  const totalCoinRev = stations.reduce((acc, s) => acc + s.coinRevenue, 0);
  const totalRevenue = totalDigitalRev + totalCoinRev;
  const digitalShare = totalRevenue > 0 ? Math.round((totalDigitalRev / totalRevenue) * 100) : 0;
  const coinShare = 100 - digitalShare;

  // Selected station filter in admin
  const [selectedStationId, setSelectedStationId] = useState<string>('all');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<'all' | 'unresolved' | 'critical'>('unresolved');

  // Emergency Force Unlock Modal state
  const [forceUnlockTarget, setForceUnlockTarget] = useState<{
    compartmentId: string;
    compartmentNumber: number;
    stationName: string;
  } | null>(null);
  const [adminAuthKey, setAdminAuthKey] = useState('USTP-ADMIN-99');
  const [unlockFeedback, setUnlockFeedback] = useState<string | null>(null);

  const filteredAlerts = alerts.filter(a => {
    if (alertSeverityFilter === 'unresolved' && a.isResolved) return false;
    if (alertSeverityFilter === 'critical' && a.severity !== 'critical') return false;
    return true;
  });

  const handleForceUnlockSubmit = () => {
    if (!forceUnlockTarget) return;
    const res = remoteForceUnlock(forceUnlockTarget.compartmentId, adminAuthKey);
    setUnlockFeedback(res.message);
    if (res.success) {
      setTimeout(() => {
        setForceUnlockTarget(null);
        setUnlockFeedback(null);
      }, 2500);
    }
  };

  const handleExportAuditCSV = () => {
    const csvRows = [
      ['Timestamp', 'Station', 'Locker Compartment', 'Type', 'Severity', 'Message', 'Status'].join(','),
      ...alerts.map(a =>
        [
          `"${a.timestamp}"`,
          `"${a.stationName}"`,
          `"#${a.compartmentNumber} (${a.compartmentId})"`,
          `"${a.type}"`,
          `"${a.severity}"`,
          `"${a.message.replace(/"/g, '""')}"`,
          `"${a.isResolved ? 'Resolved' : 'Active Alert'}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `USTP_UniCharge_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="py-10 bg-slate-50 dark:bg-[#0B192C] min-h-[calc(100vh-4rem)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FFC107] uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-[#FFC107]" />
              <span>Campus Security & IoT Infrastructure Administration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Kiosk Telemetry & Control Panel
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Supervise AC voltage stability, solenoid health, tamper alerts, and dual-mode revenue streams across USTP.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportAuditCSV}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-lg hover:border-[#FFC107] transition-colors flex items-center gap-2 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit CSV</span>
            </button>
          </div>
        </div>

        {/* 1. FINANCIAL SUMMARY SPLIT: Digital Wallet vs. Physical Coin Slot */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Campus Revenue Streams & Coin Hopper Levels
            </span>
            <span className="text-xs font-mono text-slate-400">
              Semester Total: ₱{totalRevenue.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Total Aggregate Revenue */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121212] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase font-semibold">Total Revenue</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
                ₱{totalRevenue.toLocaleString()}.00
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Cumulative locker charging collections across all 3 stations.
              </p>
            </div>

            {/* Digital Wallet Split */}
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 dark:bg-[#1A1A2E] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs text-sky-500 font-bold uppercase">
                  <CreditCard className="w-4 h-4" />
                  <span>Digital E-Wallet (GCash / Maya)</span>
                </div>
                <span className="text-xs font-mono font-bold text-sky-400 tabular-nums">
                  {digitalShare}%
                </span>
              </div>
              <div className="text-3xl font-black font-mono text-sky-600 dark:text-sky-400 tabular-nums">
                ₱{totalDigitalRev.toLocaleString()}.00
              </div>
              <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-sky-500 h-full rounded-full" style={{ width: `${digitalShare}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Instant digital settlement directly into USTP student account fund.
              </p>
            </div>

            {/* Physical Coin Slot Split */}
            <div className="rounded-2xl border border-[#FFC107]/40 bg-[#FFC107]/5 dark:bg-[#1A1A2E] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs text-[#FFC107] font-bold uppercase">
                  <Coins className="w-4 h-4" />
                  <span>Physical Coin Slot (₱5/10/20)</span>
                </div>
                <span className="text-xs font-mono font-bold text-[#FFC107] tabular-nums">
                  {coinShare}%
                </span>
              </div>
              <div className="text-3xl font-black font-mono text-[#FFC107] tabular-nums">
                ₱{totalCoinRev.toLocaleString()}.00
              </div>
              <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#FFC107] h-full rounded-full" style={{ width: `${coinShare}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Cash collection securely deposited inside armored steel validator hoppers.
              </p>
            </div>

          </div>
        </div>

        {/* 2. SECURITY & TAMPER ALERT FEED (With Remote Force Unlock) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121212] p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Security, Vibration & Tamper Alarm Stream
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time accelerometer, door vibration, thermal trip, and overstay telemetry.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-[#1A1A2E] text-xs">
              <button
                onClick={() => setAlertSeverityFilter('unresolved')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  alertSeverityFilter === 'unresolved'
                    ? 'bg-white dark:bg-[#0B192C] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Active Only
              </button>
              <button
                onClick={() => setAlertSeverityFilter('critical')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  alertSeverityFilter === 'critical'
                    ? 'bg-white dark:bg-[#0B192C] text-red-500 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Critical Alarms
              </button>
              <button
                onClick={() => setAlertSeverityFilter('all')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  alertSeverityFilter === 'all'
                    ? 'bg-white dark:bg-[#0B192C] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All Events
              </button>
            </div>
          </div>

          {/* Alert Stream List */}
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                No active security or tamper alerts detected. All station sensors nominal.
              </div>
            ) : (
              filteredAlerts.map(alert => {
                const isCrit = alert.severity === 'critical';
                const isWarn = alert.severity === 'warning';

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      alert.isResolved
                        ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                        : isCrit
                        ? 'bg-red-500/10 dark:bg-red-950/20 border-red-500/40'
                        : isWarn
                        ? 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/40'
                        : 'bg-slate-50 dark:bg-[#1A1A2E] border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isCrit
                            ? 'bg-red-500 text-white'
                            : isWarn
                            ? 'bg-[#FFC107] text-[#0B192C]'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white font-mono">
                            [{alert.stationName}]
                          </span>
                          {alert.compartmentNumber > 0 && (
                            <span className="font-mono text-xs font-bold text-[#FFC107]">
                              Locker #{alert.compartmentNumber}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-mono">
                            {alert.timestamp}
                          </span>
                          {alert.isResolved && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500">
                              Resolved
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          {alert.message}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {!alert.isResolved && alert.compartmentNumber > 0 && (
                        <button
                          onClick={() => {
                            setForceUnlockTarget({
                              compartmentId: alert.compartmentId,
                              compartmentNumber: alert.compartmentNumber,
                              stationName: alert.stationName,
                            });
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Remote Force Unlock</span>
                        </button>
                      )}

                      {!alert.isResolved && (
                        <button
                          onClick={() => resolveAlert(alert.id, 'Officer Admin')}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3. HARDWARE TELEMETRY & KIOSK STATION CONTROLS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kiosk Station Telemetry & Physical Hopper Status
            </span>
            <span className="text-xs font-mono text-emerald-500">
              All 3 Gateways Heartbeat Nominal
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {stations.map(station => {
              const isStationOffline = station.status === 'maintenance';
              const hopperPct = Math.round((station.coinHopperCount / station.coinHopperCapacity) * 100);
              const isHopperNearFull = hopperPct >= 80;

              return (
                <div
                  key={station.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121212] p-6 shadow-sm space-y-5"
                >
                  {/* Station Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isStationOffline ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <h4 className="font-bold text-base text-slate-900 dark:text-white">
                          {station.name}
                        </h4>
                      </div>
                      <span className="text-xs text-slate-400 font-mono block mt-0.5">
                        Code: {station.buildingCode} · {station.campusZone}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleStationMaintenance(station.id)}
                      className={`p-1.5 rounded-lg border text-xs transition-colors ${
                        isStationOffline
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                      title={isStationOffline ? 'Put Online' : 'Take Offline for Maintenance'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Telemetry Grid */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#1A1A2E] text-xs font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px] block">AC Line Voltage</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold text-sm tabular-nums">
                        {station.voltage.toFixed(1)} V
                      </span>
                      <span className="text-[10px] text-emerald-500 block">Surge Suppressed</span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block">Thermal Sensor</span>
                      <span className={`font-bold text-sm tabular-nums ${
                        station.temperature > 32 ? 'text-amber-400' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {station.temperature.toFixed(1)} °C
                      </span>
                      <span className="text-[10px] text-slate-500 block">{station.fanSpeedRpm} RPM Fan</span>
                    </div>
                  </div>

                  {/* Physical Coin Hopper Meter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Coin Hopper Capacity</span>
                      <span className={`font-mono font-bold tabular-nums ${isHopperNearFull ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {station.coinHopperCount} / {station.coinHopperCapacity} coins ({hopperPct}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isHopperNearFull ? 'bg-red-500' : 'bg-[#FFC107]'
                        }`}
                        style={{ width: `${hopperPct}%` }}
                      />
                    </div>

                    {isHopperNearFull && (
                      <p className="text-[11px] text-red-400 font-semibold">
                        Hopper close to full capacity. Dispatch campus cashier to empty.
                      </p>
                    )}

                    <div className="pt-1 flex items-center justify-between">
                      <button
                        onClick={() => emptyCoinHopper(station.id)}
                        className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-[#FFC107] transition-colors"
                      >
                        Reset Hopper (Logged)
                      </button>
                      <span className="text-[11px] font-mono text-slate-400">
                        ₱{station.coinRevenue.toLocaleString()} in cash
                      </span>
                    </div>
                  </div>

                  {/* Compartment Magnetic Lock Grid & Quick Unlock Buttons */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Compartments & Solenoid Status
                    </span>
                    <div className="grid grid-cols-6 gap-1.5">
                      {station.compartments.map(comp => (
                        <button
                          key={comp.id}
                          onClick={() => {
                            setForceUnlockTarget({
                              compartmentId: comp.id,
                              compartmentNumber: comp.compartmentNumber,
                              stationName: station.name,
                            });
                          }}
                          className={`p-1.5 rounded text-center text-[10px] font-mono font-bold transition-all border ${
                            comp.status === 'available'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                              : comp.status === 'in_use'
                              ? 'bg-[#FFC107]/10 border-[#FFC107]/30 text-[#FFC107] hover:bg-[#FFC107]/20'
                              : comp.status === 'tamper_alert'
                              ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse'
                              : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400'
                          }`}
                          title={`Click to force unlock #${comp.compartmentNumber}`}
                        >
                          #{comp.compartmentNumber}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500 block text-center">
                      Click any compartment to trigger Emergency Solenoid Disengage
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Emergency Remote Force Unlock Modal (Dual-Authorization) */}
      {forceUnlockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B192C] border-2 border-red-500 p-6 shadow-2xl space-y-5 text-slate-900 dark:text-white">
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base">
                  Emergency Remote Force Unlock
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {forceUnlockTarget.stationName} · Compartment #{forceUnlockTarget.compartmentNumber}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              WARNING: This command transmits an immediate pulse to disengage the 12V solenoid lock. It will be logged in the permanent USTP Security Audit Trail with your timestamp and credentials.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Admin Master Authorization Key
              </label>
              <input
                type="password"
                value={adminAuthKey}
                onChange={(e) => setAdminAuthKey(e.target.value)}
                placeholder="Enter admin security password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#121212] font-mono text-xs focus:outline-none focus:border-red-500"
              />
            </div>

            {unlockFeedback && (
              <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-medium">
                {unlockFeedback}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setForceUnlockTarget(null);
                  setUnlockFeedback(null);
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleForceUnlockSubmit}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors shadow-md"
              >
                Disengage Solenoid
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
