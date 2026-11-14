import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  KioskStation,
  UserAccount,
  SessionHistoryItem,
  ActiveSession,
  ServiceType,
  LockerSize,
  LockerSlot,
  SecurityAlert,
  PendingUnlockToken,
} from '../types';
import {
  SEEDED_USERS,
  INITIAL_STUDENT,
  INITIAL_STATIONS,
  INITIAL_SAMPLE_SESSION,
  INITIAL_HISTORY,
  INITIAL_SECURITY_ALERTS,
  PRICING_RATES,
} from '../data/mockData';
import { sound } from '../utils/audio';

export type AppRoute =
  | '/login'
  | '/signup'
  | '/student/dashboard'
  | '/mobile-expo'
  | '/admin/dashboard';

interface AuthResult {
  success: boolean;
  error?: string;
  user?: UserAccount;
}

interface UniChargeContextType {
  isAuthenticated: boolean;
  currentUser: UserAccount | null;
  student: UserAccount;
  users: UserAccount[];
  currentRoute: AppRoute;
  accessDeniedMessage: string | null;
  clearAccessDenied: () => void;
  authSuccessMessage: string | null;
  clearAuthSuccess: () => void;
  navigate: (route: AppRoute) => void;
  stations: KioskStation[];
  selectedStation: KioskStation;
  selectedSlot: LockerSlot | null;
  selectedService: ServiceType;
  selectedSize: LockerSize;
  selectedDuration: number;
  activeSession: ActiveSession | null;
  pendingUnlockToken: PendingUnlockToken | null;
  pendingSecondsLeft: number;
  sessionHistory: SessionHistoryItem[];
  securityAlerts: SecurityAlert[];
  hardwareKioskStationId: string;
  isKioskDoorOpen: boolean;
  activeKioskSlotReleased: number | null;
  // Auth Methods
  loginWithAccount: (identifier: string, password: string) => AuthResult;
  loginWithGoogle: () => Promise<AuthResult>;
  loginDemoByEmail: (email: string) => AuthResult;
  registerStudentAccount: (params: {
    name: string;
    studentIdNumber: string;
    email: string;
    password: string;
    college?: string;
  }) => AuthResult;
  loginDemo: () => void;
  loginWithCredentials: (studentId: string, email: string) => boolean;
  logout: () => void;
  // Student / Hardware Methods
  setSelectedStation: (station: KioskStation) => void;
  setSelectedSlot: (slot: LockerSlot | null) => void;
  setSelectedService: (service: ServiceType) => void;
  setSelectedSize: (size: LockerSize) => void;
  setSelectedDuration: (duration: number) => void;
  calculateFee: (size: LockerSize, durationMinutes: number, service: ServiceType) => number;
  generateUnlockToken: (
    paymentMethod: 'wallet' | 'gcash' | 'maya' | 'cash'
  ) => { success: boolean; message: string; token?: PendingUnlockToken };
  regenerateUnlockToken: () => void;
  cancelPendingUnlock: () => void;
  verifyKioskUnlock: (
    pinOrQrPayload: string,
    kioskStationId?: string
  ) => { success: boolean; message: string };
  unlockStationViaQr: (
    qrCode: string,
    paymentMethod: 'wallet' | 'gcash' | 'maya' | 'cash'
  ) => { success: boolean; message: string };
  endActiveSession: () => { success: boolean; message: string };
  topUpWallet: (amount: number) => void;
  toggleBiometrics: () => void;
  togglePushNotifications: () => void;
  toggleOverchargeProtection: () => void;
  updateUserProfile: (updates: {
    name?: string;
    college?: string;
    degree?: string;
    avatar?: string;
  }) => void;
  closeKioskDoor: (slotNumber: number) => void;
  triggerSimulatedTamper: () => void;
  setHardwareKioskStationId: (stationId: string) => void;
  // Admin Methods
  adminRemoteUnlockSlot: (stationId: string, slotNumber: number) => void;
  adminToggleSlotMaintenance: (stationId: string, slotNumber: number) => void;
  adminProvisionStaff: (params: {
    name: string;
    email: string;
    staffId: string;
    password: string;
  }) => AuthResult;
  resolveSecurityAlert: (alertId: string) => void;
}

const UniChargeContext = createContext<UniChargeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  users: 'unicharge_users_v2',
  currentUserId: 'unicharge_current_user_id_v2',
  sessions: 'unicharge_sessions_by_user_v2',
  history: 'unicharge_history_by_user_v2',
};

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

function normalizePath(rawPath: string): AppRoute {
  const cleaned = rawPath.replace(/^#/, '');
  if (cleaned === '/signup') return '/signup';
  if (cleaned === '/student/dashboard') return '/student/dashboard';
  if (cleaned === '/mobile-expo') return '/mobile-expo';
  if (cleaned === '/admin/dashboard') return '/admin/dashboard';
  return '/login';
}

function getCurrentBrowserRoute(): AppRoute {
  if (typeof window === 'undefined') return '/login';
  if (window.location.hash && window.location.hash.length > 1) {
    return normalizePath(window.location.hash);
  }
  return normalizePath(window.location.pathname);
}

function syncBrowserUrl(route: AppRoute, replace = false): void {
  if (typeof window === 'undefined') return;
  const targetUrl = `/#${route}`;
  const currentFull = `${window.location.pathname}${window.location.hash}`;
  if (currentFull === targetUrl) return;
  if (replace) {
    window.history.replaceState({}, '', targetUrl);
  } else {
    window.history.pushState({}, '', targetUrl);
  }
}

export const UniChargeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserAccount[]>(() =>
    readStorage<UserAccount[]>(STORAGE_KEYS.users, SEEDED_USERS)
  );
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const savedId = readStorage<string | null>(STORAGE_KEYS.currentUserId, null);
    if (!savedId) return null;
    const savedUsers = readStorage<UserAccount[]>(STORAGE_KEYS.users, SEEDED_USERS);
    return savedUsers.find((u) => u.id === savedId) ?? null;
  });
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => getCurrentBrowserRoute());
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);

  const [stations, setStations] = useState<KioskStation[]>(INITIAL_STATIONS);
  const [selectedStation, setSelectedStation] = useState<KioskStation>(INITIAL_STATIONS[0]);
  const [selectedSlot, setSelectedSlot] = useState<LockerSlot | null>(INITIAL_STATIONS[0].slots[0]);
  const [selectedService, setSelectedService] = useState<ServiceType>('both');
  const [selectedSize, setSelectedSize] = useState<LockerSize>('S');
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [sessionsByUserId, setSessionsByUserId] = useState<
    Record<string, ActiveSession | null>
  >(() =>
    readStorage<Record<string, ActiveSession | null>>(STORAGE_KEYS.sessions, {
      usr_ustp_202330192: INITIAL_SAMPLE_SESSION,
    })
  );
  const [historyByUserId, setHistoryByUserId] = useState<
    Record<string, SessionHistoryItem[]>
  >(() =>
    readStorage<Record<string, SessionHistoryItem[]>>(STORAGE_KEYS.history, {
      usr_ustp_202330192: INITIAL_HISTORY,
    })
  );
  const [pendingUnlockToken, setPendingUnlockToken] = useState<PendingUnlockToken | null>(null);
  const [pendingSecondsLeft, setPendingSecondsLeft] = useState<number>(0);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>(INITIAL_SECURITY_ALERTS);

  // Physical Kiosk Hardware Simulation state
  const [hardwareKioskStationId, setHardwareKioskStationId] = useState<string>('station-citc-01');
  const [isKioskDoorOpen, setIsKioskDoorOpen] = useState<boolean>(false);
  const [activeKioskSlotReleased, setActiveKioskSlotReleased] = useState<number | null>(null);

  // Firebase ID token held strictly in memory (never localStorage)
  const idTokenRef = useRef<string | null>(null);
  const isFirebaseSessionRef = useRef<boolean>(false);

  const authorizedFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    const fbUser = auth.currentUser;
    if (!fbUser && !idTokenRef.current) return null;
    const token = fbUser ? await fbUser.getIdToken() : idTokenRef.current;
    if (!token) return null;
    idTokenRef.current = token;
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Request failed (${res.status})`);
    }
    return res.json();
  }, []);

  const hydrateFromBackend = useCallback(async (token: string): Promise<UserAccount> => {
    idTokenRef.current = token;
    isFirebaseSessionRef.current = true;
    const res = await fetch('/api/bootstrap', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || 'Failed to load account from server');
    }
    const data = await res.json();
    const loadedUser = data.user as UserAccount;
    setCurrentUser(loadedUser);
    if (Array.isArray(data.users) && data.users.length > 0) {
      setUsers((prev) => {
        const merged = [...prev];
        for (const u of data.users as UserAccount[]) {
          const idx = merged.findIndex((m) => m.id === u.id || m.email === u.email);
          if (idx >= 0) merged[idx] = { ...merged[idx], ...u };
          else merged.push(u);
        }
        return merged;
      });
    }
    if (Array.isArray(data.stations) && data.stations.length > 0) {
      setStations(data.stations);
      setSelectedStation((prev) => data.stations.find((s: KioskStation) => s.id === prev.id) || data.stations[0]);
    }
    if (Array.isArray(data.securityAlerts)) {
      setSecurityAlerts(data.securityAlerts);
    }
    setSessionsByUserId((prev) => ({
      ...prev,
      [loadedUser.id]: data.activeSession ?? null,
    }));
    setHistoryByUserId((prev) => ({
      ...prev,
      [loadedUser.id]: Array.isArray(data.sessionHistory) ? data.sessionHistory : [],
    }));
    return loadedUser;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          await hydrateFromBackend(token);
        } catch (err) {
          console.error('Failed to restore authenticated session:', err);
        }
      } else {
        idTokenRef.current = null;
        isFirebaseSessionRef.current = false;
      }
    });
    return () => unsubscribe();
  }, [hydrateFromBackend]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.users, users);
  }, [users]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.currentUserId, currentUser ? currentUser.id : null);
  }, [currentUser]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.sessions, sessionsByUserId);
  }, [sessionsByUserId]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.history, historyByUserId);
  }, [historyByUserId]);

  const isAuthenticated = Boolean(currentUser);
  const student = currentUser ?? INITIAL_STUDENT;
  const activeSession = currentUser ? (sessionsByUserId[currentUser.id] ?? null) : null;
  const sessionHistory = currentUser ? (historyByUserId[currentUser.id] ?? []) : [];

  const clearAuthSuccess = useCallback(() => setAuthSuccessMessage(null), []);

  const setActiveSessionForCurrentUser = (
    updater: ActiveSession | null | ((prev: ActiveSession | null) => ActiveSession | null)
  ) => {
    if (!currentUser) return;
    const uid = currentUser.id;
    setSessionsByUserId((prevMap) => {
      const current = prevMap[uid] ?? null;
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prevMap, [uid]: next };
    });
  };

  const clearAccessDenied = useCallback(() => setAccessDeniedMessage(null), []);

  // Strict RBAC Route Enforcement Helper
  const enforceRouteGuard = useCallback(
    (targetRoute: AppRoute, user: UserAccount | null): AppRoute => {
      if (!user) {
        if (targetRoute === '/signup') return '/signup';
        return '/login';
      }

      if (user.role === 'student') {
        if (targetRoute === '/admin/dashboard') {
          setAccessDeniedMessage('Access Denied: Admin privileges required');
          return '/student/dashboard';
        }
        if (targetRoute === '/mobile-expo') return '/mobile-expo';
        if (targetRoute === '/login' || targetRoute === '/signup') {
          return '/student/dashboard';
        }
        return '/student/dashboard';
      }

      if (user.role === 'admin') {
        if (targetRoute !== '/admin/dashboard') {
          return '/admin/dashboard';
        }
        return '/admin/dashboard';
      }

      return '/login';
    },
    []
  );

  const navigate = useCallback(
    (route: AppRoute) => {
      const guarded = enforceRouteGuard(route, currentUser);
      setCurrentRoute(guarded);
      syncBrowserUrl(guarded, false);
    },
    [currentUser, enforceRouteGuard]
  );

  useEffect(() => {
    const guarded = enforceRouteGuard(currentRoute, currentUser);
    if (guarded !== currentRoute) {
      setCurrentRoute(guarded);
    }
    syncBrowserUrl(guarded, true);
  }, [currentRoute, currentUser, enforceRouteGuard]);

  useEffect(() => {
    const handleLocationChange = () => {
      const requested = getCurrentBrowserRoute();
      const guarded = enforceRouteGuard(requested, currentUser);
      setCurrentRoute(guarded);
      syncBrowserUrl(guarded, true);
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [currentUser, enforceRouteGuard]);

  // 60-second Countdown Timer for Pending QR Unlock Token
  useEffect(() => {
    if (!pendingUnlockToken) {
      setPendingSecondsLeft(0);
      return;
    }

    const updateLeft = () => {
      const diff = Math.max(0, Math.ceil((pendingUnlockToken.expiresAt - Date.now()) / 1000));
      setPendingSecondsLeft(diff);
    };

    updateLeft();
    const timer = setInterval(updateLeft, 500);
    return () => clearInterval(timer);
  }, [pendingUnlockToken]);

  // Active Session Timer & Dynamic Telemetry
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active' || !currentUser) return;
    const uid = currentUser.id;

    const interval = setInterval(() => {
      setSessionsByUserId((prevMap) => {
        const prev = prevMap[uid];
        if (!prev || prev.status !== 'active') return prevMap;
        const newRemaining = Math.max(0, prev.remainingSeconds - 1);
        const elapsedSeconds = prev.durationMinutes * 60 - newRemaining;
        const simulatedCurrentBattery = Math.min(
          100,
          Math.floor(prev.batteryInitial + elapsedSeconds / 30)
        );
        const tempVariance = Math.sin(Date.now() / 15000) * 1.2;
        const currentTemp = +(29.5 + tempVariance).toFixed(1);
        const wattage =
          simulatedCurrentBattery > 85
            ? 18.5
            : 42.0 + Math.floor(Math.sin(Date.now() / 4000) * 4);

        const nextSession: ActiveSession =
          newRemaining === 0
            ? {
                ...prev,
                remainingSeconds: 0,
                batteryCurrent: 100,
                status: 'completed',
              }
            : {
                ...prev,
                remainingSeconds: newRemaining,
                batteryCurrent: simulatedCurrentBattery,
                lockerTemperature: currentTemp,
                chargingRateWatts: wattage,
              };

        return { ...prevMap, [uid]: nextSession };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession?.status, currentUser?.id]);

  const calculateFee = (
    size: LockerSize,
    durationMinutes: number,
    service: ServiceType
  ): number => {
    const hourlyRate = PRICING_RATES[size]?.hourly || 15;
    const hours = durationMinutes / 60;
    const baseFee = hourlyRate * hours;
    const addOn = service === 'both' ? 5 : 0;
    return Math.round(baseFee + addOn);
  };

  // Account-level RBAC login resolution
  const loginWithAccount = (identifier: string, password: string): AuthResult => {
    sound.playTap();
    const trimmed = identifier.trim().toLowerCase();
    const matched = users.find(
      (u) =>
        (u.email.toLowerCase() === trimmed || u.studentIdNumber.toLowerCase() === trimmed) &&
        u.password === password
    );

    if (!matched) {
      return { success: false, error: 'Invalid email/ID or password' };
    }

    setAccessDeniedMessage(null);
    setAuthSuccessMessage(null);
    setCurrentUser(matched);
    const destination: AppRoute =
      matched.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
    setCurrentRoute(destination);
    syncBrowserUrl(destination, false);
    return { success: true, user: matched };
  };

  const loginWithGoogle = async (): Promise<AuthResult> => {
    sound.playTap();
    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      const token = await credential.user.getIdToken();
      const loadedUser = await hydrateFromBackend(token);
      setAccessDeniedMessage(null);
      setAuthSuccessMessage(null);
      const destination: AppRoute =
        loadedUser.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
      setCurrentRoute(destination);
      syncBrowserUrl(destination, false);
      return { success: true, user: loadedUser };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Google Sign-In failed. Please try again.';
      return { success: false, error: message };
    }
  };

  const loginDemoByEmail = (email: string): AuthResult => {
    const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!matched) {
      return { success: false, error: 'Invalid email/ID or password' };
    }
    return loginWithAccount(matched.email, matched.password);
  };

  const registerStudentAccount = ({
    name,
    studentIdNumber,
    email,
    password,
    college,
  }: {
    name: string;
    studentIdNumber: string;
    email: string;
    password: string;
    college?: string;
  }): AuthResult => {
    sound.playTap();
    const cleanEmail = email.trim().toLowerCase();
    const cleanId = studentIdNumber.trim();

    if (!name.trim() || !cleanId || !cleanEmail || !password) {
      return { success: false, error: 'Please complete all required fields.' };
    }

    const exists = users.some(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        u.studentIdNumber.toLowerCase() === cleanId.toLowerCase()
    );
    if (exists) {
      return {
        success: false,
        error: 'An account with this email or USTP ID already exists.',
      };
    }

    const newStudent: UserAccount = {
      id: `usr_ustp_${Date.now()}`,
      name: name.trim(),
      studentIdNumber: cleanId,
      email: cleanEmail,
      password,
      role: 'student',
      college: college || 'College of Information Technology and Computing (CITC)',
      degree: 'BS Information Technology',
      avatar: '',
      walletBalance: 0,
      biometricEnabled: false,
      pushNotifications: true,
      overchargeAlerts: true,
      preferredPayment: 'wallet',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setUsers((prev) => [...prev, newStudent]);
    setSessionsByUserId((prev) => ({ ...prev, [newStudent.id]: null }));
    setHistoryByUserId((prev) => ({ ...prev, [newStudent.id]: [] }));
    setAccessDeniedMessage(null);
    setCurrentUser(null);
    setAuthSuccessMessage(
      `Account created for ${newStudent.name} (${newStudent.studentIdNumber}). Please sign in with your credentials.`
    );
    setCurrentRoute('/login');
    syncBrowserUrl('/login', false);
    return { success: true, user: newStudent };
  };

  const loginDemo = () => {
    loginDemoByEmail('jastinalberca8@gmail.com');
  };

  const loginWithCredentials = (studentId: string, email: string): boolean => {
    const matched = users.find(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() ||
        u.studentIdNumber.toLowerCase() === studentId.trim().toLowerCase()
    );
    if (matched) {
      loginWithAccount(matched.email, matched.password);
      return true;
    }
    return false;
  };

  const logout = () => {
    sound.playTap();
    setAccessDeniedMessage(null);
    setAuthSuccessMessage(null);
    setPendingUnlockToken(null);
    idTokenRef.current = null;
    isFirebaseSessionRef.current = false;
    signOut(auth).catch(() => {});
    setCurrentUser(null);
    setCurrentRoute('/login');
    syncBrowserUrl('/login', false);
  };

  const updateCurrentUserState = (updater: (user: UserAccount) => UserAccount) => {
    if (!currentUser) return;
    const updated = updater(currentUser);
    setCurrentUser(updated);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  // STEP 1 of Secure IoT Unlock: Generate time-sensitive 60s QR / 6-digit PIN (DOES NOT pop latch remotely!)
  const generateUnlockToken = (
    paymentMethod: 'wallet' | 'gcash' | 'maya' | 'cash'
  ): { success: boolean; message: string; token?: PendingUnlockToken } => {
    sound.playTap();

    const slotToBook =
      selectedSlot ||
      selectedStation.slots.find((s) => s.status === 'available') ||
      selectedStation.slots[0];

    if (!slotToBook || slotToBook.status !== 'available') {
      return {
        success: false,
        message: 'Selected compartment is no longer available. Please choose a free compartment.',
      };
    }

    const fee = calculateFee(selectedSize, selectedDuration, selectedService);

    if (paymentMethod === 'wallet' && student.walletBalance < fee) {
      return {
        success: false,
        message: `Insufficient campus e-wallet balance (₱${student.walletBalance.toFixed(
          2
        )}). Please reload ₱ or choose GCash/Maya/Coin Slot.`,
      };
    }

    const now = Date.now();
    const randomPin = String(Math.floor(100000 + Math.random() * 900000));
    const tokenId = `TOK-${Math.floor(10000 + Math.random() * 90000)}`;
    const token: PendingUnlockToken = {
      tokenId,
      stationId: selectedStation.id,
      stationName: selectedStation.name,
      stationCode: selectedStation.campusCode,
      slotNumber: slotToBook.slotNumber,
      serviceType: selectedService,
      compartmentSize: selectedSize,
      durationMinutes: selectedDuration,
      totalFee: fee,
      paymentMethod,
      qrPayload: `UNICHARGE|${selectedStation.campusCode}|SLOT-${slotToBook.slotNumber}|PIN-${randomPin}|${tokenId}`,
      pinCode: randomPin,
      createdAt: now,
      expiresAt: now + 60 * 1000,
    };

    setPendingUnlockToken(token);
    setHardwareKioskStationId(selectedStation.id);

    return {
      success: true,
      message: `QR Unlock Token generated for ${selectedStation.name} Slot #${slotToBook.slotNumber}. Scan at the physical kiosk within 60 seconds.`,
      token,
    };
  };

  const regenerateUnlockToken = () => {
    if (!pendingUnlockToken) return;
    generateUnlockToken(pendingUnlockToken.paymentMethod);
  };

  const cancelPendingUnlock = () => {
    sound.playTap();
    setPendingUnlockToken(null);
  };

  // STEP 2 of Secure IoT Unlock: Triggered ONLY when physical kiosk scanner/PIN pad verifies the token!
  const verifyKioskUnlock = (
    pinOrQrPayload: string,
    kioskStationId?: string
  ): { success: boolean; message: string } => {
    sound.playBeep();

    if (!pendingUnlockToken) {
      return {
        success: false,
        message: 'No pending QR unlock authorization found. Generate an unlock QR from Reserve a Locker first.',
      };
    }

    if (Date.now() > pendingUnlockToken.expiresAt) {
      return {
        success: false,
        message: 'QR verification token expired (60s limit). Please regenerate a fresh Unlock QR.',
      };
    }

    const targetKioskId = kioskStationId || hardwareKioskStationId;
    if (targetKioskId !== pendingUnlockToken.stationId) {
      return {
        success: false,
        message: `Wrong kiosk! This QR authorizes ${pendingUnlockToken.stationName} (${pendingUnlockToken.stationCode}). Switch the kiosk simulator to ${pendingUnlockToken.stationCode} to scan.`,
      };
    }

    const cleaned = pinOrQrPayload.trim();
    const matchesToken =
      cleaned === pendingUnlockToken.pinCode ||
      cleaned === pendingUnlockToken.qrPayload ||
      cleaned === pendingUnlockToken.tokenId;

    if (!matchesToken) {
      return {
        success: false,
        message: 'Invalid QR code or 6-digit PIN. Hold your active UniCharge QR directly to the scanner.',
      };
    }

    if (pendingUnlockToken.paymentMethod === 'wallet') {
      if (student.walletBalance < pendingUnlockToken.totalFee) {
        return {
          success: false,
          message: `Insufficient wallet balance (₱${student.walletBalance.toFixed(2)}).`,
        };
      }
      updateCurrentUserState((u) => ({
        ...u,
        walletBalance: u.walletBalance - pendingUnlockToken.totalFee,
      }));
    }

    // Fire physical ESP32 solenoid latch ONLY after kiosk scan verification!
    sound.playSolenoidRelease();
    setTimeout(() => {
      sound.playChargingConnected();
    }, 450);

    setStations((prevStations) =>
      prevStations.map((st) => {
        if (st.id === pendingUnlockToken.stationId) {
          const updatedSlots = st.slots.map((s) =>
            s.slotNumber === pendingUnlockToken.slotNumber
              ? { ...s, status: 'in_use' as const, isDoorOpen: true, isLocked: false }
              : s
          );
          const availableCount = updatedSlots.filter((s) => s.status === 'available').length;
          return { ...st, slots: updatedSlots, availableSlots: availableCount };
        }
        return st;
      })
    );

    setHardwareKioskStationId(pendingUnlockToken.stationId);
    setIsKioskDoorOpen(true);
    setActiveKioskSlotReleased(pendingUnlockToken.slotNumber);

    const targetStation =
      stations.find((s) => s.id === pendingUnlockToken.stationId) || selectedStation;

    const newSession: ActiveSession = {
      sessionId: `USTP-SES-${Math.floor(10000 + Math.random() * 90000)}`,
      stationId: pendingUnlockToken.stationId,
      stationName: pendingUnlockToken.stationName,
      building: targetStation.building,
      slotNumber: pendingUnlockToken.slotNumber,
      serviceType: pendingUnlockToken.serviceType,
      compartmentSize: pendingUnlockToken.compartmentSize,
      startTime: Date.now(),
      durationMinutes: pendingUnlockToken.durationMinutes,
      remainingSeconds: pendingUnlockToken.durationMinutes * 60,
      totalFee: pendingUnlockToken.totalFee,
      batteryInitial: 38,
      batteryCurrent: 38,
      chargingRateWatts: pendingUnlockToken.serviceType === 'storage' ? 0 : 58.4,
      lockerTemperature: 28.6,
      isOverchargeProtectionActive: true,
      isTamperAlertArmed: true,
      status: 'active',
      qrVerificationCode: pendingUnlockToken.qrPayload,
    };

    setActiveSessionForCurrentUser(newSession);
    setPendingUnlockToken(null);

    if (isFirebaseSessionRef.current) {
      authorizedFetch('/api/sessions/start', {
        method: 'POST',
        body: JSON.stringify({
          session: newSession,
          deductWalletAmount:
            pendingUnlockToken.paymentMethod === 'wallet' ? pendingUnlockToken.totalFee : 0,
        }),
      }).catch((err) => console.error('Session sync failed:', err));
    }

    confetti({
      particleCount: 55,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#5BC496', '#4E6E81', '#FFFFFF'],
    });

    return {
      success: true,
      message: `Kiosk Verified! Compartment #${newSession.slotNumber} Solenoid Unlatched at ${newSession.stationName}.`,
    };
  };

  // Used by the Expo Mobile Companion camera QR scanner screen (the phone scanning the kiosk's display QR)
  const unlockStationViaQr = (
    qrCode: string,
    paymentMethod: 'wallet' | 'gcash' | 'maya' | 'cash'
  ): { success: boolean; message: string } => {
    sound.playBeep();

    const slotToBook =
      selectedSlot ||
      selectedStation.slots.find((s) => s.status === 'available') ||
      selectedStation.slots[0];
    const fee = calculateFee(selectedSize, selectedDuration, selectedService);

    if (paymentMethod === 'wallet') {
      if (student.walletBalance < fee) {
        return {
          success: false,
          message: `Insufficient campus e-wallet balance (₱${student.walletBalance.toFixed(
            2
          )}). Please top up or choose GCash/Maya.`,
        };
      }
      updateCurrentUserState((u) => ({ ...u, walletBalance: u.walletBalance - fee }));
    }

    sound.playSolenoidRelease();
    setTimeout(() => {
      sound.playChargingConnected();
    }, 450);

    setStations((prevStations) =>
      prevStations.map((st) => {
        if (st.id === selectedStation.id) {
          const updatedSlots = st.slots.map((s) =>
            s.slotNumber === slotToBook.slotNumber
              ? { ...s, status: 'in_use' as const, isDoorOpen: true, isLocked: false }
              : s
          );
          const availableCount = updatedSlots.filter((s) => s.status === 'available').length;
          return { ...st, slots: updatedSlots, availableSlots: availableCount };
        }
        return st;
      })
    );

    setHardwareKioskStationId(selectedStation.id);
    setIsKioskDoorOpen(true);
    setActiveKioskSlotReleased(slotToBook.slotNumber);

    const newSession: ActiveSession = {
      sessionId: `USTP-SES-${Math.floor(10000 + Math.random() * 90000)}`,
      stationId: selectedStation.id,
      stationName: selectedStation.name,
      building: selectedStation.building,
      slotNumber: slotToBook.slotNumber,
      serviceType: selectedService,
      compartmentSize: selectedSize,
      startTime: Date.now(),
      durationMinutes: selectedDuration,
      remainingSeconds: selectedDuration * 60,
      totalFee: fee,
      batteryInitial: 38,
      batteryCurrent: 38,
      chargingRateWatts: selectedService === 'storage' ? 0 : 58.4,
      lockerTemperature: 28.6,
      isOverchargeProtectionActive: true,
      isTamperAlertArmed: true,
      status: 'active',
      qrVerificationCode:
        qrCode || `${selectedStation.campusCode}-SLOT${slotToBook.slotNumber}-AUTH`,
    };

    setActiveSessionForCurrentUser(newSession);

    if (isFirebaseSessionRef.current) {
      authorizedFetch('/api/sessions/start', {
        method: 'POST',
        body: JSON.stringify({
          session: newSession,
          deductWalletAmount: paymentMethod === 'wallet' ? fee : 0,
        }),
      }).catch((err) => console.error('QR session sync failed:', err));
    }

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#5BC496', '#4E6E81', '#FFFFFF'],
    });

    return {
      success: true,
      message: `Compartment #${slotToBook.slotNumber} Solenoid Unlatched! Please place your belongings and plug in the cable.`,
    };
  };

  const endActiveSession = (): { success: boolean; message: string } => {
    if (!activeSession) return { success: false, message: 'No active session' };

    sound.playSolenoidRelease();
    setHardwareKioskStationId(activeSession.stationId);
    setIsKioskDoorOpen(true);
    setActiveKioskSlotReleased(activeSession.slotNumber);

    setStations((prevStations) =>
      prevStations.map((st) => {
        if (st.id === activeSession.stationId) {
          const updatedSlots = st.slots.map((s) =>
            s.slotNumber === activeSession.slotNumber
              ? { ...s, status: 'available' as const, isDoorOpen: true, isLocked: false }
              : s
          );
          const availableCount = updatedSlots.filter((s) => s.status === 'available').length;
          return { ...st, slots: updatedSlots, availableSlots: availableCount };
        }
        return st;
      })
    );

    const historyEntry: SessionHistoryItem = {
      id: `hist-${Date.now()}`,
      receiptNumber: `USTP-REC-${Math.floor(100000 + Math.random() * 900000)}`,
      date: 'Just now',
      stationName: activeSession.stationName,
      slotNumber: activeSession.slotNumber,
      durationMinutes: activeSession.durationMinutes,
      totalFee: activeSession.totalFee,
      serviceType: activeSession.serviceType,
      compartmentSize: activeSession.compartmentSize,
      status: 'Completed',
    };

    if (currentUser) {
      const uid = currentUser.id;
      setHistoryByUserId((prevMap) => ({
        ...prevMap,
        [uid]: [historyEntry, ...(prevMap[uid] ?? [])],
      }));
    }
    setActiveSessionForCurrentUser(null);

    if (isFirebaseSessionRef.current) {
      authorizedFetch('/api/sessions/end', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: activeSession.sessionId,
          stationId: activeSession.stationId,
          slotNumber: activeSession.slotNumber,
          receiptNumber: historyEntry.receiptNumber,
          dateLabel: historyEntry.date,
        }),
      }).catch((err) => console.error('End session sync failed:', err));
    }

    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#5BC496', '#4E6E81', '#FFFFFF'],
    });

    return {
      success: true,
      message: `Compartment #${historyEntry.slotNumber} unlocked! Please retrieve your device. Thank you for using UniCharge USTP!`,
    };
  };

  const closeKioskDoor = (slotNumber: number) => {
    sound.playTap();
    setIsKioskDoorOpen(false);
    setActiveKioskSlotReleased(null);

    setStations((prevStations) =>
      prevStations.map((st) => {
        if (st.id === hardwareKioskStationId) {
          const updatedSlots = st.slots.map((s) =>
            s.slotNumber === slotNumber ? { ...s, isDoorOpen: false, isLocked: true } : s
          );
          return { ...st, slots: updatedSlots };
        }
        return st;
      })
    );
  };

  const topUpWallet = (amount: number) => {
    sound.playTap();
    updateCurrentUserState((u) => ({ ...u, walletBalance: u.walletBalance + amount }));
    if (isFirebaseSessionRef.current) {
      authorizedFetch('/api/wallet/topup', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }).catch((err) => console.error('Wallet top-up sync failed:', err));
    }
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#5BC496', '#4E6E81'],
    });
  };

  const toggleBiometrics = () => {
    sound.playTap();
    const next = !student.biometricEnabled;
    updateCurrentUserState((u) => ({ ...u, biometricEnabled: next }));
    if (isFirebaseSessionRef.current) {
      authorizedFetch('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ biometricEnabled: next }),
      }).catch((err) => console.error('Biometrics sync failed:', err));
    }
  };

  const togglePushNotifications = () => {
    sound.playTap();
    const next = !student.pushNotifications;
    updateCurrentUserState((u) => ({ ...u, pushNotifications: next }));
    if (isFirebaseSessionRef.current) {
      authorizedFetch('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ pushNotifications: next }),
      }).catch((err) => console.error('Notifications sync failed:', err));
    }
  };

  const toggleOverchargeProtection = () => {
    sound.playTap();
    const next = !student.overchargeAlerts;
    updateCurrentUserState((u) => ({ ...u, overchargeAlerts: next }));
    if (isFirebaseSessionRef.current) {
      authorizedFetch('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ overchargeAlerts: next }),
      }).catch((err) => console.error('Overcharge alert sync failed:', err));
    }
    if (activeSession) {
      setActiveSessionForCurrentUser((prev) =>
        prev
          ? { ...prev, isOverchargeProtectionActive: !prev.isOverchargeProtectionActive }
          : null
      );
    }
  };

  const updateUserProfile = (updates: {
    name?: string;
    college?: string;
    degree?: string;
    avatar?: string;
  }) => {
    updateCurrentUserState((u) => ({
      ...u,
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.college !== undefined ? { college: updates.college } : {}),
      ...(updates.degree !== undefined ? { degree: updates.degree } : {}),
      ...(updates.avatar !== undefined ? { avatar: updates.avatar } : {}),
    }));
    if (isFirebaseSessionRef.current) {
      authorizedFetch('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }).catch((err) => console.error('Profile sync failed:', err));
    }
  };

  const triggerSimulatedTamper = () => {
    sound.playTamperAlarm();
    if (activeSession) {
      setActiveSessionForCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              isTamperAlertArmed: true,
              lockerTemperature: +(prev.lockerTemperature + 3.2).toFixed(1),
            }
          : null
      );
      setSecurityAlerts((prev) => [
        {
          id: `alt-${Date.now()}`,
          timestamp: 'Just now',
          stationCode: 'USTP-CITC-K01',
          stationName: activeSession.stationName,
          slotNumber: activeSession.slotNumber,
          severity: 'critical',
          type: 'Tamper Vibration',
          message: `Triaxial accelerometer threshold triggered on Slot #${activeSession.slotNumber}.`,
          resolved: false,
        },
        ...prev,
      ]);
    }
  };

  const adminRemoteUnlockSlot = (stationId: string, slotNumber: number) => {
    if (currentUser?.role !== 'admin') return;
    sound.playSolenoidRelease();
    setHardwareKioskStationId(stationId);
    setIsKioskDoorOpen(true);
    setActiveKioskSlotReleased(slotNumber);

    setStations((prev) =>
      prev.map((st) => {
        if (st.id !== stationId) return st;
        const updatedSlots = st.slots.map((s) =>
          s.slotNumber === slotNumber
            ? { ...s, status: 'available' as const, isDoorOpen: true, isLocked: false }
            : s
        );
        return {
          ...st,
          slots: updatedSlots,
          availableSlots: updatedSlots.filter((s) => s.status === 'available').length,
        };
      })
    );

    if (isFirebaseSessionRef.current) {
      authorizedFetch('/api/admin/slots/update', {
        method: 'POST',
        body: JSON.stringify({
          stationId,
          slotNumber,
          status: 'available',
          isDoorOpen: true,
          isLocked: false,
        }),
      }).catch((err) => console.error('Admin unlock sync failed:', err));
    }
  };

  const adminToggleSlotMaintenance = (stationId: string, slotNumber: number) => {
    if (currentUser?.role !== 'admin') return;
    sound.playTap();
    let computedStatus: LockerSlot['status'] = 'available';
    setStations((prev) =>
      prev.map((st) => {
        if (st.id !== stationId) return st;
        const updatedSlots = st.slots.map((s) => {
          if (s.slotNumber !== slotNumber) return s;
          const nextStatus = s.status === 'maintenance' ? 'available' : 'maintenance';
          computedStatus = nextStatus as LockerSlot['status'];
          return { ...s, status: computedStatus };
        });
        return {
          ...st,
          slots: updatedSlots,
          availableSlots: updatedSlots.filter((s) => s.status === 'available').length,
        };
      })
    );

    if (isFirebaseSessionRef.current) {
      authorizedFetch('/api/admin/slots/update', {
        method: 'POST',
        body: JSON.stringify({
          stationId,
          slotNumber,
          status: computedStatus,
        }),
      }).catch((err) => console.error('Admin maintenance sync failed:', err));
    }
  };

  const adminProvisionStaff = ({
    name,
    email,
    staffId,
    password,
  }: {
    name: string;
    email: string;
    staffId: string;
    password: string;
  }): AuthResult => {
    if (currentUser?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin role required.' };
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim() || !cleanEmail || !staffId.trim() || !password) {
      return { success: false, error: 'All staff provisioning fields are required.' };
    }
    if (
      users.some(
        (u) =>
          u.email.toLowerCase() === cleanEmail ||
          u.studentIdNumber.toLowerCase() === staffId.trim().toLowerCase()
      )
    ) {
      return { success: false, error: 'Staff email or ID already exists.' };
    }

    const newAdmin: UserAccount = {
      id: `usr_admin_${Date.now()}`,
      name: name.trim(),
      studentIdNumber: staffId.trim().toUpperCase(),
      email: cleanEmail,
      password,
      role: 'admin',
      college: 'USTP ICT Infrastructure & Smart Campus Operations',
      degree: 'Station Operations Staff',
      avatar: '',
      walletBalance: 0,
      biometricEnabled: true,
      pushNotifications: true,
      overchargeAlerts: true,
      preferredPayment: 'wallet',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setUsers((prev) => [newAdmin, ...prev]);
    return { success: true, user: newAdmin };
  };

  const resolveSecurityAlert = (alertId: string) => {
    if (currentUser?.role !== 'admin') return;
    sound.playTap();
    setSecurityAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, resolved: true } : a))
    );
    if (isFirebaseSessionRef.current) {
      authorizedFetch('/api/admin/alerts/resolve', {
        method: 'POST',
        body: JSON.stringify({ alertId }),
      }).catch((err) => console.error('Admin alert sync failed:', err));
    }
  };

  return (
    <UniChargeContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        student,
        users,
        currentRoute,
        accessDeniedMessage,
        clearAccessDenied,
        authSuccessMessage,
        clearAuthSuccess,
        navigate,
        stations,
        selectedStation,
        selectedSlot,
        selectedService,
        selectedSize,
        selectedDuration,
        activeSession,
        pendingUnlockToken,
        pendingSecondsLeft,
        sessionHistory,
        securityAlerts,
        hardwareKioskStationId,
        isKioskDoorOpen,
        activeKioskSlotReleased,
        loginWithAccount,
        loginWithGoogle,
        loginDemoByEmail,
        registerStudentAccount,
        loginDemo,
        loginWithCredentials,
        logout,
        setSelectedStation,
        setSelectedSlot,
        setSelectedService,
        setSelectedSize,
        setSelectedDuration,
        calculateFee,
        generateUnlockToken,
        regenerateUnlockToken,
        cancelPendingUnlock,
        verifyKioskUnlock,
        unlockStationViaQr,
        endActiveSession,
        topUpWallet,
        toggleBiometrics,
        togglePushNotifications,
        toggleOverchargeProtection,
        updateUserProfile,
        closeKioskDoor,
        triggerSimulatedTamper,
        setHardwareKioskStationId,
        adminRemoteUnlockSlot,
        adminToggleSlotMaintenance,
        adminProvisionStaff,
        resolveSecurityAlert,
      }}
    >
      {children}
    </UniChargeContext.Provider>
  );
};

export const useUniCharge = () => {
  const context = useContext(UniChargeContext);
  if (!context) {
    throw new Error('useUniCharge must be used within a UniChargeProvider');
  }
  return context;
};
