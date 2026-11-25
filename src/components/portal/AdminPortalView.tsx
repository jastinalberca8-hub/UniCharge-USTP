import React, { useState } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import {
  CHARGING_SLOT_COUNT,
  STORAGE_SLOT_COUNT,
  TOTAL_COMPARTMENT_COUNT,
  formatCompartmentLabel,
} from '../../constants/pricing';
import { sound } from '../../utils/audio';
import { KioskHardwareSimulator } from '../hardware/KioskHardwareSimulator';
import {
  Cpu,
  ShieldAlert,
  Users,
  Unlock,
  Wrench,
  CheckCircle2,
  Shield,
  AlertTriangle,
  Radio,
  Server,
  PhoneCall,
} from 'lucide-react';

export type AdminSection =
  | 'overview'
  | 'hardware'
  | 'users'
  | 'alerts'
  | 'settings'
  | 'support';

interface AdminPortalViewProps {
  section: AdminSection;
  onChangeSection: (section: AdminSection) => void;
}

function formatPaymentMethodLabel(method?: string): string {
  switch (method) {
    case 'cash':
      return 'Kiosk Coin Slot';
    case 'gcash':
      return 'GCash';
    case 'maya':
      return 'Maya';
    case 'gotyme':
      return 'GoTyme Bank';
    case 'wallet':
    default:
      return 'Campus E-Wallet';
  }
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  section,
  onChangeSection,
}) => {
  const {
    stations,
    users,
    securityAlerts,
    adminStationActivity,
    adminRemoteUnlockSlot,
    adminToggleSlotMaintenance,
    adminSimulateSessionFullCharge,
    triggerUnexpectedDoorOpen,
    resolveSecurityAlert,
  } = useUniCharge();

  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'admin'>('all');
  const [hardwareFeedback, setHardwareFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [togglingSlotNumber, setTogglingSlotNumber] = useState<number | null>(null);
  const [selectedSimulationSessionId, setSelectedSimulationSessionId] = useState('');
  const [simulationFeedback, setSimulationFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSimulatingCharge, setIsSimulatingCharge] = useState(false);

  const station = stations[0];
  const totalSlots = station?.totalSlots || TOTAL_COMPARTMENT_COUNT;
  const availableSlots = station?.availableSlots || 0;
  const inUseSlots = station
    ? station.slots.filter((s) => s.status === 'in_use').length
    : 0;
  const maintenanceSlots = Math.max(0, totalSlots - availableSlots - inUseSlots);
  const totalPowerWatts = station?.powerDrawWatts || 0;
  const unresolvedAlerts = securityAlerts.filter((a) => !a.resolved).length;
  const activeSimulationSessions = adminStationActivity.activeSessions.filter(
    (session) => session.kind === 'active'
  );
  const selectedSimulationSession =
    activeSimulationSessions.find((session) => session.id === selectedSimulationSessionId) ||
    activeSimulationSessions[0];

  const chargingFree = station
    ? station.slots.filter((s) => s.category === 'charging' && s.status === 'available').length
    : 0;
  const storageFree = station
    ? station.slots.filter((s) => s.category === 'storage' && s.status === 'available').length
    : 0;

  // 1. STATION TELEMETRY OVERVIEW
  if (section === 'overview') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">
              Admin
            </h1>
            <p className="text-sm text-[#64748B]">
              Real-time UniCharge Station health, 20-compartment solenoid overrides, and power telemetry.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onChangeSection('alerts')}
              className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-xs font-semibold text-[#1E293B] hover:bg-[#EDF2F5] flex items-center gap-2 cursor-pointer transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
              <span>{unresolvedAlerts} Open Alerts</span>
            </button>
            <button
              onClick={() => onChangeSection('hardware')}
              className="px-4 py-2 rounded-xl bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
            >
              <Cpu className="w-4 h-4 text-[#5BC496]" />
              <span>Open Hardware Console</span>
            </button>
          </div>
        </div>

        {/* Station KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0]">
            <span className="text-xs font-medium text-[#64748B]">Station Status</span>
            <div className="text-2xl font-bold text-[#5BC496] font-mono mt-1">
              {station?.online ? 'ONLINE' : 'OFFLINE'}
            </div>
            <span className="text-xs text-[#64748B] mt-2 block font-mono">
              {station?.campusCode} · ESP32-S3 MQTT
            </span>
          </div>

          <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0]">
            <span className="text-xs font-medium text-[#64748B]">Compartment Occupancy</span>
            <div className="text-2xl font-bold text-[#4E6E81] font-mono mt-1">
              {inUseSlots} / {totalSlots} Busy
            </div>
            <span className="text-xs text-[#64748B] mt-2 block">
              {chargingFree}/{CHARGING_SLOT_COUNT} Charging Free · {storageFree}/{STORAGE_SLOT_COUNT} Storage Free
            </span>
          </div>

          <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0]">
            <span className="text-xs font-medium text-[#64748B]">Station Power Load</span>
            <div className="text-2xl font-bold text-[#1E293B] font-mono mt-1">
              {(totalPowerWatts / 1000).toFixed(2)} kW
            </div>
            <span className="text-xs text-[#64748B] mt-2 block font-mono">
              {totalPowerWatts} W continuous draw
            </span>
          </div>

          <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0]">
            <span className="text-xs font-medium text-[#64748B]">Registered Accounts</span>
            <div className="text-2xl font-bold text-[#4E6E81] font-mono mt-1">
              {users.length}
            </div>
            <span className="text-xs text-[#64748B] mt-2 block">
              {users.filter((u) => u.role === 'student').length} students · {users.filter((u) => u.role === 'admin').length} admins
            </span>
          </div>
        </div>

        {/* Single Station Telemetry Summary */}
        {station && (
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#4E6E81]">
                  {station.name} ({station.campusCode})
                </h2>
                <span className="text-xs text-[#64748B]">
                  {CHARGING_SLOT_COUNT} Charging Compartments (#01–#15) · {STORAGE_SLOT_COUNT} Storage Compartments (S1–S5)
                </span>
              </div>
              <button
                onClick={() => {
                  sound.playTap();
                  onChangeSection('hardware');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] cursor-pointer transition-colors"
              >
                Inspect All 20 Solenoids
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[#64748B] block">Free Compartments</span>
                <span className="text-lg font-bold font-mono text-[#5BC496]">
                  {availableSlots} / {totalSlots}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[#64748B] block">Active Sessions</span>
                <span className="text-lg font-bold font-mono text-[#F59E0B]">
                  {inUseSlots} Busy
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[#64748B] block">Maintenance Lock</span>
                <span className="text-lg font-bold font-mono text-[#DC2626]">
                  {maintenanceSlots} Maint
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[#64748B] block">Hardware Link</span>
                <span className="inline-flex items-center gap-1.5 mt-1 font-semibold text-[#1E293B]">
                  <Radio className="w-3.5 h-3.5 text-[#5BC496]" /> Online
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Live Student Transactions at UniCharge Station */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#4E6E81]">
                Live UniCharge Station Transactions
              </h2>
              <span className="text-xs text-[#64748B]">
                Every student reservation, QR unlock, active session, and retrieval updates here automatically.
              </span>
            </div>
            <span className="text-xs font-mono text-[#64748B]">
              {adminStationActivity.pendingReservations.length} Reserved ·{' '}
              {adminStationActivity.activeSessions.filter((session) => session.kind === 'active').length}{' '}
              Active ·{' '}
              {adminStationActivity.activeSessions.filter((session) => session.kind === 'expired').length}{' '}
              Timed Out
            </span>
          </div>
          <div className="overflow-x-auto">
            {adminStationActivity.recentTransactions.length === 0 ? (
              <div className="py-8 px-6 text-center text-xs text-[#64748B]">
                No student locker transactions recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="py-3 px-6 font-semibold">Student</th>
                    <th className="py-3 px-4 font-semibold">Compartment</th>
                    <th className="py-3 px-4 font-semibold">Pricing Tier</th>
                    <th className="py-3 px-4 font-semibold">Fee</th>
                    <th className="py-3 px-6 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {adminStationActivity.recentTransactions.map((tx) => (
                    <tr key={`${tx.kind}-${tx.id}`} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-6">
                        <div className="font-semibold text-[#1E293B]">{tx.userName}</div>
                        <div className="text-[11px] font-mono text-[#64748B]">
                          {tx.studentIdNumber ? `${tx.studentIdNumber} · ${tx.id}` : tx.id}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#4E6E81]">
                        {formatCompartmentLabel(tx.slotNumber)}
                      </td>
                      <td className="py-3 px-4 text-[#1E293B]">{tx.pricingTier}</td>
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-[#1E293B]">₱{tx.totalFee.toFixed(2)}</div>
                        {tx.paymentMethod && (
                          <div className="text-[11px] font-sans text-[#64748B]">
                            {formatPaymentMethodLabel(tx.paymentMethod)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            tx.kind === 'reserved'
                              ? 'bg-amber-50 text-[#B45309] border border-amber-200'
                              : tx.kind === 'active'
                              ? 'bg-[#EBF9F3] text-[#15803D] border border-[#5BC496]/40'
                              : tx.kind === 'expired'
                              ? 'bg-amber-50 text-[#B45309] border border-amber-200'
                              : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'
                          }`}
                        >
                          {tx.kind === 'reserved'
                            ? 'Reserved (Awaiting Scan)'
                            : tx.kind === 'active'
                            ? 'Active Session'
                            : tx.kind === 'expired'
                            ? 'Time Expired · Retrieve'
                            : 'Completed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. HARDWARE & SOLENOID REMOTE OVERRIDE
  if (section === 'hardware' && station) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">
            Kiosk Hardware &amp; Solenoid Override
          </h1>
          <p className="text-sm text-[#64748B]">
            {station.name} ({station.campusCode}) — manage all {TOTAL_COMPARTMENT_COUNT} compartments ({CHARGING_SLOT_COUNT} Charging · {STORAGE_SLOT_COUNT} Storage).
          </p>
        </div>

        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#4E6E81]">Session Event Testing</h2>
            <p className="text-xs text-[#64748B] mt-1">
              Simulate a full charge or unexpected door opening for an active locker session.
            </p>
          </div>
          {activeSimulationSessions.length > 0 && selectedSimulationSession ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label
                  htmlFor="simulation-session"
                  className="text-xs font-semibold text-[#64748B] shrink-0"
                >
                  Active session
                </label>
                <select
                  id="simulation-session"
                  value={selectedSimulationSession.id}
                  onChange={(event) => setSelectedSimulationSessionId(event.target.value)}
                  className="min-w-0 flex-1 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#1E293B]"
                >
                  {activeSimulationSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.userName} · {formatCompartmentLabel(session.slotNumber)} · {session.pricingTier}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-[#64748B]">
                  {selectedSimulationSession.batteryCurrent ?? 0}% charged
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={
                    isSimulatingCharge || selectedSimulationSession.serviceType !== 'charging'
                  }
                  onClick={async () => {
                    setIsSimulatingCharge(true);
                    try {
                      const result = await adminSimulateSessionFullCharge(
                        selectedSimulationSession.id
                      );
                      setSimulationFeedback({
                        type: result.success ? 'success' : 'error',
                        text: result.message,
                      });
                    } catch (error) {
                      setSimulationFeedback({
                        type: 'error',
                        text:
                          error instanceof Error
                            ? error.message
                            : 'Failed to simulate full charge.',
                      });
                    } finally {
                      setIsSimulatingCharge(false);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#EBF9F3] border border-[#5BC496]/50 text-xs font-semibold text-[#1E293B] hover:bg-[#5BC496]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSimulatingCharge ? 'Simulating...' : 'Simulate 100% Charge'}
                </button>
                <button
                  type="button"
                  disabled={!selectedSimulationSession.userUid}
                  onClick={async () => {
                    if (!selectedSimulationSession.userUid) return;
                    const notificationSent = await triggerUnexpectedDoorOpen(
                      station.id,
                      selectedSimulationSession.slotNumber,
                      {
                        userUid: selectedSimulationSession.userUid,
                        sessionId: selectedSimulationSession.id,
                      }
                    );
                    setSimulationFeedback({
                      type: notificationSent ? 'success' : 'error',
                      text: notificationSent
                        ? `Door-open test and student alert sent for ${formatCompartmentLabel(
                            selectedSimulationSession.slotNumber
                          )}.`
                        : 'Door-open test ran, but the student alert could not be delivered. Check Firebase authentication and Firestore rules.',
                    });
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-[#DC2626] hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Test Unexpected Door Open
                </button>
              </div>
              {selectedSimulationSession.serviceType !== 'charging' && (
                <p className="text-[11px] text-[#64748B]">
                  Full-charge simulation is only available for charging sessions.
                </p>
              )}
              {!selectedSimulationSession.userUid && (
                <p className="text-[11px] text-[#DC2626]">
                  Notifications require a session linked to a student account.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-[#64748B]">
              No active locker sessions are available for testing.
            </p>
          )}
          {simulationFeedback && (
            <p
              role="status"
              className={`text-xs ${
                simulationFeedback.type === 'success' ? 'text-[#15803D]' : 'text-[#DC2626]'
              }`}
            >
              {simulationFeedback.text}
            </p>
          )}
        </div>

        {/* Full-Width Physical 20-Compartment Simulator (Admin Monitor Mode) */}
        <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden bg-[#F8FAFC] shadow-sm">
          <KioskHardwareSimulator adminMonitorOnly />
        </div>

        {/* Admin Compartment Override Controls */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#4E6E81]">
                Compartment Control ({station.campusCode})
              </h2>
              <p className="text-xs text-[#64748B]">
                Force-unlock individual 12V solenoids or lock compartments for maintenance.
              </p>
            </div>
            <span className="text-xs font-mono text-[#64748B]">
              {availableSlots}/{totalSlots} Available · {inUseSlots} Busy · {maintenanceSlots} Maint
            </span>
          </div>

          {hardwareFeedback && (
            <div
              role="status"
              className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 ${
                hardwareFeedback.type === 'success'
                  ? 'bg-[#EBF9F3] border-[#5BC496]/50 text-[#1E293B]'
                  : 'bg-red-50 border-red-200 text-[#DC2626]'
              }`}
            >
              <div className="flex items-center gap-2">
                {hardwareFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#5BC496] shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
                )}
                <span>{hardwareFeedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setHardwareFeedback(null)}
                className="text-[11px] font-semibold underline cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {station.slots.map((slot) => {
              const slotSession = adminStationActivity.activeSessions.find(
                (s) => s.slotNumber === slot.slotNumber
              );
              const slotReservation = adminStationActivity.pendingReservations.find(
                (r) => r.slotNumber === slot.slotNumber
              );
              const slotActivity = slotSession || slotReservation;

              return (
                <div
                  key={slot.id}
                  className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/60 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#1E293B]">
                        {formatCompartmentLabel(slot.slotNumber)}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          slot.status === 'available'
                            ? 'bg-[#EBF9F3] text-[#1E293B]'
                            : slot.status === 'in_use'
                            ? 'bg-amber-50 text-[#F59E0B]'
                            : 'bg-red-50 text-[#DC2626]'
                        }`}
                      >
                        {slotReservation
                          ? 'reserved'
                          : slot.status === 'in_use'
                          ? 'busy'
                          : slot.status.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748B] font-mono block mt-0.5">
                      {slot.chargingPower}
                    </span>
                    {slotActivity && (
                      <span className="text-[11px] text-[#4E6E81] font-medium block truncate mt-0.5">
                        {slotActivity.kind === 'reserved' ? 'Reserved by' : 'In use by'}{' '}
                        {slotActivity.userName} ({slotActivity.pricingTier})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setHardwareFeedback(null);
                        adminRemoteUnlockSlot(station.id, slot.slotNumber);
                        setHardwareFeedback({
                          type: 'success',
                          text: `${formatCompartmentLabel(slot.slotNumber)} force-unlocked & reset to Available.`,
                        });
                      }}
                      title="Force Unlock Compartment"
                      className="px-2.5 py-1.5 rounded-lg bg-[#4E6E81] text-white text-[11px] font-semibold hover:bg-[#3D5767] flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      <Unlock className="w-3 h-3 text-[#5BC496]" />
                      <span>Force Unlock</span>
                    </button>
                    <button
                      type="button"
                      disabled={togglingSlotNumber === slot.slotNumber}
                      onClick={() => {
                        void (async () => {
                          setHardwareFeedback(null);
                          setTogglingSlotNumber(slot.slotNumber);
                          try {
                            const res = await adminToggleSlotMaintenance(
                              station.id,
                              slot.slotNumber
                            );
                            if (res.message) {
                              setHardwareFeedback({
                                type: res.success ? 'success' : 'error',
                                text: res.message,
                              });
                            }
                          } finally {
                            setTogglingSlotNumber(null);
                          }
                        })();
                      }}
                      title={
                        slot.status === 'in_use'
                          ? 'Force Unlock first before enabling Maintenance'
                          : slot.status === 'maintenance'
                          ? 'Restore compartment to Available'
                          : 'Lock compartment for Maintenance'
                      }
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-60 ${
                        slot.status === 'maintenance'
                          ? 'bg-red-50 border-red-200 text-[#DC2626] hover:bg-red-100'
                          : slot.status === 'in_use'
                          ? 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8] hover:bg-amber-50'
                          : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#64748B] hover:bg-[#EDF2F5]'
                      }`}
                    >
                      <Wrench className="w-3 h-3" />
                      <span>
                        {togglingSlotNumber === slot.slotNumber
                          ? 'Updating...'
                          : slot.status === 'maintenance'
                          ? 'Restore'
                          : 'Maint'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 3. USERS & RBAC DIRECTORY
  if (section === 'users') {
    const displayedUsers = users.filter((u) =>
      roleFilter === 'all' ? true : u.role === roleFilter
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">
              Users &amp; RBAC Account Directory
            </h1>
            <p className="text-sm text-[#64748B]">
              Review user accounts and their assigned access roles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'student', 'admin'] as const).map((rf) => (
            <button
              key={rf}
              onClick={() => setRoleFilter(rf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer border ${
                roleFilter === rf
                  ? 'bg-[#4E6E81] text-white border-[#4E6E81]'
                  : 'bg-[#FFFFFF] text-[#64748B] border-[#E2E8F0] hover:bg-[#EDF2F5]'
              }`}
            >
              {rf === 'all' ? `All (${users.length})` : `${rf}s`}
            </button>
          ))}
        </div>

        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-6 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">ID Number</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Bound Role</th>
                  <th className="py-3 px-4 font-semibold">Created</th>
                  <th className="py-3 px-6 font-semibold text-right">Wallet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {displayedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-[#1E293B]">{u.name}</div>
                      <div className="text-[11px] text-[#64748B]">{u.degree}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#4E6E81]">
                      {u.studentIdNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#1E293B]">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-[#4E6E81] text-white'
                            : 'bg-[#EDF2F5] text-[#4E6E81]'
                        }`}
                      >
                        {u.role === 'admin' && <Shield className="w-3 h-3 text-[#5BC496]" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#64748B]">{u.createdAt}</td>
                    <td className="py-3.5 px-6 text-right font-mono font-semibold text-[#1E293B]">
                      ₱{u.walletBalance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  }

  // 4. SECURITY & TELEMETRY ALERTS
  if (section === 'alerts') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">Security &amp; Sensor Logs</h1>
          <p className="text-sm text-[#64748B]">
            Accelerometer tamper spikes, solenoid door alerts, and overcharge relay triggers.
          </p>
        </div>

        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
          {securityAlerts.map((alert) => (
            <div key={alert.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    alert.severity === 'critical'
                      ? 'bg-red-50 text-[#DC2626]'
                      : alert.severity === 'warning'
                      ? 'bg-amber-50 text-[#F59E0B]'
                      : 'bg-[#EBF9F3] text-[#5BC496]'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1E293B]">{alert.type}</span>
                    <span className="text-xs font-mono text-[#64748B]">
                      {alert.stationCode} · {formatCompartmentLabel(alert.slotNumber)}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">{alert.message}</p>
                  <span className="text-[11px] text-[#64748B] mt-1 block">{alert.timestamp}</span>
                </div>
              </div>
              <div className="shrink-0">
                {alert.resolved ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EBF9F3] text-xs font-semibold text-[#1E293B]">
                    <CheckCircle2 className="w-4 h-4 text-[#5BC496]" /> Resolved
                  </span>
                ) : (
                  <button
                    onClick={() => resolveSecurityAlert(alert.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] cursor-pointer transition-colors"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5. SETTINGS & SUPPORT
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">
          {section === 'support' ? 'Operations Support' : 'Station Safety & Guardrail Settings'}
        </h1>
        <p className="text-sm text-[#64748B]">
          {section === 'support'
            ? 'Campus ICT maintenance escalation and hardware servicing contacts.'
            : 'Automated overcharge cut-off relays and triaxial tamper thresholds.'}
        </p>
      </div>
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 space-y-4 text-xs text-[#64748B]">
        <div className="flex items-center gap-2 font-bold text-sm text-[#4E6E81]">
          {section === 'support' ? (
            <PhoneCall className="w-4 h-4 text-[#5BC496]" />
          ) : (
            <Server className="w-4 h-4 text-[#5BC496]" />
          )}
          <span>
            {section === 'support'
              ? 'USTP Campus ICT Infrastructure Escalation'
              : 'Hardware Protection Guardrails'}
          </span>
        </div>
        <p>
          {section === 'support'
            ? 'Field technicians can be dispatched via USTP Facilities Management at extension 204 for physical solenoid coil or power supply replacement.'
            : 'Compartments automatically disable USB-C PD output when connected devices reach 100% battery charge or trigger tamper alerts on unauthorized door opening.'}
        </p>
        <div className="grid grid-cols-2 gap-3 font-mono">
          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[#64748B] block">Overcharge Auto Cut-Off</span>
            <span className="text-sm font-bold text-[#4E6E81]">100% Full Charge</span>
          </div>
          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[#64748B] block">Tamper Threshold</span>
            <span className="text-sm font-bold text-[#4E6E81]">2.0 g (Triaxial)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
