import React, { useState } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { sound } from '../../utils/audio';
import { KioskHardwareSimulator } from '../hardware/KioskHardwareSimulator';
import {
  Cpu,
  ShieldAlert,
  Users,
  Unlock,
  Wrench,
  CheckCircle2,
  Plus,
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

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  section,
  onChangeSection,
}) => {
  const {
    stations,
    users,
    securityAlerts,
    hardwareKioskStationId,
    setHardwareKioskStationId,
    adminRemoteUnlockSlot,
    adminToggleSlotMaintenance,
    adminProvisionStaff,
    resolveSecurityAlert,
  } = useUniCharge();

  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffId, setStaffId] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionSuccess, setProvisionSuccess] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'admin'>('all');

  const totalSlots = stations.reduce((sum, st) => sum + st.totalSlots, 0);
  const availableSlots = stations.reduce((sum, st) => sum + st.availableSlots, 0);
  const inUseSlots = stations.reduce(
    (sum, st) => sum + st.slots.filter((s) => s.status === 'in_use').length,
    0
  );
  const maintenanceSlots = totalSlots - availableSlots - inUseSlots;
  const totalPowerWatts = stations.reduce((sum, st) => sum + st.powerDrawWatts, 0);
  const unresolvedAlerts = securityAlerts.filter((a) => !a.resolved).length;

  const selectedHwStation =
    stations.find((s) => s.id === hardwareKioskStationId) || stations[0];

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError(null);
    const res = adminProvisionStaff({
      name: staffName,
      email: staffEmail,
      staffId,
      password: staffPassword,
    });
    if (!res.success) {
      setProvisionError(res.error || 'Failed to provision staff account.');
      return;
    }
    setProvisionSuccess(`Admin account ${res.user?.email} (${res.user?.studentIdNumber}) provisioned.`);
    setStaffName('');
    setStaffEmail('');
    setStaffId('');
    setStaffPassword('');
    setShowProvisionModal(false);
  };

  // 1. FLEET TELEMETRY OVERVIEW
  if (section === 'overview') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">
              Admin &amp; Telemetry Portal
            </h1>
            <p className="text-sm text-[#64748B]">
              Real-time campus kiosk fleet health, solenoid overrides, and power telemetry.
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

        {/* Fleet KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0]">
            <span className="text-xs font-medium text-[#64748B]">Kiosks Online</span>
            <div className="text-2xl font-bold text-[#5BC496] font-mono mt-1">
              {stations.filter((s) => s.online).length} / {stations.length}
            </div>
            <span className="text-xs text-[#64748B] mt-2 block">ESP32-S3 MQTT mesh nominal</span>
          </div>

          <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0]">
            <span className="text-xs font-medium text-[#64748B]">Active / Occupied Slots</span>
            <div className="text-2xl font-bold text-[#4E6E81] font-mono mt-1">
              {inUseSlots} / {totalSlots}
            </div>
            <span className="text-xs text-[#64748B] mt-2 block">
              {availableSlots} free · {maintenanceSlots} maintenance
            </span>
          </div>

          <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0]">
            <span className="text-xs font-medium text-[#64748B]">Aggregate Fleet Load</span>
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

        {/* Station Fleet Telemetry Table */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-base font-bold text-[#4E6E81]">Deployed Campus Kiosk Fleet</h2>
            <span className="text-xs font-mono text-[#64748B]">Live Hardware Telemetry</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-6 font-semibold">Kiosk Code</th>
                  <th className="py-3 px-4 font-semibold">Station Location</th>
                  <th className="py-3 px-4 font-semibold">Compartment Occupancy</th>
                  <th className="py-3 px-4 font-semibold">Power Draw</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-6 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {stations.map((st) => {
                  const busy = st.slots.filter((s) => s.status === 'in_use').length;
                  const maint = st.slots.filter((s) => s.status === 'maintenance').length;
                  return (
                    <tr key={st.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3.5 px-6 font-mono font-bold text-[#4E6E81]">
                        {st.campusCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#1E293B]">{st.name}</div>
                        <div className="text-[#64748B] text-[11px]">{st.floor}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-[#4E6E81] font-semibold">{st.availableSlots} Free</span>
                        {' · '}
                        <span className="text-[#F59E0B] font-semibold">{busy} Busy</span>
                        {maint > 0 && (
                          <>
                            {' · '}
                            <span className="text-[#DC2626] font-semibold">{maint} Maint</span>
                          </>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#1E293B]">{st.powerDrawWatts} W</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#EBF9F3] text-[#1E293B] font-semibold">
                          <Radio className="w-3.5 h-3.5 text-[#5BC496]" /> Online
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => {
                            sound.playTap();
                            setHardwareKioskStationId(st.id);
                            onChangeSection('hardware');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] cursor-pointer transition-colors"
                        >
                          Inspect Solenoids
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 2. HARDWARE & SOLENOID REMOTE OVERRIDE
  if (section === 'hardware') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4E6E81] tracking-tight">
              Kiosk Hardware &amp; Solenoid Override
            </h1>
            <p className="text-sm text-[#64748B]">
              Remotely trigger emergency compartment unlatching or lock faulty ports into maintenance mode.
            </p>
          </div>
          <select
            value={hardwareKioskStationId}
            onChange={(e) => {
              sound.playTap();
              setHardwareKioskStationId(e.target.value);
            }}
            className="h-10 px-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-xs font-semibold text-[#4E6E81] focus:outline-none focus:border-[#4E6E81]"
          >
            {stations.map((st) => (
              <option key={st.id} value={st.id}>
                {st.campusCode} — {st.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Admin Compartment Override Controls */}
          <div className="lg:col-span-5 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#4E6E81]">
              Compartment Control ({selectedHwStation.campusCode})
            </h2>
            <div className="divide-y divide-[#E2E8F0]">
              {selectedHwStation.slots.map((slot) => (
                <div key={slot.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#1E293B]">
                        Slot #{slot.slotNumber} ({slot.size})
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
                        {slot.status.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748B] font-mono">
                      {slot.currentTemp}°C · {slot.chargingPower}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => adminRemoteUnlockSlot(selectedHwStation.id, slot.slotNumber)}
                      title="Force Unlock Compartment"
                      className="px-2.5 py-1.5 rounded-lg bg-[#4E6E81] text-white text-[11px] font-semibold hover:bg-[#3D5767] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Unlock className="w-3 h-3 text-[#5BC496]" />
                      <span>Force Unlock</span>
                    </button>
                    <button
                      onClick={() => adminToggleSlotMaintenance(selectedHwStation.id, slot.slotNumber)}
                      title="Toggle Maintenance"
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                        slot.status === 'maintenance'
                          ? 'bg-red-50 border-red-200 text-[#DC2626]'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:bg-[#EDF2F5]'
                      }`}
                    >
                      <Wrench className="w-3 h-3" />
                      <span>{slot.status === 'maintenance' ? 'Restore' : 'Maint'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Live Physical 8-Door Simulator */}
          <div className="lg:col-span-7 rounded-2xl border border-[#E2E8F0] overflow-hidden bg-[#121212] shadow-sm">
            <KioskHardwareSimulator />
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
              Account roles are strictly bound at record level. Public signup only creates student accounts; staff accounts are provisioned internally here.
            </p>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              setProvisionError(null);
              setShowProvisionModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#5BC496] text-[#1E293B] text-xs font-bold hover:bg-[#48AD80] flex items-center gap-2 cursor-pointer shadow-sm shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4 text-[#1E293B]" />
            <span>Create Account (Staff)</span>
          </button>
        </div>

        {provisionSuccess && (
          <div className="p-3.5 rounded-xl bg-[#EBF9F3] border border-[#5BC496]/40 text-[#1E293B] text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#5BC496] shrink-0" />
            <span>{provisionSuccess}</span>
          </div>
        )}

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

        {/* Provision Staff Modal */}
        {showProvisionModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] border-t-4 border-t-[#4E6E81] p-6 shadow-xl">
              <h3 className="text-base font-bold text-[#1E293B]">
                Provision Internal Staff / Admin Account
              </h3>
              <p className="text-xs text-[#64748B] mt-1 mb-4">
                Creates an authorized account with <code className="font-mono text-[#4E6E81]">role: &apos;admin&apos;</code>.
              </p>

              {provisionError && (
                <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-[#DC2626] text-xs">
                  {provisionError}
                </div>
              )}

              <form onSubmit={handleCreateStaff} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="Engr. Ramon Magsaysay"
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4E6E81]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1E293B] mb-1">Staff ID</label>
                    <input
                      type="text"
                      required
                      value={staffId}
                      onChange={(e) => setStaffId(e.target.value)}
                      placeholder="ADMIN-02"
                      className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm font-mono focus:outline-none focus:border-[#4E6E81]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1E293B] mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="Min. 6 chars"
                      className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4E6E81]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">USTP Staff Email</label>
                  <input
                    type="email"
                    required
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="staff@ustp.edu.ph"
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4E6E81]"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProvisionModal(false)}
                    className="flex-1 h-10 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-10 rounded-xl bg-[#5BC496] text-[#1E293B] text-xs font-bold hover:bg-[#48AD80] cursor-pointer"
                  >
                    Create Admin Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
            Accelerometer tamper spikes, thermal threshold notifications, and overcharge relay triggers.
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
                      {alert.stationCode} · Slot #{alert.slotNumber}
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
          {section === 'support' ? 'Operations Support' : 'Fleet Threshold Settings'}
        </h1>
        <p className="text-sm text-[#64748B]">
          Configure automated thermal cut-off limits and campus ICT maintenance escalation.
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
              : 'Hardware Telemetry Guardrails'}
          </span>
        </div>
        <p>
          {section === 'support'
            ? 'Field technicians can be dispatched via USTP Facilities Management at extension 204 for physical solenoid coil or power supply replacement.'
            : 'Compartments automatically disable USB-C PD output when internal thermistor sensors exceed 42.0°C or when battery current drops below trickle threshold.'}
        </p>
        <div className="grid grid-cols-2 gap-3 font-mono">
          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[#64748B] block">Thermal Cut-Off</span>
            <span className="text-sm font-bold text-[#4E6E81]">42.0 °C</span>
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
