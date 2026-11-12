import React, { useState } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
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
  LogOut,
  Zap,
  Server,
  Wifi,
  Radio,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { AdminTab, TamperAlertEvent } from '../../types';

export const AdminPortal: React.FC = () => {
  const {
    currentAdmin,
    logout,
    activeAdminTab,
    setActiveAdminTab,
    stations,
    alerts,
    resolveAlert,
    remoteForceUnlock,
    toggleStationMaintenance,
    emptyCoinHopper,
    rebootStationGateway,
    emergencyFanOverride,
    setIsKioskModalOpen,
  } = useUniCharge();

  // Financial metrics
  const totalDigitalRev = stations.reduce((acc, s) => acc + s.digitalRevenue, 0);
  const totalCoinRev = stations.reduce((acc, s) => acc + s.coinRevenue, 0);
  const totalRevenue = totalDigitalRev + totalCoinRev;
  const digitalShare = totalRevenue > 0 ? Math.round((totalDigitalRev / totalRevenue) * 100) : 0;
  const coinShare = 100 - digitalShare;

  // Unresolved alerts count
  const unresolvedAlerts = alerts.filter(a => !a.isResolved);
  const criticalCount = unresolvedAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = unresolvedAlerts.filter(a => a.severity === 'warning').length;

  // Remote Force Unlock Modal state
  const [forceUnlockTarget, setForceUnlockTarget] = useState<{
    compartmentId: string;
    compartmentNumber: number;
    stationName: string;
  } | null>(null);
  const [adminAuthKey, setAdminAuthKey] = useState('USTP-ADMIN-99');
  const [unlockFeedback, setUnlockFeedback] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleForceUnlockSubmit = () => {
    if (!forceUnlockTarget) return;
    const res = remoteForceUnlock(forceUnlockTarget.compartmentId, adminAuthKey);
    setUnlockFeedback(res.message);
    if (res.success) {
      setTimeout(() => {
        setForceUnlockTarget(null);
        setUnlockFeedback(null);
      }, 2200);
    }
  };

  const handleReboot = (stationId: string, name: string) => {
    rebootStationGateway(stationId);
    setActionNotice(`Reboot signal sent to ESP32 Gateway at ${name}. Connection re-initialized.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleFanOverride = (stationId: string, name: string) => {
    emergencyFanOverride(stationId);
    setActionNotice(`Emergency cooling fans at ${name} engaged at 3,200 RPM.`);
    setTimeout(() => setActionNotice(null), 4000);
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
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 flex flex-col">
      
      {/* 1. DEDICATED ADMIN TOP HEADER */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Wordmark & Security Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1B1448] text-white flex items-center justify-center font-bold shadow-sm border border-red-500/40">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-[#1B1448]">
                  USTP UniCharge Admin Control Panel
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-800 border border-red-200">
                  SECURITY & FACILITY
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Physical Plant & Facility Management · Automated IoT Safety Monitor
              </span>
            </div>
          </div>

          {/* Quick Header Right Items */}
          <div className="flex items-center gap-3">
            
            {/* Active Alert Badge */}
            {unresolvedAlerts.length > 0 && (
              <div
                onClick={() => setActiveAdminTab('security')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 font-mono text-xs cursor-pointer hover:bg-red-100 transition-colors"
                title="Click to view security alarms"
              >
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                <strong className="font-bold">{unresolvedAlerts.length}</strong>
                <span className="hidden sm:inline">Active Alarms</span>
              </div>
            )}

            {/* Admin Officer Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-[#1B1448] text-white flex items-center justify-center font-bold text-xs font-mono">
                {currentAdmin.name.charAt(0)}
              </div>
              <div className="hidden md:block text-left text-xs">
                <span className="font-bold text-slate-800 block leading-tight">
                  {currentAdmin.name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {currentAdmin.employeeId}
                </span>
              </div>
            </div>

            {/* Kiosk Simulator Quick Test */}
            <button
              onClick={() => setIsKioskModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#1B1448] bg-[#FBB03B] hover:bg-[#FBB03B]/90 rounded-xl transition-all shadow-xs"
              title="Test physical locker kiosk screen"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Kiosk Terminal Simulator</span>
            </button>

          </div>
        </div>

        {/* 2. DEEP INDIGO-NAVY NAVIGATION BAR */}
        <div className="bg-[#1B1448] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            
            <nav className="flex space-x-1 sm:space-x-4">
              {[
                { id: 'overview', label: 'System Overview' },
                { id: 'telemetry', label: 'Kiosk Telemetry' },
                { id: 'security', label: 'Security & Tampers' },
                { id: 'revenue', label: 'Revenue Analytics' },
              ].map(tab => {
                const isActive = activeAdminTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAdminTab(tab.id as AdminTab)}
                    className={`py-3.5 px-3 text-xs font-bold transition-all relative whitespace-nowrap flex items-center gap-1.5 ${
                      isActive
                        ? 'text-[#FBB03B]'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.id === 'security' && unresolvedAlerts.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-red-500 text-white font-bold">
                        {unresolvedAlerts.length}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 inset-x-2 h-0.5 bg-[#FBB03B] rounded-t-full shadow-xs" />
                    )}
                  </button>
                );
              })}
            </nav>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Sign out of Admin Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium flex items-center justify-between animate-in fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-700">✕</button>
          </div>
        )}

        {/* =========================================================================
            TAB 1: SYSTEM OVERVIEW
        ========================================================================== */}
        {activeAdminTab === 'overview' && (
          <div className="space-y-6">
            
            {/* 4 KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Online Kiosks */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-bold uppercase tracking-wider">Online Kiosks</span>
                  <Wifi className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-3xl font-black font-mono text-[#1B1448] tabular-nums">
                  3 / 3
                </div>
                <span className="text-xs text-emerald-600 font-semibold block mt-1">
                  100% Station Uptime
                </span>
              </div>

              {/* Thermal Warnings */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-bold uppercase tracking-wider">Thermal Warnings</span>
                  <Thermometer className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-3xl font-black font-mono text-amber-600 tabular-nums">
                  {warningCount} Active
                </div>
                <span className="text-xs text-slate-500 block mt-1">
                  Max rack: 33.1°C (Safe limit: 55°C)
                </span>
              </div>

              {/* Security Breaches */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-bold uppercase tracking-wider">Security Breaches</span>
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                </div>
                <div className="text-3xl font-black font-mono text-red-600 tabular-nums">
                  {criticalCount} Critical
                </div>
                <span className="text-xs text-red-600 font-semibold block mt-1">
                  LIB-04 latch vibration flagged
                </span>
              </div>

              {/* Today's Revenue */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-bold uppercase tracking-wider">Cumulative Revenue</span>
                  <TrendingUp className="w-4 h-4 text-[#FBB03B]" />
                </div>
                <div className="text-3xl font-black font-mono text-[#1B1448] tabular-nums">
                  ₱{totalRevenue.toLocaleString()}.00
                </div>
                <span className="text-xs text-slate-500 block mt-1">
                  Digital: {digitalShare}% · Coin Slot: {coinShare}%
                </span>
              </div>

            </div>

            {/* LIVE KIOSK STATUS TABLE WITH FORCE UNLOCK BUTTONS */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-[#1B1448]">
                    Campus Kiosk Operations & Master Solenoid Controls
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live telemetry feed from station microcontrollers. Use Force Unlock only with dual verification.
                  </p>
                </div>

                <button
                  onClick={handleExportAuditCSV}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV Log</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-mono uppercase tracking-wider border-b border-[#E5E7EB]">
                    <tr>
                      <th className="py-3 px-4">Station Kiosk</th>
                      <th className="py-3 px-4">Location Zone</th>
                      <th className="py-3 px-4">Network / IP</th>
                      <th className="py-3 px-4">Line Voltage</th>
                      <th className="py-3 px-4">Compartments</th>
                      <th className="py-3 px-4">Hopper Coins</th>
                      <th className="py-3 px-4">Station State</th>
                      <th className="py-3 px-4 text-right">Emergency Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                    {stations.map(st => {
                      const free = st.compartments.filter(c => c.status === 'available').length;
                      const hasAlert = st.compartments.some(c => c.status === 'tamper_alert');

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#1B1448]">
                            <div>{st.name}</div>
                            <span className="text-[10px] text-slate-400 font-sans font-normal">{st.buildingCode}</span>
                          </td>
                          <td className="py-3.5 px-4 font-sans text-slate-600">
                            {st.campusZone}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-slate-800 font-semibold">{st.ipAddress}</span>
                            <span className="block text-[10px] text-emerald-600">Heartbeat: {st.lastHeartbeat}</span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            {st.voltage.toFixed(1)} V
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-emerald-600 font-bold">{free} Free</span>
                            <span className="text-slate-400"> / {st.compartments.length}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-[#1B1448]">{st.coinHopperCount}</span>
                            <span className="text-slate-400"> / {st.coinHopperCapacity}</span>
                          </td>
                          <td className="py-3.5 px-4 font-sans">
                            <button
                              onClick={() => toggleStationMaintenance(st.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                                st.status === 'online'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {st.status}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Force Unlock on first in-use compartment or alert compartment */}
                              <button
                                onClick={() => {
                                  const targetComp = st.compartments.find(c => c.status === 'tamper_alert') || st.compartments[0];
                                  setForceUnlockTarget({
                                    compartmentId: targetComp.id,
                                    compartmentNumber: targetComp.compartmentNumber,
                                    stationName: st.name,
                                  });
                                }}
                                className="px-2.5 py-1 text-[11px] font-sans font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs flex items-center gap-1"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Force Unlock</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            TAB 2: KIOSK TELEMETRY
        ========================================================================== */}
        {activeAdminTab === 'telemetry' && (
          <div className="space-y-6">
            
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-[#1B1448]">
                  Hardware Diagnostics & Microcontroller Fleet Health
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed sensor telemetry, 220V AC relay stabilization factor, and gateway reboot controls.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {stations.map(station => (
                  <div
                    key={station.id}
                    className="p-5 rounded-xl border border-[#E5E7EB] bg-slate-50/60 space-y-4"
                  >
                    <div className="flex items-start justify-between pb-2 border-b border-slate-200">
                      <div>
                        <span className="font-extrabold text-sm text-[#1B1448] block">
                          {station.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {station.buildingCode} · Gateway IP: {station.ipAddress}
                        </span>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="ESP32 Online" />
                    </div>

                    {/* Telemetry rows */}
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between p-2 rounded bg-white border border-slate-100">
                        <span className="text-slate-500">AC Output Stability:</span>
                        <strong className="text-emerald-700">{station.outputStabilityPercent}% (Nominal)</strong>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-white border border-slate-100">
                        <span className="text-slate-500">Internal Rack Temp:</span>
                        <strong className={station.temperature > 32 ? 'text-amber-600' : 'text-slate-900'}>
                          {station.temperature.toFixed(1)} °C
                        </strong>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-white border border-slate-100">
                        <span className="text-slate-500">Cooling Fan Speed:</span>
                        <strong className="text-slate-900">{station.fanSpeedRpm} RPM</strong>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-white border border-slate-100">
                        <span className="text-slate-500">Safety Relay:</span>
                        <strong className="text-emerald-700">{station.relayArmed ? 'ARMED & ACTIVE' : 'DISARMED'}</strong>
                      </div>
                    </div>

                    {/* Hardware Controls */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleReboot(station.id, station.name)}
                        className="flex-1 py-2 px-3 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reboot Gateway</span>
                      </button>

                      <button
                        onClick={() => handleFanOverride(station.id, station.name)}
                        className="py-2 px-3 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1"
                        title="Override Fan to 3200 RPM"
                      >
                        <Wind className="w-3.5 h-3.5" />
                        <span>Fan Boost</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            TAB 3: SECURITY & TAMPERS
        ========================================================================== */}
        {activeAdminTab === 'security' && (
          <div className="space-y-6">
            
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-[#1B1448]">
                    Security, Latch Vibration & Tamper Alarm Stream
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time alarm events detected by compartment piezoelectric sensors and optical switches.
                  </p>
                </div>

                <span className="px-3 py-1 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-mono font-bold">
                  {unresolvedAlerts.length} Unresolved Alarms
                </span>
              </div>

              <div className="space-y-3">
                {alerts.map(alert => {
                  const isCrit = alert.severity === 'critical';
                  const isWarn = alert.severity === 'warning';

                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                        alert.isResolved
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : isCrit
                          ? 'bg-red-50/70 border-red-200'
                          : isWarn
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-white border-[#E5E7EB]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isCrit ? 'bg-red-600 text-white' : isWarn ? 'bg-[#FBB03B] text-[#1B1448]' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-[#1B1448] font-mono">
                              [{alert.stationName}]
                            </span>
                            {alert.compartmentNumber > 0 && (
                              <span className="font-mono text-xs font-bold text-red-600">
                                Locker #{alert.compartmentNumber}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400 font-mono">
                              {alert.timestamp}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 mt-1">
                            {alert.message}
                          </p>
                        </div>
                      </div>

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
                            className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs flex items-center gap-1.5"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Remote Force Unlock</span>
                          </button>
                        )}

                        {!alert.isResolved && (
                          <button
                            onClick={() => resolveAlert(alert.id, currentAdmin.name)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-xs"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            TAB 4: REVENUE ANALYTICS
        ========================================================================== */}
        {activeAdminTab === 'revenue' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs">
                <span className="text-xs text-slate-400 uppercase font-bold block mb-1">
                  Total Collections
                </span>
                <div className="text-3xl font-black font-mono text-[#1B1448] tabular-nums">
                  ₱{totalRevenue.toLocaleString()}.00
                </div>
                <span className="text-xs text-slate-500 mt-1 block">Combined digital and cash channels</span>
              </div>

              <div className="bg-white rounded-2xl border border-sky-200 bg-sky-50/20 p-5 shadow-xs">
                <span className="text-xs text-sky-700 uppercase font-bold block mb-1">
                  Digital E-Wallet Revenue ({digitalShare}%)
                </span>
                <div className="text-3xl font-black font-mono text-sky-700 tabular-nums">
                  ₱{totalDigitalRev.toLocaleString()}.00
                </div>
                <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                  <div className="bg-sky-600 h-full rounded-full" style={{ width: `${digitalShare}%` }} />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/20 p-5 shadow-xs">
                <span className="text-xs text-amber-800 uppercase font-bold block mb-1">
                  Physical Coin Slot Revenue ({coinShare}%)
                </span>
                <div className="text-3xl font-black font-mono text-[#1B1448] tabular-nums">
                  ₱{totalCoinRev.toLocaleString()}.00
                </div>
                <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                  <div className="bg-[#FBB03B] h-full rounded-full" style={{ width: `${coinShare}%` }} />
                </div>
              </div>
            </div>

            {/* Hopper Capacity Meters */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-[#1B1448]">
                  Physical Coin Hopper Fill Status & Cash Dispatch
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Coin Capacity: 1,000 coins / station
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stations.map(station => {
                  const pct = Math.round((station.coinHopperCount / station.coinHopperCapacity) * 100);
                  const isHigh = pct >= 80;

                  return (
                    <div key={station.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-[#1B1448]">{station.name}</span>
                        <span className={`font-mono font-bold text-xs ${isHigh ? 'text-red-600' : 'text-slate-700'}`}>
                          {station.coinHopperCount} coins ({pct}%)
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isHigh ? 'bg-red-500' : 'bg-[#FBB03B]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[11px] font-mono text-slate-500">
                          ₱{station.coinRevenue.toLocaleString()} stored
                        </span>
                        <button
                          onClick={() => {
                            emptyCoinHopper(station.id);
                            setActionNotice(`Hopper at ${station.name} emptied and reset by Campus Cashier.`);
                            setTimeout(() => setActionNotice(null), 3500);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#1B1448] bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-xs"
                        >
                          Empty Hopper
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Emergency Remote Force Unlock Modal */}
      {forceUnlockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white border-2 border-red-500 p-6 shadow-2xl space-y-5 text-slate-900">
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-red-900">
                  Emergency Remote Force Unlock
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {forceUnlockTarget.stationName} · Compartment #{forceUnlockTarget.compartmentNumber}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
              WARNING: Transmits an immediate disengage pulse to the 12V solenoid lock. Logged in the permanent USTP Security Audit Trail under <strong>{currentAdmin.name}</strong>.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Admin Master Authorization Key
              </label>
              <input
                type="password"
                value={adminAuthKey}
                onChange={(e) => setAdminAuthKey(e.target.value)}
                placeholder="Enter admin security password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:border-red-500"
              />
            </div>

            {unlockFeedback && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                {unlockFeedback}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setForceUnlockTarget(null);
                  setUnlockFeedback(null);
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={handleForceUnlockSubmit}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm"
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
