import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { useUniCharge } from '../../context/UniChargeContext';
import {
  TOTAL_COMPARTMENT_COUNT,
  formatCompartmentCode,
  formatCompartmentLabel,
} from '../../constants/pricing';
import { PendingUnlockToken } from '../../types';
import { sound } from '../../utils/audio';
import {
  Zap,
  Lock,
  Unlock,
  QrCode,
  Radio,
  CheckCircle2,
  AlertTriangle,
  ScanLine,
  KeyRound,
  Clock,
  ArrowLeft,
  ShieldCheck,
  Camera,
  CameraOff,
  RefreshCw,
  Loader2,
  Package,
  Coins,
  RotateCcw,
} from 'lucide-react';

type KioskScreenMode = 'idle' | 'scan_qr' | 'enter_pin' | 'insert_coin';

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

interface KioskHardwareSimulatorProps {
  adminMonitorOnly?: boolean;
}

export const KioskHardwareSimulator: React.FC<KioskHardwareSimulatorProps> = ({
  adminMonitorOnly = false,
}) => {
  const {
    currentUser,
    stations,
    isKioskDoorOpen,
    activeKioskSlotReleased,
    closeKioskDoor,
    pendingUnlockToken,
    pendingSecondsLeft,
    reservationTimeoutMessage,
    clearReservationTimeout,
    verifyKioskUnlock,
    regenerateUnlockToken,
    activeSession,
  } = useUniCharge();

  const isAdminMonitor = Boolean(adminMonitorOnly || currentUser?.role === 'admin');

  const [screenMode, setScreenMode] = useState<KioskScreenMode>('idle');
  const [pinInput, setPinInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Coin Acceptor State for QR/PIN Coin Bookings
  const [coinInserted, setCoinInserted] = useState<number>(0);
  const [coinAuthTarget, setCoinAuthTarget] = useState<{
    token: PendingUnlockToken;
    payload: string;
  } | null>(null);

  // 30-Second Door Left Open Safety Timer
  const [doorAjarSeconds, setDoorAjarSeconds] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const scanLockRef = useRef<boolean>(false);

  const currentStation = stations[0];

  const chargingFreeCount = currentStation.slots.filter(
    (s) => s.category === 'charging' && s.status === 'available'
  ).length;
  const storageFreeCount = currentStation.slots.filter(
    (s) => s.category === 'storage' && s.status === 'available'
  ).length;

  const requiredCoinFee = coinAuthTarget ? coinAuthTarget.token.totalFee : 0;

  useEffect(() => {
    if (!coinAuthTarget) return;
    if (
      !pendingUnlockToken ||
      pendingUnlockToken.tokenId !== coinAuthTarget.token.tokenId
    ) {
      setCoinAuthTarget(null);
      setCoinInserted(0);
      if (screenMode === 'insert_coin') {
        setScreenMode('idle');
      }
    }
  }, [coinAuthTarget, pendingUnlockToken, screenMode]);

  useEffect(() => {
    if (!isKioskDoorOpen || activeKioskSlotReleased === null) {
      setDoorAjarSeconds(0);
      return;
    }

    setDoorAjarSeconds(0);
    const interval = window.setInterval(() => {
      setDoorAjarSeconds((prev) => {
        const next = prev + 1;
        if (next === 30 || (next > 30 && next % 30 === 0)) {
          sound.playBeep();
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isKioskDoorOpen, activeKioskSlotReleased]);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const handleVerifyPayload = useCallback(
    async (payload: string) => {
      if (isVerifying) return;
      setIsVerifying(true);
      try {
        const result = await verifyKioskUnlock(payload, currentStation.id);
        if (result.requiresCoinPayment && result.token) {
          stopCamera();
          setPinInput('');
          setCoinAuthTarget({ token: result.token, payload });
          setCoinInserted(0);
          setScreenMode('insert_coin');
          setScanFeedback({
            type: 'success',
            text: result.message,
          });
          return;
        }

        setScanFeedback({
          type: result.success ? 'success' : 'error',
          text: result.message,
        });
        if (result.success) {
          stopCamera();
          setPinInput('');
          setCoinAuthTarget(null);
          setCoinInserted(0);
          setScreenMode('idle');
        }
      } finally {
        setIsVerifying(false);
        scanLockRef.current = false;
      }
    },
    [currentStation.id, isVerifying, stopCamera, verifyKioskUnlock]
  );

  const handleInsertCoin = (denomination: number) => {
    if (!coinAuthTarget) {
      sound.playTap();
      setScanFeedback({
        type: 'error',
        text: 'Please scan your booking QR code or enter your 6-digit PIN first before inserting coins.',
      });
      return;
    }
    const nextTotal = coinInserted + denomination;
    if (nextTotal > requiredCoinFee) {
      setScanFeedback({
        type: 'error',
        text: `That coin would exceed the exact ₱${requiredCoinFee.toFixed(2)} fee. Return coins or insert a smaller denomination.`,
      });
      return;
    }
    if (coinInserted < requiredCoinFee && nextTotal >= requiredCoinFee) {
      sound.playBeep();
    } else {
      sound.playTap();
    }
    setCoinInserted(nextTotal);
  };

  const handleConfirmCoinUnlock = async () => {
    if (isVerifying) return;
    if (!coinAuthTarget) {
      setScanFeedback({
        type: 'error',
        text: 'Scan your booking QR code or enter your 6-digit PIN first.',
      });
      return;
    }
    setIsVerifying(true);
    try {
      const result = await verifyKioskUnlock(
        coinAuthTarget.payload,
        currentStation.id,
        coinInserted
      );
      setScanFeedback({
        type: result.success ? 'success' : 'error',
        text: result.message,
      });
      if (result.success) {
        setCoinAuthTarget(null);
        setCoinInserted(0);
        setScreenMode('idle');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const startCamera = useCallback(
    async (preferredFacing: 'environment' | 'user' = facingMode) => {
      stopCamera();
      setCameraError(null);
      scanLockRef.current = false;

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        setCameraError(
          'Camera access is unavailable in this browser. Use the 6-digit PIN below.'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: preferredFacing },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
      } catch (err: unknown) {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError(
            'Camera permission was blocked. Allow camera access or use the 6-digit PIN below.'
          );
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError(
            'No camera detected on this device. Use the 6-digit PIN below.'
          );
        } else {
          setCameraError(
            'Could not start the camera. Use the 6-digit PIN below.'
          );
        }
      }
    },
    [facingMode, stopCamera]
  );

  useEffect(() => {
    if (screenMode !== 'scan_qr') {
      stopCamera();
      setCameraError(null);
    }
    return () => {
      stopCamera();
    };
  }, [screenMode, stopCamera]);

  useEffect(() => {
    if (!cameraActive || screenMode !== 'scan_qr') return;

    let cancelled = false;
    const scanFrame = () => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (
        video &&
        canvas &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        !scanLockRef.current
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (decoded?.data) {
            scanLockRef.current = true;
            stopCamera();
            void handleVerifyPayload(decoded.data);
            return;
          }
        }
      }

      rafRef.current = requestAnimationFrame(scanFrame);
    };

    rafRef.current = requestAnimationFrame(scanFrame);
    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [cameraActive, screenMode, handleVerifyPayload, stopCamera]);

  const handleKeyPress = (digit: string) => {
    sound.playTap();
    if (pinInput.length < 6) {
      setPinInput((prev) => prev + digit);
    }
  };

  const openCoinMode = () => {
    sound.playTap();
    if (isAdminMonitor) {
      setScanFeedback({
        type: 'error',
        text: 'Admin Monitor Mode: Kiosk coin acceptor is restricted to student rentals.',
      });
      return;
    }
    setScanFeedback(null);
    setCoinAuthTarget(null);
    setCoinInserted(0);
    setScreenMode('insert_coin');
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-[#1E293B] p-4 sm:p-5 overflow-y-auto">
      <canvas ref={canvasRef} className="hidden" />

      {/* Station Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-[#5BC496] animate-pulse" />
            <span className="text-[11px] font-bold text-[#4E6E81] uppercase tracking-wider">
              20-Compartment IoT Hardware Station
            </span>
          </div>
          <h2 className="text-base font-bold text-[#1E293B] tracking-tight">
            {currentStation.name}
          </h2>
          <span className="text-xs text-[#64748B] font-mono">
            {currentStation.campusCode} · 15 Charging (#01–#15) · 5 Storage (S1–S5)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1.5 rounded-xl bg-[#EBF9F3] border border-[#5BC496]/40 font-bold text-[#1E293B]">
            {chargingFreeCount}/15 Charging Free
          </span>
          <span className="px-2.5 py-1.5 rounded-xl bg-[#EDF2F5] border border-[#4E6E81]/30 font-bold text-[#4E6E81]">
            {storageFreeCount}/5 Storage Free
          </span>
        </div>
      </div>

      {/* Reservation Auto-Release Banner */}
      {reservationTimeoutMessage && (
        <div
          role="status"
          className="mb-4 max-w-4xl mx-auto w-full p-3 rounded-xl border bg-amber-50 border-amber-200 text-amber-900 text-xs font-medium flex items-start gap-2"
        >
          <Clock className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
          <span className="flex-1">{reservationTimeoutMessage}</span>
          <button
            type="button"
            onClick={clearReservationTimeout}
            className="text-[11px] font-semibold underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Kiosk Verification Toast */}
      {scanFeedback && (
        <div
          role="status"
          className={`mb-4 max-w-4xl mx-auto w-full p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${
            scanFeedback.type === 'success'
              ? 'bg-[#EBF9F3] border-[#5BC496]/50 text-[#1E293B]'
              : 'bg-red-50 border-red-200 text-[#DC2626]'
          }`}
        >
          {scanFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#5BC496] shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{scanFeedback.text}</span>
          <button
            onClick={() => setScanFeedback(null)}
            className="text-[11px] font-semibold underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* PHYSICAL 20-COMPARTMENT UNICHARGE CABINET (matches 3D CAD layout) */}
      <div className="max-w-5xl mx-auto w-full bg-[#4E6E81] rounded-3xl p-4 sm:p-5 border-4 border-[#3D5767] shadow-xl relative">
        {/* Top Cabinet Title */}
        <div className="text-center mb-3.5">
          <span className="text-sm sm:text-base font-extrabold text-[#FFFFFF] tracking-[0.22em] uppercase block">
            UNICHARGE STATION
          </span>
          <span className="text-[10px] text-[#EBF9F3]/90 font-mono">
            {currentStation.campusCode} · 20 Compartments (15 Charging · 5 Storage)
          </span>
        </div>

        {/* Cabinet Main Body: Backup Keys Strip | 5-Column Locker Matrix | Touchscreen + QR + Coin */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left 8 cols: Backup Keys + 5x5 Unified Locker Grid */}
          <div className="lg:col-span-8 flex gap-2.5 items-stretch min-w-0">
            {/* Backup Keys Lock Strip */}
            <div className="hidden sm:flex w-8 shrink-0 rounded-xl bg-[#27333C] border border-[#1E293B] flex-col items-center justify-center p-1 text-center shadow-inner">
              <span className="text-[8px] font-bold tracking-widest text-slate-200 uppercase [writing-mode:vertical-rl] rotate-180">
                BACKUP KEYS
              </span>
            </div>

            {/* Unified 5-Column x 5-Row Locker Matrix matching 3D CAD Render */}
            <div className="flex-1 min-w-0 grid grid-cols-[repeat(5,minmax(0,1fr))] grid-rows-[repeat(5,minmax(62px,1fr))] gap-2">
              {/* Row 1: Charging 11, 12, 13, 14, 15 */}
              <div className="col-start-1 row-start-1 min-w-0">{renderCompartment(11)}</div>
              <div className="col-start-2 row-start-1 min-w-0">{renderCompartment(12)}</div>
              <div className="col-start-3 row-start-1 min-w-0">{renderCompartment(13)}</div>
              <div className="col-start-4 row-start-1 min-w-0">{renderCompartment(14)}</div>
              <div className="col-start-5 row-start-1 min-w-0">{renderCompartment(15)}</div>

              {/* Column 1: Storage S2 (rows 2-3), S1 (rows 4-5) */}
              <div className="col-start-1 row-start-2 row-span-2 min-w-0">
                {renderCompartment(17)}
              </div>
              <div className="col-start-1 row-start-4 row-span-2 min-w-0">
                {renderCompartment(16)}
              </div>

              {/* Column 2: Charging 04, 03, 02, 01 (rows 2-5) */}
              <div className="col-start-2 row-start-2 min-w-0">{renderCompartment(4)}</div>
              <div className="col-start-2 row-start-3 min-w-0">{renderCompartment(3)}</div>
              <div className="col-start-2 row-start-4 min-w-0">{renderCompartment(2)}</div>
              <div className="col-start-2 row-start-5 min-w-0">{renderCompartment(1)}</div>

              {/* Column 3: Storage S5 (rows 2-3) + Charging 10, 09 (rows 4-5) */}
              <div className="col-start-3 row-start-2 row-span-2 min-w-0">
                {renderCompartment(20)}
              </div>
              <div className="col-start-3 row-start-4 min-w-0">{renderCompartment(10)}</div>
              <div className="col-start-3 row-start-5 min-w-0">{renderCompartment(9)}</div>

              {/* Column 4: Charging 08, 07, 06, 05 (rows 2-5) */}
              <div className="col-start-4 row-start-2 min-w-0">{renderCompartment(8)}</div>
              <div className="col-start-4 row-start-3 min-w-0">{renderCompartment(7)}</div>
              <div className="col-start-4 row-start-4 min-w-0">{renderCompartment(6)}</div>
              <div className="col-start-4 row-start-5 min-w-0">{renderCompartment(5)}</div>

              {/* Column 5: Storage S4 (rows 2-3), S3 (rows 4-5) */}
              <div className="col-start-5 row-start-2 row-span-2 min-w-0">
                {renderCompartment(19)}
              </div>
              <div className="col-start-5 row-start-4 row-span-2 min-w-0">
                {renderCompartment(18)}
              </div>
            </div>
          </div>

          {/* Right 4 cols: Embedded Touchscreen + SCAN QR CODE + INSERT COIN */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-3 min-w-0">
            <div className="flex-1 flex flex-col justify-between rounded-2xl bg-[#FFFFFF] border-2 border-[#1E293B] p-3.5 text-center shadow-inner">
              {/* Touchscreen Top Bar */}
              <div className="bg-[#EDF2F5] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold text-[#4E6E81] uppercase tracking-wider whitespace-nowrap">
                  Touchscreen UI
                </span>
                <span className="text-[10px] font-mono font-semibold text-[#5BC496] flex items-center gap-1 whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5BC496] animate-pulse" />
                  ONLINE
                </span>
              </div>

              {screenMode === 'idle' && (
                <div className="flex-1 flex flex-col items-center justify-between py-1 space-y-2">
                  <div className="flex-1 flex flex-col items-center justify-center px-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4E6E81]">
                      Ready to Scan
                    </span>
                    <p className="text-xs text-[#64748B] leading-snug mt-2">
                      Scan your booking QR at the scanner below.
                    </p>
                    <p className="text-[10px] font-semibold text-[#4E6E81] mt-1">
                      Or enter your 6-digit PIN.
                    </p>
                  </div>

                  {isAdminMonitor ? (
                    <div className="w-full space-y-2 text-left">
                      <div className="p-2.5 rounded-xl bg-[#EDF2F5] border border-[#4E6E81]/30 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#4E6E81] uppercase">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#5BC496]" />
                          <span>Admin Monitor Mode</span>
                        </div>
                        <p className="text-[10px] text-[#475569] leading-snug">
                          Kiosk self-service (QR scan, PIN, and Insert Coin) is restricted to student accounts.
                        </p>
                      </div>
                      <p className="text-[9px] text-[#64748B] text-center leading-snug">
                        Use <strong>Compartment Control</strong> below for Force Unlock or Maintenance locks.
                      </p>
                    </div>
                  ) : (
                    <div className="w-full space-y-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playTap();
                          setScanFeedback(null);
                          setScreenMode('scan_qr');
                          void startCamera(facingMode);
                        }}
                        className="w-full h-8.5 rounded-xl bg-[#4E6E81] hover:bg-[#3D5767] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      >
                        <span>Scan QR Code</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playTap();
                          setScanFeedback(null);
                          setScreenMode('enter_pin');
                        }}
                        className="w-full h-8.5 rounded-xl bg-[#EDF2F5] hover:bg-[#E2E8F0] text-[#4E6E81] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>6-Digit PIN</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {screenMode === 'scan_qr' && (
                <div className="flex-1 flex flex-col justify-between py-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        stopCamera();
                        setScreenMode('idle');
                      }}
                      className="text-[11px] font-semibold text-[#4E6E81] hover:text-[#1E293B] flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back
                    </button>
                    <span className="text-[10px] font-bold text-[#4E6E81] uppercase">
                      QR Scanner
                    </span>
                  </div>

                  <div className="relative rounded-xl bg-[#1E293B] text-white flex flex-col items-center justify-center min-h-[144px] overflow-hidden border border-[#334155]">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className={`w-full h-36 object-cover ${cameraActive ? 'block' : 'hidden'}`}
                    />

                    {cameraActive && (
                      <>
                        <div className="absolute inset-3 border-2 border-dashed border-[#5BC496]/80 rounded-lg pointer-events-none" />
                        <div className="absolute left-3 right-3 top-1/2 h-0.5 bg-[#5BC496] shadow-[0_0_8px_#5BC496] animate-pulse pointer-events-none" />
                        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/65 text-[9px] font-mono text-[#5BC496] whitespace-nowrap">
                          Hold emailed QR to camera
                        </span>
                      </>
                    )}

                    {!cameraActive && (
                      <div className="p-3 space-y-2 relative z-10 w-full">
                        {isVerifying ? (
                          <div className="flex flex-col items-center gap-1.5 py-2">
                            <Loader2 className="w-5 h-5 text-[#5BC496] animate-spin" />
                            <span className="text-[10px] text-slate-200 font-semibold">
                              Verifying pass &amp; releasing latch...
                            </span>
                          </div>
                        ) : (
                          <>
                            {cameraError ? (
                              <p className="text-[10px] text-amber-300 leading-snug">
                                {cameraError}
                              </p>
                            ) : (
                              <div className="space-y-1">
                                <ScanLine className="w-5 h-5 text-[#5BC496] mx-auto" />
                                <p className="text-[10px] text-slate-300 leading-snug">
                                  Show the QR from your UniCharge portal to the kiosk camera.
                                </p>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => void startCamera(facingMode)}
                              className="w-full py-1.5 px-2.5 rounded-lg bg-[#5BC496] hover:bg-[#48AD80] text-[#1E293B] text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Start Camera</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    className={`grid gap-1.5 ${
                      cameraActive ? 'grid-cols-2' : 'grid-cols-1'
                    }`}
                  >
                    {cameraActive ? (
                      <button
                        type="button"
                        onClick={() => {
                          const next = facingMode === 'environment' ? 'user' : 'environment';
                          setFacingMode(next);
                          void startCamera(next);
                        }}
                        className="py-1.5 px-2 rounded-lg bg-[#EDF2F5] hover:bg-[#E2E8F0] text-[#4E6E81] text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Flip Cam</span>
                      </button>
                    ) : null}

                    {cameraActive ? (
                      <button
                        type="button"
                        onClick={() => stopCamera()}
                        className="py-1.5 px-2 rounded-lg bg-[#EDF2F5] hover:bg-red-50 text-[#4E6E81] hover:text-[#DC2626] text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CameraOff className="w-3 h-3" />
                        <span>Stop Cam</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setScreenMode('enter_pin')}
                        className="py-1.5 px-2 rounded-lg bg-[#EDF2F5] hover:bg-[#E2E8F0] text-[#4E6E81] text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>6-Digit PIN</span>
                      </button>
                    )}
                  </div>

                  {pendingUnlockToken &&
                    (pendingSecondsLeft === 0 ? (
                      <button
                        type="button"
                        onClick={() => void regenerateUnlockToken()}
                        className="w-full py-1.5 px-2 rounded-lg bg-[#F59E0B] text-white text-[10px] font-bold cursor-pointer hover:bg-amber-600"
                      >
                        QR Expired — Regenerate
                      </button>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-[#4E6E81]">
                          <Clock className="w-3 h-3 text-[#5BC496]" />
                          <span>
                            {formatCompartmentLabel(pendingUnlockToken.slotNumber)} ·{' '}
                            {formatCountdown(pendingSecondsLeft)}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isVerifying}
                          onClick={() => void handleVerifyPayload(pendingUnlockToken.qrPayload)}
                          className="w-full py-1.5 px-2 rounded-lg bg-[#4E6E81] hover:bg-[#3D5767] text-white text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <QrCode className="w-3 h-3 text-[#5BC496]" />
                          <span>Hold Generated QR to Scanner</span>
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {screenMode === 'enter_pin' && (
                <div className="flex-1 flex flex-col justify-between py-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setPinInput('');
                        setScreenMode('idle');
                      }}
                      className="text-[11px] font-semibold text-[#4E6E81] hover:text-[#1E293B] flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back
                    </button>
                    <span className="text-[10px] font-bold text-[#4E6E81] uppercase">
                      6-Digit PIN
                    </span>
                  </div>

                  <div className="px-2 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-base font-bold tracking-[0.25em] text-[#1E293B]">
                    {pinInput.padEnd(6, '•')}
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'].map(
                      (key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            if (key === 'CLR') {
                              sound.playTap();
                              setPinInput('');
                            } else if (key === 'DEL') {
                              sound.playTap();
                              setPinInput((p) => p.slice(0, -1));
                            } else {
                              handleKeyPress(key);
                            }
                          }}
                          className="h-7 rounded-lg bg-[#F8FAFC] hover:bg-[#EDF2F5] border border-[#E2E8F0] text-[11px] font-bold font-mono text-[#1E293B] cursor-pointer"
                        >
                          {key}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={pinInput.length < 6 || isVerifying}
                    onClick={() => void handleVerifyPayload(pinInput)}
                    className="w-full h-8 rounded-xl bg-[#5BC496] disabled:bg-[#E2E8F0] disabled:text-[#64748B] text-[#1E293B] text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-[#48AD80] transition-colors"
                  >
                    {isVerifying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    <span>{isVerifying ? 'Verifying...' : 'Verify & Unlatch'}</span>
                  </button>

                  <span className="text-[9px] text-[#64748B] leading-tight">
                    Forgot phone or PIN? Request Admin Force Unlock.
                  </span>
                </div>
              )}

              {screenMode === 'insert_coin' && (
                <div className="flex-1 flex flex-col justify-between py-1 space-y-2.5 text-left">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setCoinAuthTarget(null);
                        setCoinInserted(0);
                        setScreenMode('idle');
                      }}
                      className="text-[11px] font-semibold text-[#4E6E81] hover:text-[#1E293B] flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back
                    </button>
                    <span className="text-[10px] font-bold text-[#4E6E81] uppercase">
                      {coinAuthTarget ? 'Coin Payment LED' : 'Insert Coin'}
                    </span>
                  </div>

                  {coinAuthTarget ? (
                    <>
                      {/* LED Payment Prompt Banner */}
                      <div
                        className={`p-3 rounded-xl border text-center space-y-1 transition-colors ${
                          coinInserted >= requiredCoinFee
                            ? 'bg-[#EBF9F3] border-[#5BC496] text-[#1E293B]'
                            : 'bg-[#1E293B] border-[#334155] text-white'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {coinInserted >= requiredCoinFee ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                          ) : (
                            <Coins className="w-3.5 h-3.5 text-[#5BC496] animate-pulse" />
                          )}
                          <span
                            className={`text-[9px] font-mono font-bold uppercase tracking-wider ${
                              coinInserted >= requiredCoinFee ? 'text-[#059669]' : 'text-[#5BC496]'
                            }`}
                          >
                            {coinInserted >= requiredCoinFee
                              ? 'Payment Complete · Ready to Unlock'
                              : 'Coin Slot Active · Waiting for Coins'}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold leading-snug">
                          {coinInserted >= requiredCoinFee
                            ? `Tap Unlock below to access ${formatCompartmentLabel(
                                coinAuthTarget.token.slotNumber
                              )}.`
                            : `Please insert ₱${(requiredCoinFee - coinInserted).toFixed(
                                2
                              )} in coins to access ${formatCompartmentLabel(
                                coinAuthTarget.token.slotNumber
                              )}.`}
                        </p>
                      </div>

                      {/* Booked Locker Details */}
                      <div className="px-2.5 py-2 rounded-xl bg-[#EDF2F5] border border-[#4E6E81]/20 space-y-0.5 text-[10px]">
                        <div className="font-bold text-[#1E293B] flex items-center justify-between">
                          <span>{formatCompartmentLabel(coinAuthTarget.token.slotNumber)}</span>
                          <span className="font-mono text-[#4E6E81]">
                            ₱{coinAuthTarget.token.totalFee.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[#64748B] flex items-center justify-between">
                          <span>{coinAuthTarget.token.pricingTier}</span>
                          <span className="font-mono">
                            {formatCountdown(pendingSecondsLeft)} left
                          </span>
                        </div>
                      </div>

                      {/* Coin Counter LED Readout */}
                      <div className="px-2.5 py-2 rounded-xl bg-[#1E293B] text-white space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-300">Inserted / Required</span>
                          <span
                            className={`font-mono font-bold ${
                              coinInserted >= requiredCoinFee ? 'text-[#5BC496]' : 'text-amber-300'
                            }`}
                          >
                            ₱{coinInserted.toFixed(2)} / ₱{requiredCoinFee.toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-[#5BC496] transition-all duration-200"
                            style={{
                              width: `${Math.min(
                                100,
                                requiredCoinFee > 0 ? (coinInserted / requiredCoinFee) * 100 : 0
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Coin Denomination Buttons + Reset */}
                      <div className="grid grid-cols-5 gap-1">
                        {[1, 5, 10, 20].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleInsertCoin(val)}
                            disabled={isVerifying || coinInserted + val > requiredCoinFee}
                            className="h-7 rounded-lg bg-[#EDF2F5] hover:bg-[#5BC496]/25 border border-[#E2E8F0] text-[10px] font-mono font-bold text-[#1E293B] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            +₱{val}
                          </button>
                        ))}
                        <button
                          type="button"
                          title="Return inserted coins"
                          onClick={() => {
                            sound.playTap();
                            setCoinInserted(0);
                          }}
                          className="h-7 rounded-lg bg-[#F8FAFC] hover:bg-red-50 border border-[#E2E8F0] text-[#64748B] hover:text-[#DC2626] flex items-center justify-center cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={isVerifying || isAdminMonitor || coinInserted < requiredCoinFee}
                        onClick={() => void handleConfirmCoinUnlock()}
                        className="w-full h-8.5 rounded-xl bg-[#5BC496] disabled:bg-[#E2E8F0] disabled:text-[#64748B] text-[#1E293B] text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#48AD80] transition-colors"
                      >
                        {isVerifying ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isVerifying
                            ? 'Unlocking...'
                            : coinInserted < requiredCoinFee
                            ? `Insert ₱${(requiredCoinFee - coinInserted).toFixed(0)} more`
                            : `Unlock & Access ${formatCompartmentLabel(
                                coinAuthTarget.token.slotNumber
                              )}`}
                        </span>
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col justify-between space-y-2.5">
                      <div className="p-3 rounded-xl bg-[#1E293B] border border-[#334155] text-white text-center space-y-1.5">
                        <Coins className="w-5 h-5 text-[#5BC496] mx-auto" />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5BC496] block">
                          Scan Booking QR First
                        </span>
                        <p className="text-[11px] text-slate-200 leading-snug">
                          Please avail a locker with Kiosk Coin Slot, scan your QR pass or enter your 6-digit PIN, then insert the required coin(s) to access your locker.
                        </p>
                      </div>

                      {pendingUnlockToken &&
                        pendingUnlockToken.paymentMethod === 'cash' &&
                        pendingSecondsLeft > 0 && (
                          <div className="p-2 rounded-xl bg-[#EBF9F3] border border-[#5BC496]/50 text-[10px] text-[#1E293B] flex items-center justify-between gap-2">
                            <span className="font-semibold">
                              Pending: {formatCompartmentLabel(pendingUnlockToken.slotNumber)}
                            </span>
                            <span className="font-mono font-bold text-[#059669]">
                              ₱{pendingUnlockToken.totalFee.toFixed(2)} due
                            </span>
                          </div>
                        )}

                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playTap();
                            setScanFeedback(null);
                            setScreenMode('scan_qr');
                            void startCamera(facingMode);
                          }}
                          className="w-full h-8.5 rounded-xl bg-[#4E6E81] hover:bg-[#3D5767] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#5BC496]" />
                          <span>Scan Booking QR Now</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            sound.playTap();
                            setScanFeedback(null);
                            setScreenMode('enter_pin');
                          }}
                          className="w-full h-8 rounded-xl bg-[#EDF2F5] hover:bg-[#E2E8F0] text-[#4E6E81] text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Enter 6-Digit PIN</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-2 pt-1.5 border-t border-[#E2E8F0] text-[9px] text-[#64748B] font-mono flex items-center justify-between gap-2">
                <span className="whitespace-nowrap">230V AC Supply</span>
                <span className="whitespace-nowrap">
                  {currentStation.availableSlots}/{TOTAL_COMPARTMENT_COUNT} Free
                </span>
              </div>
            </div>

            {/* Physical Hardware Modules below screen: SCAN QR CODE + INSERT COIN */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={
                  isAdminMonitor ||
                  (screenMode === 'insert_coin' &&
                    Boolean(coinAuthTarget) &&
                    coinInserted + 5 > requiredCoinFee)
                }
                title={
                  isAdminMonitor
                    ? 'Student-only kiosk scanner (Admin Monitor Mode)'
                    : 'Open kiosk QR scanner'
                }
                onClick={() => {
                  if (isAdminMonitor) return;
                  sound.playTap();
                  setScreenMode('scan_qr');
                  void startCamera(facingMode);
                }}
                className={`p-2.5 rounded-2xl border text-center transition-colors shadow-sm ${
                  isAdminMonitor
                    ? 'bg-[#27333C]/65 border-[#1E293B]/60 opacity-60 cursor-not-allowed'
                    : screenMode === 'scan_qr'
                    ? 'bg-[#1E293B] border-[#5BC496] ring-1 ring-[#5BC496]/60 cursor-pointer'
                    : 'bg-[#27333C] hover:bg-[#1E293B] border-[#1E293B] cursor-pointer'
                }`}
              >
                <span className="text-[9px] font-bold text-slate-200 uppercase tracking-wider block mb-1.5">
                  {screenMode === 'scan_qr'
                    ? 'SCANNING QR...'
                    : 'SCAN QR CODE'}
                </span>
                <div
                  className={`mx-auto rounded-lg bg-[#111827] border flex items-center justify-center ${
                    screenMode === 'scan_qr'
                      ? 'w-12 h-6 border-[#5BC496]/80'
                      : 'w-12 h-6 border-slate-600'
                  }`}
                >
                  <span
                    className={`w-8 h-2 rounded-xs transition-colors ${
                      screenMode === 'scan_qr'
                        ? 'bg-[#5BC496] shadow-[0_0_8px_#5BC496] animate-pulse'
                        : 'bg-rose-400/90 shadow-[0_0_6px_#fb7185]'
                    }`}
                  />
                </div>
              </button>

              <button
                type="button"
                disabled={isAdminMonitor}
                title={
                  isAdminMonitor
                    ? 'Student-only coin acceptor (Admin Monitor Mode)'
                    : screenMode === 'insert_coin' && coinAuthTarget
                    ? 'Click to insert +₱5 coin'
                    : 'Click to open Coin Slot LED'
                }
                onClick={() => {
                  if (isAdminMonitor) return;
                  if (screenMode === 'insert_coin' && coinAuthTarget) {
                    handleInsertCoin(5);
                  } else {
                    openCoinMode();
                  }
                }}
                className={`p-2.5 rounded-2xl border text-center transition-colors shadow-sm ${
                  isAdminMonitor
                    ? 'bg-[#27333C]/65 border-[#1E293B]/60 opacity-60 cursor-not-allowed'
                  : screenMode === 'insert_coin' &&
                    coinAuthTarget &&
                    coinInserted + 5 > requiredCoinFee
                  ? 'bg-[#27333C]/65 border-[#1E293B]/60 opacity-60 cursor-not-allowed'
                    : screenMode === 'insert_coin' && coinAuthTarget
                    ? 'bg-[#1E293B] border-[#5BC496] ring-1 ring-[#5BC496]/60 cursor-pointer'
                    : 'bg-[#27333C] hover:bg-[#1E293B] border-[#1E293B] cursor-pointer'
                }`}
              >
                <span className="text-[9px] font-bold text-slate-200 uppercase tracking-wider block mb-1.5">
                  {screenMode === 'insert_coin' && coinAuthTarget ? 'DROP +₱5 COIN' : 'INSERT COIN'}
                </span>
                <div className="mx-auto w-10 h-6 rounded-md bg-[#111827] border border-slate-600 flex items-center justify-center">
                  <span
                    className={`w-1 h-4 rounded-full ${
                      screenMode === 'insert_coin' && coinAuthTarget
                        ? 'bg-[#5BC496]'
                        : 'bg-slate-200'
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Hardware Plinth */}
        <div className="mt-3.5 pt-2.5 border-t border-[#3D5767] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#EDF2F5] font-mono">
          <span>Solenoid Latch: 12V 1.2A · 15 Charging / 5 Storage</span>
          <span className="text-[#5BC496] font-semibold">UniCharge Station · USTP</span>
        </div>
      </div>

      {/* Physical Door Push Simulator when a solenoid unlatches (with 30s Safety Reminder) */}
      {isKioskDoorOpen && activeKioskSlotReleased && (
        <div
          className={`mt-4 p-4 rounded-2xl bg-[#FFFFFF] border-2 shadow-md max-w-2xl mx-auto w-full text-center transition-colors ${
            doorAjarSeconds >= 30 ? 'border-[#F59E0B] bg-amber-50/40' : 'border-[#5BC496]'
          }`}
        >
          <div className="flex items-center justify-center gap-2 text-[#1E293B] font-bold text-xs mb-1">
            {doorAjarSeconds >= 30 ? (
              <AlertTriangle className="w-4 h-4 text-[#F59E0B] animate-pulse" />
            ) : (
              <Unlock className="w-4 h-4 text-[#5BC496]" />
            )}
            <span>
              {formatCompartmentLabel(activeKioskSlotReleased)} Door is Currently Ajar
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
                doorAjarSeconds >= 30
                  ? 'bg-amber-100 text-[#B45309]'
                  : 'bg-[#EBF9F3] text-[#059669]'
              }`}
            >
              Open {formatCountdown(doorAjarSeconds)}
            </span>
          </div>
          <p
            className={`text-xs mb-3 ${
              doorAjarSeconds >= 30 ? 'text-[#B45309] font-medium' : 'text-[#64748B]'
            }`}
          >
            {doorAjarSeconds >= 30
              ? 'Safety Reminder (30s+): Please push the compartment door closed to re-engage the solenoid latch and secure your belongings.'
              : 'Place or retrieve your belongings and physically push the door shut to re-engage the solenoid latch.'}
          </p>
          <button
            onClick={() => {
              closeKioskDoor(activeKioskSlotReleased);
              setPinInput('');
              setCoinInserted(0);
              setCoinAuthTarget(null);
              setScreenMode('idle');
            }}
            className="w-full h-10 rounded-xl bg-[#5BC496] text-[#1E293B] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#48AD80] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
          >
            <Lock className="w-4 h-4" />
            <span>Push Door Closed (Lock Solenoid Latch)</span>
          </button>
        </div>
      )}
    </div>
  );

  function renderCompartment(slotNumber: number) {
    const slot = currentStation.slots.find((s) => s.slotNumber === slotNumber);
    if (!slot) return null;

    const code = formatCompartmentCode(slotNumber);
    const isOpen =
      slot.isDoorOpen ||
      (isKioskDoorOpen && activeKioskSlotReleased === slotNumber);
    const isBusy = slot.status === 'in_use';
    const isAvailable = slot.status === 'available';

    return (
      <div
        key={slotNumber}
        title={formatCompartmentLabel(slotNumber)}
        className={`h-full w-full min-w-0 overflow-hidden rounded-xl p-2 border-2 transition-all relative flex flex-col justify-between select-none ${
          isBusy && isOpen
            ? 'bg-amber-50 border-[#F59E0B] shadow-md'
            : isOpen
            ? 'bg-[#EBF9F3] border-[#5BC496] shadow-md'
            : isBusy
            ? 'bg-[#CBD5E1]/95 border-[#EF4444]/80'
            : isAvailable
            ? 'bg-[#E2E8F0] border-[#94A3B8]/70'
            : 'bg-red-50 border-[#DC2626]/70 opacity-85'
        }`}
      >
        <div className="flex items-center justify-between gap-1 min-w-0">
          <span className="font-bold text-xs text-[#1E293B] font-mono leading-none truncate">
            {code}
          </span>
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isBusy && isOpen
                ? 'bg-[#EF4444] ring-2 ring-[#F59E0B]/60 animate-ping'
                : isOpen
                ? 'bg-[#5BC496] ring-2 ring-[#5BC496]/50 animate-ping'
                : isBusy
                ? 'bg-[#EF4444]'
                : isAvailable
                ? 'bg-[#22C55E]'
                : 'bg-[#DC2626]'
            }`}
          />
        </div>

        <div className="flex items-center justify-between gap-1 mt-1 min-w-0">
          {slot.category === 'charging' ? (
            <Zap className="w-3 h-3 text-[#4E6E81] shrink-0" />
          ) : (
            <Package className="w-3 h-3 text-[#4E6E81] shrink-0" />
          )}
          <span
            className={`text-[9px] font-mono font-bold whitespace-nowrap truncate ${
              isBusy && isOpen
                ? 'text-[#B45309]'
                : isOpen
                ? 'text-[#059669]'
                : isBusy
                ? 'text-[#DC2626]'
                : isAvailable
                ? 'text-[#15803D]'
                : 'text-[#DC2626]'
            }`}
          >
            {isBusy && isOpen
              ? 'OPEN'
              : isOpen
              ? 'OPEN'
              : isBusy
              ? 'BUSY'
              : isAvailable
              ? 'FREE'
              : 'MAINT'}
          </span>
        </div>
      </div>
    );
  }
};
