import React, { useState } from 'react';
import { useUniCharge } from '../context/UniChargeContext';
import {
  X,
  Terminal,
  QrCode,
  Keyboard,
  Coins,
  Unlock,
  Lock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const KioskSimulatorModal: React.FC = () => {
  const {
    isKioskModalOpen,
    setIsKioskModalOpen,
    kioskInitialStationId,
    stations,
    currentUser,
    insertCoinAtKiosk,
    activeUserSessions,
    unlockAndEndSession,
  } = useUniCharge();

  const [stationId, setStationId] = useState(kioskInitialStationId || 'station-lib');
  const [activeTab, setActiveTab] = useState<'scan' | 'pin' | 'coins'>('pin');
  const [pinInput, setPinInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'idle' | 'success' | 'error';
    text: string;
    compartmentNumber?: number;
    compartmentId?: string;
  }>({ type: 'idle', text: 'Enter your 6-digit locker PIN or present QR token' });
  const [poppedDoor, setPoppedDoor] = useState<number | null>(null);

  if (!isKioskModalOpen) return null;

  const currentStation = stations.find(s => s.id === stationId) || stations[0];

  const handleKeyPress = (num: string) => {
    if (pinInput.length < 6) {
      setPinInput(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPinInput('');
    setStatusMessage({ type: 'idle', text: 'Enter your 6-digit locker PIN' });
  };

  const handlePinSubmit = () => {
    if (pinInput.length !== 6) {
      setStatusMessage({ type: 'error', text: 'Please enter all 6 digits of your PIN.' });
      return;
    }

    // Match PIN in current station compartments
    const matchedComp = currentStation.compartments.find(
      c => c.currentSession && c.currentSession.pinCode === pinInput
    );

    if (matchedComp) {
      setPoppedDoor(matchedComp.compartmentNumber);
      setStatusMessage({
        type: 'success',
        text: `PIN Verified! Magnetic solenoid released on Compartment #${matchedComp.compartmentNumber}.`,
        compartmentNumber: matchedComp.compartmentNumber,
        compartmentId: matchedComp.id,
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: `No active reservation found for PIN ${pinInput} at ${currentStation.buildingCode}.`,
      });
    }
  };

  const handleSimulateScan = (qrToken: string, pin: string) => {
    const matchedComp = currentStation.compartments.find(
      c => c.currentSession && (c.currentSession.qrToken === qrToken || c.currentSession.pinCode === pin)
    );

    if (matchedComp) {
      setPoppedDoor(matchedComp.compartmentNumber);
      setStatusMessage({
        type: 'success',
        text: `QR Authenticated! Solenoid latch released on Compartment #${matchedComp.compartmentNumber}.`,
        compartmentNumber: matchedComp.compartmentNumber,
        compartmentId: matchedComp.id,
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: `QR Token does not match an active locker at ${currentStation.name}.`,
      });
    }
  };

  const handleDeviceRetrieved = (compartmentId: string) => {
    unlockAndEndSession(compartmentId);
    setPoppedDoor(null);
    setPinInput('');
    setStatusMessage({
      type: 'success',
      text: 'Device retrieved! Door locked and compartment is now ready for the next student.',
    });
  };

  const handleCoinDrop = (val: number) => {
    insertCoinAtKiosk(currentStation.id, val);
    setStatusMessage({
      type: 'success',
      text: `₱${val}.00 accepted by optical coin validator. Hopper balance updated.`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#0B192C] border-2 border-[#1E3E62] shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]">
        
        {/* Kiosk Bezel / Top Bar */}
        <div className="p-4 bg-[#08121E] border-b border-[#1E3E62] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFC107] text-[#0B192C] flex items-center justify-center font-bold">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide text-white">
                  UniCharge Interactive Kiosk OS
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                  LIVE
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Firmware v3.4.2 · ESP32-S3 IoT Gateway · USTP IoT Lab
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Station Switcher */}
            <select
              value={stationId}
              onChange={(e) => {
                setStationId(e.target.value);
                setPinInput('');
                setPoppedDoor(null);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#121212] border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#FFC107]"
            >
              {stations.map(s => (
                <option key={s.id} value={s.id}>
                  {s.buildingCode} ({s.name})
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsKioskModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Kiosk Screen Viewport */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Status Display Screen */}
          <div className={`p-4 rounded-xl border text-center transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-red-500/10 border-red-500/50 text-red-300'
              : 'bg-[#121212] border-slate-800 text-slate-300'
          }`}>
            <span className="text-xs uppercase tracking-wider font-mono block opacity-75 mb-0.5">
              System Message
            </span>
            <p className="text-sm font-medium">{statusMessage.text}</p>
          </div>

          {/* Solenoid Door Pop State (When unlocked) */}
          {poppedDoor && statusMessage.compartmentId && (
            <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-950/40 to-[#121212] border-2 border-emerald-500 text-center space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-center gap-2 text-emerald-400">
                <Unlock className="w-6 h-6 animate-bounce" />
                <span className="text-lg font-black font-mono">
                  DOOR #{poppedDoor.toString().padStart(2, '0')} POPPED OPEN
                </span>
              </div>

              <div className="text-xs text-slate-300 max-w-md mx-auto space-y-1">
                <p>The 12V mechanical solenoid has disengaged. Please swing open the compartment door.</p>
                <p className="text-slate-400">
                  Plug in your device to activate smart fast-charging, or retrieve your belongings and firmly press the door shut.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => handleDeviceRetrieved(statusMessage.compartmentId!)}
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0B192C] font-bold text-xs transition-colors shadow-md"
                >
                  Retrieve Device & Close Door
                </button>
                <button
                  onClick={() => setPoppedDoor(null)}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Keep Door Open (Testing)
                </button>
              </div>
            </div>
          )}

          {/* Kiosk Mode Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-[#121212] border border-slate-800">
            <button
              onClick={() => setActiveTab('pin')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'pin'
                  ? 'bg-[#FFC107] text-[#0B192C]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Anti-Peep Keypad</span>
            </button>
            <button
              onClick={() => setActiveTab('scan')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'scan'
                  ? 'bg-[#FFC107] text-[#0B192C]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Scan QR Code</span>
            </button>
            <button
              onClick={() => setActiveTab('coins')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'coins'
                  ? 'bg-[#FFC107] text-[#0B192C]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Coin Validator</span>
            </button>
          </div>

          {/* Tab 1: Anti-Peep Keypad */}
          {activeTab === 'pin' && (
            <div className="max-w-xs mx-auto space-y-4">
              
              {/* PIN Display digits */}
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map(idx => (
                  <div
                    key={idx}
                    className={`w-10 h-12 rounded-lg border flex items-center justify-center font-mono text-xl font-bold transition-all ${
                      pinInput[idx]
                        ? 'border-[#FFC107] bg-[#FFC107]/20 text-[#FFC107]'
                        : 'border-slate-800 bg-[#121212] text-slate-600'
                    }`}
                  >
                    {pinInput[idx] ? pinInput[idx] : '•'}
                  </div>
                ))}
              </div>

              {/* Active Session Quick-Fill (Helpful for demo testing!) */}
              {activeUserSessions.length > 0 && (
                <div className="p-2.5 rounded-lg bg-[#1E3E62]/40 border border-slate-700 text-xs text-center">
                  <span className="text-slate-400 block text-[11px]">Quick Demo Test: Your Active Locker PIN</span>
                  <button
                    onClick={() => {
                      const pin = activeUserSessions[0].session.pinCode;
                      setPinInput(pin);
                    }}
                    className="mt-1 font-mono text-sm font-bold text-[#FFC107] underline"
                  >
                    {activeUserSessions[0].session.pinCode} (Locker #{activeUserSessions[0].compartment.compartmentNumber})
                  </button>
                </div>
              )}

              {/* Numeric Keypad Grid */}
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    onClick={() => handleKeyPress(num)}
                    className="h-12 rounded-xl bg-[#1A1A2E] hover:bg-[#1E3E62] border border-slate-700 text-lg font-mono font-bold text-white transition-colors active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={handleClear}
                  className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-semibold text-slate-400 transition-colors"
                >
                  CLR
                </button>
                <button
                  onClick={() => handleKeyPress('0')}
                  className="h-12 rounded-xl bg-[#1A1A2E] hover:bg-[#1E3E62] border border-slate-700 text-lg font-mono font-bold text-white transition-colors active:scale-95"
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-semibold text-slate-400 transition-colors"
                >
                  DEL
                </button>
              </div>

              {/* Submit Button */}
              <button
                onClick={handlePinSubmit}
                disabled={pinInput.length !== 6}
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm ${
                  pinInput.length === 6
                    ? 'bg-[#FFC107] hover:bg-[#FFB200] text-[#0B192C]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Authenticate PIN & Unlock
              </button>
            </div>
          )}

          {/* Tab 2: Optical QR Scanner */}
          {activeTab === 'scan' && (
            <div className="space-y-4 text-center max-w-md mx-auto">
              <div className="relative w-48 h-48 mx-auto rounded-2xl border-2 border-dashed border-[#FFC107] bg-[#121212] flex flex-col items-center justify-center p-4">
                <QrCode className="w-24 h-24 text-slate-600 animate-pulse" />
                <span className="text-[11px] text-[#FFC107] font-mono mt-2">
                  Optical Window Ready
                </span>
                <div className="absolute inset-x-4 top-1/2 h-0.5 bg-[#FFC107]/50 shadow-[0_0_8px_#FFC107]" />
              </div>

              <p className="text-xs text-slate-400">
                Hold your phone screen with the UniCharge reservation QR code against the optical reader.
              </p>

              {/* Quick Scan Emulators from active sessions */}
              {activeUserSessions.length > 0 ? (
                <div className="space-y-2 pt-2">
                  <span className="text-xs text-slate-400 font-mono block">
                    Simulate scanning active phone pass:
                  </span>
                  {activeUserSessions.map(({ session, compartment }) => (
                    <button
                      key={session.sessionId}
                      onClick={() => handleSimulateScan(session.qrToken, session.pinCode)}
                      className="w-full p-2.5 rounded-lg bg-[#1E3E62]/50 hover:bg-[#1E3E62] border border-slate-700 text-left flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <span className="font-bold text-white block">
                          Pass #{compartment.compartmentNumber} · {session.userName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {session.qrToken}
                        </span>
                      </div>
                      <span className="px-2 py-1 text-[10px] font-bold bg-[#FFC107] text-[#0B192C] rounded">
                        Scan Now
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
                  No active session found. Reserve a locker first or test using Anti-Peep Keypad.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Coin Slot Hopper */}
          {activeTab === 'coins' && (
            <div className="space-y-5 max-w-md mx-auto text-center">
              <div className="p-4 rounded-xl bg-[#121212] border border-slate-800 space-y-2">
                <Coins className="w-8 h-8 text-[#FFC107] mx-auto" />
                <h4 className="font-bold text-sm text-white">Physical Coin Validator</h4>
                <p className="text-xs text-slate-400">
                  Optical diameter & weight inductive sensor. Accepted denominations: New Generation Philippine Coins.
                </p>

                <div className="pt-2 flex items-center justify-between text-xs font-mono text-slate-400 border-t border-slate-800">
                  <span>Hopper Level:</span>
                  <span className="text-[#FFC107] font-bold tabular-nums">
                    {currentStation.coinHopperCount} / {currentStation.coinHopperCapacity} coins
                  </span>
                </div>
              </div>

              {/* Coin Buttons */}
              <div className="grid grid-cols-3 gap-3">
                {[5, 10, 20].map(val => (
                  <button
                    key={val}
                    onClick={() => handleCoinDrop(val)}
                    className="p-4 rounded-xl bg-[#1A1A2E] hover:bg-[#1E3E62] border border-[#FFC107]/40 text-center transition-all hover:scale-105 active:scale-95"
                  >
                    <span className="text-2xl font-black font-mono text-[#FFC107] block tabular-nums">
                      ₱{val}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mt-1">
                      Drop Coin
                    </span>
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-slate-500 font-mono">
                Dropping coins directly credits the kiosk hopper and logs into admin financial telemetry.
              </p>
            </div>
          )}

        </div>

        {/* Kiosk Footer with Emergency Support */}
        <div className="p-3 bg-[#08121E] border-t border-[#1E3E62] flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Kiosk ID: {currentStation.buildingCode}-K01</span>
          <span>Security Assistance: Ext. 4102</span>
        </div>

      </div>
    </div>
  );
};
