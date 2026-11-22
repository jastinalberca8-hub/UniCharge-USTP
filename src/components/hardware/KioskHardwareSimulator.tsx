import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { useUniCharge } from '../../context/UniChargeContext';
import { sound } from '../../utils/audio';
import { QrMatrixSvg } from './QrMatrixSvg';
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
  Upload,
  Loader2,
} from 'lucide-react';

type KioskScreenMode = 'idle' | 'scan_qr' | 'enter_pin';

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export const KioskHardwareSimulator: React.FC = () => {
  const {
    stations,
    hardwareKioskStationId,
    setHardwareKioskStationId,
    isKioskDoorOpen,
    activeKioskSlotReleased,
    closeKioskDoor,
    pendingUnlockToken,
    pendingSecondsLeft,
    verifyKioskUnlock,
    regenerateUnlockToken,
    activeSession,
    triggerUnexpectedDoorOpen,
  } = useUniCharge();

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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scanLockRef = useRef<boolean>(false);

  const currentStation =
    stations.find((s) => s.id === hardwareKioskStationId) || stations[0];

  const stationQrCode = `UNICHARGE-KIOSK|${currentStation.campusCode}`;

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
        setScanFeedback({
          type: result.success ? 'success' : 'error',
          text: result.message,
        });
        if (result.success) {
          stopCamera();
          setPinInput('');
          setScreenMode('idle');
        }
      } finally {
        setIsVerifying(false);
        scanLockRef.current = false;
      }
    },
    [currentStation.id, isVerifying, stopCamera, verifyKioskUnlock]
  );

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
          'Camera access is unavailable in this browser context. Upload your QR email PNG or use the PIN pad below.'
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
            'Camera permission was blocked. Allow webcam access or upload the QR image from your email.'
          );
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError(
            'No camera detected on this device. Upload the QR image from your email or use the 6-digit PIN.'
          );
        } else {
          setCameraError(
            'Could not start webcam stream. Upload the QR image from your email or enter the 6-digit PIN.'
          );
        }
      }
    },
    [facingMode, stopCamera]
  );

  // Stop camera automatically when leaving scan_qr mode or unmounting
  useEffect(() => {
    if (screenMode !== 'scan_qr') {
      stopCamera();
      setCameraError(null);
    }
    return () => {
      stopCamera();
    };
  }, [screenMode, stopCamera]);

  // Frame decoding loop while camera is active
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

  const handleUploadQrImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    sound.playTap();
    setScanFeedback(null);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        setScanFeedback({
          type: 'error',
          text: 'Unable to read the uploaded image file.',
        });
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          setScanFeedback({
            type: 'error',
            text: 'Unable to initialize QR image decoder.',
          });
          return;
        }
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (!decoded?.data) {
          setScanFeedback({
            type: 'error',
            text: 'No valid QR code found in that image. Try uploading the PNG attached to your UniCharge email.',
          });
          return;
        }
        void handleVerifyPayload(decoded.data);
      };
      img.onerror = () => {
        setScanFeedback({
          type: 'error',
          text: 'Unsupported or corrupted image file.',
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleKeyPress = (digit: string) => {
    sound.playTap();
    if (pinInput.length < 6) {
      setPinInput((prev) => prev + digit);
    }
  };

  const tokenMatchesThisKiosk =
    Boolean(pendingUnlockToken) &&
    pendingUnlockToken?.stationId === currentStation.id;

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-[#1E293B] p-4 sm:p-5 overflow-y-auto">
      {/* Hidden canvas + file input for camera and PNG QR decoding */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadQrImage}
        className="hidden"
      />

      {/* Kiosk Station Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-[#5BC496] animate-pulse" />
            <span className="text-[11px] font-bold text-[#4E6E81] uppercase tracking-wider">
              8-Door IoT Hardware Kiosk
            </span>
          </div>
          <h2 className="text-base font-bold text-[#1E293B] tracking-tight">
            {currentStation.name}
          </h2>
          <span className="text-xs text-[#64748B] font-mono">
            {currentStation.campusCode} · ESP32-S3 + 12V Solenoid Array
          </span>
        </div>

        <select
          value={hardwareKioskStationId}
          onChange={(e) => {
            sound.playTap();
            setScanFeedback(null);
            setHardwareKioskStationId(e.target.value);
          }}
          aria-label="Select physical kiosk station"
          className="bg-[#FFFFFF] text-xs font-semibold text-[#1E293B] px-3 py-2 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4E6E81] cursor-pointer shadow-xs"
        >
          {stations.map((st) => (
            <option key={st.id} value={st.id}>
              {st.campusCode} · {st.building.split(' ')[0]} ({st.availableSlots}/8 Free)
            </option>
          ))}
        </select>
      </div>

      {/* Kiosk Verification Toast */}
      {scanFeedback && (
        <div
          role="status"
          className={`mb-4 max-w-lg mx-auto w-full p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${
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

      {/* PHYSICAL 8-DOOR LOCKER CABINET */}
      <div className="max-w-xl mx-auto w-full bg-[#3D5767] rounded-3xl p-4 sm:p-5 border-4 border-[#4E6E81] shadow-xl relative">
        {/* Top Institutional Plaque */}
        <div className="bg-[#4E6E81] border border-[#5BC496]/40 rounded-2xl p-2.5 mb-3.5 text-center shadow-sm">
          <span className="text-xs font-extrabold text-[#FFFFFF] tracking-widest uppercase block">
            UNICHARGE USTP SMART LOCKER
          </span>
          <span className="text-[10px] text-[#EBF9F3] font-mono">
            {currentStation.campusCode} · Solenoid Secure · 65W–140W USB-C PD
          </span>
        </div>

        {/* Cabinet Grid: Left 4 Compartments | Center Touchscreen | Right 4 Compartments */}
        <div className="grid grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
          {/* Column 1: Slots 1, 3, 5, 7 */}
          <div className="col-span-3 space-y-2.5">
            {[1, 3, 5, 7].map((num) => renderCompartment(num))}
          </div>

          {/* Column 2: Interactive Center Kiosk Touchscreen */}
          <div className="col-span-6 flex flex-col justify-between rounded-2xl bg-[#FFFFFF] border-2 border-[#1E293B] p-3 text-center shadow-inner">
            {/* Touchscreen Top Bar */}
            <div className="bg-[#EDF2F5] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#4E6E81] uppercase tracking-wider">
                Kiosk UI
              </span>
              <span className="text-[10px] font-mono font-semibold text-[#5BC496] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5BC496] animate-pulse" />
                ONLINE
              </span>
            </div>

            {screenMode === 'idle' && (
              <div className="flex-1 flex flex-col items-center justify-between py-1 space-y-2.5">
                <div className="bg-[#F8FAFC] p-2 rounded-xl border border-[#E2E8F0] shadow-xs">
                  <QrMatrixSvg
                    value={stationQrCode}
                    size={96}
                    foreground="#1E293B"
                    accent="#5BC496"
                  />
                </div>
                <p className="text-[10px] text-[#64748B] leading-tight px-1">
                  Have an email QR pass or 6-digit PIN? Tap Scan QR to open the kiosk camera.
                </p>

                <div className="w-full space-y-1.5">
                  <button
                    onClick={() => {
                      sound.playTap();
                      setScanFeedback(null);
                      setScreenMode('scan_qr');
                      void startCamera(facingMode);
                    }}
                    className="w-full h-9 rounded-xl bg-[#4E6E81] hover:bg-[#3D5767] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#5BC496]" />
                    <span>Scan QR</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playTap();
                      setScanFeedback(null);
                      setScreenMode('enter_pin');
                    }}
                    className="w-full h-8 rounded-xl bg-[#EDF2F5] hover:bg-[#E2E8F0] text-[#4E6E81] text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Enter 6-Digit PIN</span>
                  </button>
                </div>
              </div>
            )}

            {screenMode === 'scan_qr' && (
              <div className="flex-1 flex flex-col justify-between py-1 space-y-2">
                <div className="flex items-center justify-between">
                  <button
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
                    Camera Scanner
                  </span>
                </div>

                {/* Live Camera + Optical Scanner Viewport */}
                <div className="relative rounded-xl bg-[#1E293B] text-white flex flex-col items-center justify-center min-h-[148px] overflow-hidden border border-[#334155]">
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
                                Point your emailed or mobile QR code at the camera.
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

                {/* Camera Controls + PNG Upload */}
                <div className="grid grid-cols-2 gap-1.5">
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
                  ) : (
                    <button
                      type="button"
                      disabled={isVerifying}
                      onClick={() => fileInputRef.current?.click()}
                      className="py-1.5 px-2 rounded-lg bg-[#EDF2F5] hover:bg-[#E2E8F0] text-[#4E6E81] text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload QR PNG</span>
                    </button>
                  )}

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

                {/* Quick Pending Token Controls (when camera is on/off) */}
                {pendingUnlockToken &&
                  (pendingSecondsLeft === 0 ? (
                    <button
                      type="button"
                      onClick={() => void regenerateUnlockToken()}
                      className="w-full py-1.5 px-2 rounded-lg bg-[#F59E0B] text-white text-[10px] font-bold cursor-pointer hover:bg-amber-600"
                    >
                      QR Expired — Regenerate
                    </button>
                  ) : tokenMatchesThisKiosk ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-[#4E6E81]">
                        <Clock className="w-3 h-3 text-[#5BC496]" />
                        <span>
                          Slot #{pendingUnlockToken.slotNumber} · {formatCountdown(pendingSecondsLeft)}
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
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setHardwareKioskStationId(pendingUnlockToken.stationId);
                      }}
                      className="w-full py-1.5 px-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[10px] font-bold cursor-pointer hover:bg-amber-100"
                    >
                      Switch Kiosk to {pendingUnlockToken.stationCode}
                    </button>
                  ))}
              </div>
            )}

            {screenMode === 'enter_pin' && (
              <div className="flex-1 flex flex-col justify-between py-1 space-y-2">
                <div className="flex items-center justify-between">
                  <button
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
              </div>
            )}

            {/* Bottom Hardware Status Strip */}
            <div className="mt-2 pt-1.5 border-t border-[#E2E8F0] text-[9px] text-[#64748B] font-mono flex items-center justify-between">
              <span>29.1°C · 230V AC</span>
              <span>{currentStation.availableSlots}/8 Free</span>
            </div>
          </div>

          {/* Column 3: Slots 2, 4, 6, 8 */}
          <div className="col-span-3 space-y-2.5">
            {[2, 4, 6, 8].map((num) => renderCompartment(num))}
          </div>
        </div>

        {/* Bottom Hardware Plinth */}
        <div className="mt-3.5 pt-2.5 border-t border-[#4E6E81] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#EDF2F5] font-mono">
          <span>Solenoid Latch: 12V 1.2A</span>
          {(activeSession || currentStation.slots.some((s) => s.status === 'in_use')) && (
            <button
              type="button"
              onClick={() => {
                const targetSlot =
                  activeSession?.stationId === currentStation.id
                    ? activeSession.slotNumber
                    : currentStation.slots.find((s) => s.status === 'in_use')?.slotNumber || 1;
                void triggerUnexpectedDoorOpen(currentStation.id, targetSlot);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#DC2626] hover:bg-red-700 text-white font-sans font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Test Unexpected Door Open</span>
            </button>
          )}
          <span className="text-[#5BC496] font-semibold">USTP CDO Innovation Hub</span>
        </div>
      </div>

      {/* Physical Door Push Simulator when a solenoid unlatches */}
      {isKioskDoorOpen && activeKioskSlotReleased && (
        <div className="mt-4 p-4 rounded-2xl bg-[#FFFFFF] border-2 border-[#5BC496] shadow-md max-w-xl mx-auto w-full text-center">
          <div className="flex items-center justify-center gap-2 text-[#1E293B] font-bold text-xs mb-1">
            <Unlock className="w-4 h-4 text-[#5BC496]" />
            <span>Compartment #{activeKioskSlotReleased} Door is Currently Ajar</span>
          </div>
          <p className="text-xs text-[#64748B] mb-3">
            Place your device inside, plug in the USB-C PD cable, and physically push the door shut to re-engage the solenoid latch.
          </p>
          <button
            onClick={() => closeKioskDoor(activeKioskSlotReleased)}
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

    const isOpen =
      slot.isDoorOpen ||
      (isKioskDoorOpen && activeKioskSlotReleased === slotNumber);
    const isCharging = slot.status === 'in_use';
    const isAvailable = slot.status === 'available';

    return (
      <div
        key={slotNumber}
        className={`rounded-xl p-2 border-2 transition-all relative ${
          isOpen
            ? 'bg-[#EBF9F3] border-[#5BC496] shadow-md'
            : isCharging
            ? 'bg-[#FFFBEB] border-[#F59E0B]'
            : isAvailable
            ? 'bg-[#FFFFFF] border-[#E2E8F0]'
            : 'bg-red-50 border-[#DC2626]/50 opacity-85'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-xs text-[#1E293B] font-mono">
            #{slotNumber}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isOpen
                ? 'bg-[#5BC496] ring-2 ring-[#5BC496]/50 animate-ping'
                : isCharging
                ? 'bg-[#F59E0B]'
                : isAvailable
                ? 'bg-[#5BC496]'
                : 'bg-[#DC2626]'
            }`}
          />
        </div>

        <div className="flex items-center justify-between my-1">
          <div
            className={`w-2 h-5 rounded-sm border ${
              isOpen
                ? 'bg-[#5BC496] border-[#48AD80]'
                : 'bg-[#4E6E81] border-[#3D5767]'
            }`}
          />
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#EDF2F5] text-[#4E6E81]">
            {slot.size}
          </span>
        </div>

        <div className="text-[9px] font-mono text-center mt-1">
          {isOpen ? (
            <span className="text-[#48AD80] font-bold block">OPEN</span>
          ) : isCharging ? (
            <span className="text-[#D97706] font-bold flex items-center justify-center gap-0.5">
              <Zap className="w-2.5 h-2.5 fill-current" />
              BUSY
            </span>
          ) : isAvailable ? (
            <span className="text-[#64748B] font-semibold block">FREE</span>
          ) : (
            <span className="text-[#DC2626] font-bold block">MAINT</span>
          )}
        </div>
      </div>
    );
  }
};
