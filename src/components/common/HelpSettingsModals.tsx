import React from 'react';
import { X, Settings, HelpCircle, Phone, Mail, ShieldCheck, Bell, Smartphone, Lock, CheckCircle2 } from 'lucide-react';
import { useUniCharge } from '../../context/UniChargeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: 'student' | 'admin';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, userType }) => {
  const { currentUser, currentAdmin } = useUniCharge();
  const [emailAlerts, setEmailAlerts] = React.useState(true);
  const [smsAlerts, setSmsAlerts] = React.useState(true);
  const [savedNotice, setSavedNotice] = React.useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#E5E7EB] shadow-2xl overflow-hidden text-slate-900">
        
        {/* Header */}
        <div className="p-4 border-b border-[#E5E7EB] bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1B1448] text-[#FBB03B] flex items-center justify-center font-bold">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#1B1448]">Account & Kiosk Settings</h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {userType === 'student' ? currentUser.studentId : currentAdmin.employeeId}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          
          {savedNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Preferences saved successfully!</span>
            </div>
          )}

          {/* User Profile Overview */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              {userType === 'student' ? 'Student Profile' : 'Admin Profile'}
            </span>
            <div className="font-extrabold text-[#1B1448] text-sm">
              {userType === 'student' ? currentUser.name : currentAdmin.name}
            </div>
            <div className="text-slate-600 font-mono text-[11px]">
              {userType === 'student' ? `${currentUser.college} · ${currentUser.email}` : `${currentAdmin.department} · ${currentAdmin.email}`}
            </div>
            {userType === 'student' && (
              <div className="text-[11px] text-[#FBB03B] font-mono font-bold pt-1">
                RFID: {currentUser.campusCardRfid}
              </div>
            )}
          </div>

          {/* Notification toggles */}
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Notification Preferences
            </span>

            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 block">Locker Expiry & Overtime Alerts</span>
                <span className="text-[11px] text-slate-500 block">Receive notification 15 mins before locker session ends</span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-[#1B1448] focus:ring-[#1B1448]"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 block">Solenoid & Vibration Tamper SMS</span>
                <span className="text-[11px] text-slate-500 block">Immediate alert if physical cabinet vibration is detected</span>
              </div>
              <input
                type="checkbox"
                checked={smsAlerts}
                onChange={(e) => setSmsAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-[#1B1448] focus:ring-[#1B1448]"
              />
            </label>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E7EB] bg-slate-50 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold text-white bg-[#1B1448] hover:bg-[#1B1448]/90 rounded-xl transition-colors shadow-xs"
          >
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
};

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E5E7EB] shadow-2xl overflow-hidden text-slate-900">
        
        {/* Header */}
        <div className="p-4 border-b border-[#E5E7EB] bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1B1448] text-[#FBB03B] flex items-center justify-center font-bold">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#1B1448]">UniCharge Help & Campus Support</h3>
              <p className="text-[11px] text-slate-500">24/7 Student Security & Technical Hotline</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          
          {/* Emergency contacts card */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 space-y-2">
            <span className="font-bold text-xs uppercase tracking-wider block text-amber-800">
              Emergency Locker Access & Stuck Door
            </span>
            <p className="text-slate-700 leading-relaxed">
              If your locker PIN is lost or the magnetic solenoid latch does not disengage, contact USTP Campus Security for immediate force unlock:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-amber-200">
                <Phone className="w-3.5 h-3.5 text-amber-600" />
                <span>Ext. 4102 / (088) 856-1738</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-amber-200">
                <Mail className="w-3.5 h-3.5 text-amber-600" />
                <span>unicharge@ustp.edu.ph</span>
              </div>
            </div>
          </div>

          {/* Quick FAQ Accordion / List */}
          <div className="space-y-2.5 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Frequently Asked Questions
            </span>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <span className="font-bold text-slate-900 block">What happens if my lecture exceeds the reserved time?</span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                UniCharge includes a 15-minute lecture grace period. After that, overtime is automatically deducted from your E-Wallet at ₱10/hr.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <span className="font-bold text-slate-900 block">Are 220V laptop chargers safe inside the lockers?</span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Yes! Every compartment contains smart surge-protected USB-PD 65W sockets and 220V AC relays with active cooling fan thermal cutoffs.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <span className="font-bold text-slate-900 block">Where are the coin hoppers located?</span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Directly on the front face of each kiosk at the Main Library Ground Floor, CITC 2nd Floor, and Engineering Study Sheds B.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E7EB] bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-[#1B1448] hover:bg-[#1B1448]/90 rounded-xl transition-colors shadow-xs"
          >
            Got it, Close
          </button>
        </div>

      </div>
    </div>
  );
};
