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
  PricingTier,
  LockerSlot,
  SecurityAlert,
  PendingUnlockToken,
  DashboardNotification,
  AdminStationActivity,
  PaymentMethod,
  WalletTransaction,
} from '../types';
import {
  SEEDED_USERS,
  INITIAL_STUDENT,
  INITIAL_STATIONS,
  INITIAL_SECURITY_ALERTS,
} from '../data/mockData';
import {
  PRICING_TIERS,
  UNICHARGE_STATION_CODE,
  UNICHARGE_STATION_ID,
  UNICHARGE_STATION_NAME,
  formatCompartmentCode,
  formatCompartmentLabel,
  getDefaultTierForService,
  resolvePricingTier,
} from '../constants/pricing';
import {
  RETIRED_DEMO_USER_UID,
  RETIRED_SEEDED_ADMIN_UIDS,
} from '../constants/seededAccounts';
import { sound } from '../utils/audio';
import {
  formatSessionDateTime,
  getRemainingSessionSeconds,
} from '../utils/format';
import {
  createFirestoreNotification,
  deleteFirestoreNotification,
  markFirestoreNotificationRead,
  subscribeUserNotifications,
  type CreateNotificationInput,
} from '../lib/firestoreNotifications';

export type AppRoute =
  | '/login'
  | '/signup'
  | '/onboarding'
  | '/student/dashboard'
  | '/kiosk'
  | '/admin/dashboard';

interface AuthResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
  user?: UserAccount;
}

interface VerificationSendResult {
  success: boolean;
  error?: string;
  email?: string;
  deliveryMode?: string;
  previewUrl?: string;
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
  selectedTier: PricingTier;
  selectedDuration: number;
  activeSession: ActiveSession | null;
  pendingUnlockToken: PendingUnlockToken | null;
  pendingSecondsLeft: number;
  reservationTimeoutMessage: string | null;
  clearReservationTimeout: () => void;
  sessionHistory: SessionHistoryItem[];
  walletTransactions: WalletTransaction[];
  securityAlerts: SecurityAlert[];
  adminStationActivity: AdminStationActivity;
  hardwareKioskStationId: string;
  isKioskDoorOpen: boolean;
  activeKioskSlotReleased: number | null;
  // Auth Methods
  loginWithAccount: (identifier: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  completeGoogleOnboarding: (params: {
    name?: string;
    studentIdNumber: string;
    college: string;
    course: string;
  }) => Promise<AuthResult>;
  loginDemoByEmail: (email: string) => Promise<AuthResult>;
  sendSignupVerificationCode: (params: {
    name: string;
    studentIdNumber: string;
    email: string;
    password: string;
    college: string;
    course: string;
  }) => Promise<VerificationSendResult>;
  registerStudentAccount: (params: {
    name: string;
    studentIdNumber: string;
    email: string;
    password: string;
    college: string;
    course: string;
    verificationCode: string;
  }) => Promise<AuthResult>;
  sendPasswordResetCode: (identifier: string) => Promise<{
    success: boolean;
    error?: string;
    maskedEmail?: string;
    previewUrl?: string;
  }>;
  resetPasswordWithCode: (params: {
    identifier: string;
    verificationCode: string;
    newPassword: string;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  loginDemo: () => void;
  loginWithCredentials: (studentId: string, email: string) => boolean;
  logout: () => void;
  // Student / Hardware Methods
  setSelectedStation: (station: KioskStation) => void;
  setSelectedSlot: (slot: LockerSlot | null) => void;
  setSelectedService: (service: ServiceType) => void;
  setSelectedTier: (tier: PricingTier) => void;
  setSelectedDuration: (duration: number) => void;
  calculateFee: (tierOrService?: string, durationMinutes?: number) => number;
  generateUnlockToken: (
    paymentMethod: PaymentMethod
  ) => Promise<{ success: boolean; message: string; token?: PendingUnlockToken }>;
  regenerateUnlockToken: () => Promise<{
    success: boolean;
    message: string;
    token?: PendingUnlockToken;
  }>;
  resendUnlockQrEmail: () => Promise<{
    success: boolean;
    message: string;
    emailSentTo?: string;
    emailSentFrom?: string;
    deliveryMode?: 'smtp' | 'resend' | 'ethereal';
    previewUrl?: string;
  }>;
  cancelPendingUnlock: () => void;
  verifyKioskUnlock: (
    pinOrQrPayload: string,
    kioskStationId?: string,
    coinInsertedAmount?: number
  ) => Promise<{
    success: boolean;
    message: string;
    requiresCoinPayment?: boolean;
    token?: PendingUnlockToken;
    action?: 'unlocked' | 'retrieved';
    receiptNumber?: string;
    coinChangeCredited?: number;
  }>;
  unlockViaCoinWalkUp: (params: {
    stationId?: string;
    slotNumber: number;
    serviceType: ServiceType;
    tierId: string;
    coinInsertedAmount: number;
    customPin: string;
  }) => Promise<{
    success: boolean;
    message: string;
    retrievalPin?: string;
    coinChangeCredited?: number;
    coinChangeDispensed?: number;
    session?: ActiveSession;
  }>;
  unlockStationViaQr: (
    qrCode: string,
    paymentMethod: PaymentMethod
  ) => Promise<{ success: boolean; message: string }>;
  endActiveSession: () => { success: boolean; message: string };
  topUpWallet: (
    amount: number,
    options?: {
      source?: 'wallet' | 'gcash' | 'maya' | 'gotyme';
      referenceCode?: string;
    }
  ) => Promise<{ success: boolean; message: string; referenceCode?: string }>;
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
  simulateFullCharge: () => Promise<void>;
  triggerUnexpectedDoorOpen: (stationId?: string, slotNumber?: number) => Promise<void>;
  setHardwareKioskStationId: (stationId: string) => void;
  // Real-Time Firestore Notifications
  notifications: DashboardNotification[];
  liveToastNotifications: DashboardNotification[];
  unreadNotificationCount: number;
  isFirestoreLive: boolean;
  firestoreError: string | null;
  dismissLiveToast: (id: string) => void;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  // Admin Methods
  adminRemoteUnlockSlot: (stationId: string, slotNumber: number) => void;
  adminToggleSlotMaintenance: (
    stationId: string,
    slotNumber: number
  ) => Promise<{ success: boolean; message?: string }>;
  adminProvisionStaff: (params: {
    name: string;
    email: string;
    staffId: string;
    password: string;
  }) => Promise<AuthResult>;
  resolveSecurityAlert: (alertId: string) => void;
}

const UniChargeContext = createContext<UniChargeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  users: 'unicharge_users_v4',
  currentUserId: 'unicharge_current_user_id_v4',
  sessions: 'unicharge_sessions_by_user_v3',
  history: 'unicharge_history_by_user_v3',
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

function loadUsers(): UserAccount[] {
  const retiredIds = new Set<string>([
    RETIRED_DEMO_USER_UID,
    ...RETIRED_SEEDED_ADMIN_UIDS,
  ]);
  return readStorage<UserAccount[]>(STORAGE_KEYS.users, SEEDED_USERS).filter(
    (user) => !retiredIds.has(user.id)
  );
}

function normalizePath(rawPath: string): AppRoute {
  const cleaned = rawPath.replace(/^#/, '');
  if (cleaned === '/signup') return '/signup';
  if (cleaned === '/onboarding') return '/onboarding';
  if (cleaned === '/student/dashboard') return '/student/dashboard';
  if (cleaned === '/kiosk' || cleaned === '/mobile-expo') return '/kiosk';
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
  const [users, setUsers] = useState<UserAccount[]>(loadUsers);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const savedId = readStorage<string | null>(STORAGE_KEYS.currentUserId, null);
    if (!savedId || !loadUsers().some((user) => user.id === savedId)) return null;
    const savedUsers = loadUsers();
    return savedUsers.find((u) => u.id === savedId) ?? null;
  });
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => getCurrentBrowserRoute());
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);

  const [stations, setStations] = useState<KioskStation[]>(INITIAL_STATIONS);
  const [selectedStation, setSelectedStation] = useState<KioskStation>(INITIAL_STATIONS[0]);
  const [selectedSlot, setSelectedSlot] = useState<LockerSlot | null>(
    INITIAL_STATIONS[0].slots.find((s) => s.status === 'available' && s.category === 'charging') ||
      INITIAL_STATIONS[0].slots[0]
  );
  const [selectedService, setSelectedServiceState] = useState<ServiceType>('charging');
  const [selectedTier, setSelectedTierState] = useState<PricingTier>(PRICING_TIERS[0]);
  const [selectedDuration, setSelectedDuration] = useState<number>(PRICING_TIERS[0].durationMinutes);
  const [sessionsByUserId, setSessionsByUserId] = useState<
    Record<string, ActiveSession | null>
  >(() =>
    readStorage<Record<string, ActiveSession | null>>(STORAGE_KEYS.sessions, {})
  );
  const [historyByUserId, setHistoryByUserId] = useState<
    Record<string, SessionHistoryItem[]>
  >(() =>
    readStorage<Record<string, SessionHistoryItem[]>>(STORAGE_KEYS.history, {})
  );
  const [walletTxByUserId, setWalletTxByUserId] = useState<
    Record<string, WalletTransaction[]>
  >({});
  const [pendingUnlockToken, setPendingUnlockToken] = useState<PendingUnlockToken | null>(null);
  const [pendingSecondsLeft, setPendingSecondsLeft] = useState<number>(0);
  const [reservationTimeoutMessage, setReservationTimeoutMessage] = useState<string | null>(null);
  const expiredHandledTokenRef = useRef<string | null>(null);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>(INITIAL_SECURITY_ALERTS);
  const [adminStationActivity, setAdminStationActivity] = useState<AdminStationActivity>({
    activeSessions: [],
    pendingReservations: [],
    recentTransactions: [],
  });

  // Physical Kiosk Hardware Simulation state
  const [hardwareKioskStationId, setHardwareKioskStationId] = useState<string>(UNICHARGE_STATION_ID);
  const [isKioskDoorOpen, setIsKioskDoorOpen] = useState<boolean>(false);
  const [activeKioskSlotReleased, setActiveKioskSlotReleased] = useState<number | null>(null);

  // Real-Time Firestore Notifications State
  const [firebaseAuthUser, setFirebaseAuthUser] = useState<{
    uid: string;
    emailVerified: boolean;
  } | null>(() =>
    auth.currentUser
      ? { uid: auth.currentUser.uid, emailVerified: auth.currentUser.emailVerified }
      : null
  );
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [liveToastNotifications, setLiveToastNotifications] = useState<DashboardNotification[]>([]);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const notifiedChargeSessionsRef = useRef<Set<string>>(new Set());

  // Auth token held strictly in memory (never localStorage)
  const idTokenRef = useRef<string | null>(null);
  const isBackendSessionRef = useRef<boolean>(false);
  const logoutInProgressRef = useRef(false);
  const authGenerationRef = useRef(0);

  const authorizedFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    const authGeneration = authGenerationRef.current;
    const fbUser = auth.currentUser;
    let token = idTokenRef.current;
    if (!token?.startsWith('uc_') && fbUser) {
      token = await fbUser.getIdToken();
    }
    if (
      !token ||
      !isBackendSessionRef.current ||
      authGeneration !== authGenerationRef.current
    ) {
      return null;
    }
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

  const publicKioskFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    const authGeneration = authGenerationRef.current;
    const fbUser = auth.currentUser;
    let token = idTokenRef.current;
    if (!token?.startsWith('uc_') && fbUser) {
      token = await fbUser.getIdToken();
    }
    if (token && authGeneration === authGenerationRef.current) {
      idTokenRef.current = token;
    } else if (authGeneration !== authGenerationRef.current) {
      token = null;
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((init.headers as Record<string, string>) || {}),
    };
    if (token && isBackendSessionRef.current) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(url, {
      ...init,
      headers,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Request failed (${res.status})`);
    }
    return res.json();
  }, []);

  const applyBootstrapPayload = useCallback(
    (data: {
      user: UserAccount;
      users?: UserAccount[];
      stations?: KioskStation[];
      securityAlerts?: SecurityAlert[];
      activeSession?: ActiveSession | null;
      sessionHistory?: SessionHistoryItem[];
      walletTransactions?: WalletTransaction[];
      pendingUnlockToken?: PendingUnlockToken | null;
      stationActivity?: AdminStationActivity;
    }): UserAccount => {
      const loadedUser = data.user;
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
        const nextStations = data.stations;
        setStations(nextStations);
        setSelectedStation(
          (prev) => nextStations.find((s) => s.id === prev.id) || nextStations[0]
        );
      }
      if (Array.isArray(data.securityAlerts)) {
        setSecurityAlerts(data.securityAlerts);
      }
      if (data.stationActivity) {
        setAdminStationActivity(data.stationActivity);
      }
      setSessionsByUserId((prev) => ({
        ...prev,
        [loadedUser.id]: data.activeSession ?? null,
      }));
      setHistoryByUserId((prev) => ({
        ...prev,
        [loadedUser.id]: Array.isArray(data.sessionHistory) ? data.sessionHistory : [],
      }));
      setWalletTxByUserId((prev) => ({
        ...prev,
        [loadedUser.id]: Array.isArray(data.walletTransactions) ? data.walletTransactions : [],
      }));
      if (data.pendingUnlockToken !== undefined) {
        setPendingUnlockToken(data.pendingUnlockToken);
      }
      return loadedUser;
    },
    []
  );

  const hydrateFromBackend = useCallback(
    async (token: string, expectedAuthGeneration?: number): Promise<UserAccount> => {
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
      if (
        expectedAuthGeneration !== undefined &&
        (expectedAuthGeneration !== authGenerationRef.current ||
          logoutInProgressRef.current)
      ) {
        throw new Error('Sign-in was cancelled.');
      }
      idTokenRef.current = token;
      isBackendSessionRef.current = true;
      return applyBootstrapPayload(data);
    },
    [applyBootstrapPayload]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (logoutInProgressRef.current) {
        if (!fbUser) logoutInProgressRef.current = false;
        return;
      }
      if (fbUser) {
        const authGeneration = authGenerationRef.current;
        setFirebaseAuthUser({ uid: fbUser.uid, emailVerified: fbUser.emailVerified });
        if (idTokenRef.current?.startsWith('uc_')) return;
        try {
          const token = await fbUser.getIdToken();
          if (
            logoutInProgressRef.current ||
            authGeneration !== authGenerationRef.current
          ) {
            return;
          }
          await hydrateFromBackend(token, authGeneration);
        } catch (err) {
          console.error('Failed to restore authenticated session:', err);
        }
      } else {
        setFirebaseAuthUser(null);
        if (!idTokenRef.current?.startsWith('uc_')) {
          idTokenRef.current = null;
          isBackendSessionRef.current = false;
        }
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
  const isFirestoreLive = Boolean(
    isAuthenticated && firebaseAuthUser && firebaseAuthUser.emailVerified
  );

  const syncChannelRef = useRef<BroadcastChannel | null>(null);
  const syncInFlightRef = useRef<boolean>(false);

  const syncStationState = useCallback(async () => {
    if (!isBackendSessionRef.current || syncInFlightRef.current) return;
    const authGeneration = authGenerationRef.current;
    syncInFlightRef.current = true;
    try {
      const data = await authorizedFetch('/api/station/sync');
      if (
        !data ||
        !isBackendSessionRef.current ||
        authGeneration !== authGenerationRef.current
      ) {
        return;
      }
      if (Array.isArray(data.stations) && data.stations.length > 0) {
        const nextStations = data.stations as KioskStation[];
        setStations(nextStations);
        setSelectedStation(
          (prev) => nextStations.find((s) => s.id === prev.id) || nextStations[0]
        );
      }
      if (Array.isArray(data.securityAlerts)) {
        setSecurityAlerts(data.securityAlerts as SecurityAlert[]);
      }
      if (data.stationActivity) {
        setAdminStationActivity(data.stationActivity as AdminStationActivity);
      }
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
      if (data.user) {
        const syncedUser = data.user as UserAccount;
        setCurrentUser((prev) => (prev ? { ...prev, ...syncedUser } : syncedUser));
        setSessionsByUserId((prevMap) => {
          const localActive = prevMap[syncedUser.id];
          const serverActive = (data.activeSession ?? null) as ActiveSession | null;
          if (!serverActive) {
            return localActive === null ? prevMap : { ...prevMap, [syncedUser.id]: null };
          }
          if (localActive && localActive.sessionId === serverActive.sessionId) {
            return prevMap;
          }
          return { ...prevMap, [syncedUser.id]: serverActive };
        });
        if (Array.isArray(data.sessionHistory)) {
          setHistoryByUserId((prevMap) => ({
            ...prevMap,
            [syncedUser.id]: data.sessionHistory as SessionHistoryItem[],
          }));
        }
        if (Array.isArray(data.walletTransactions)) {
          setWalletTxByUserId((prevMap) => ({
            ...prevMap,
            [syncedUser.id]: data.walletTransactions as WalletTransaction[],
          }));
        }
        if (data.pendingUnlockToken !== undefined) {
          setPendingUnlockToken(data.pendingUnlockToken as PendingUnlockToken | null);
        }
      }
    } catch {
      // Ignore transient polling failures
    } finally {
      syncInFlightRef.current = false;
    }
  }, [authorizedFetch]);

  const syncPublicStationState = useCallback(async () => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    try {
      const res = await fetch('/api/kiosk/public-state');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.stations) && data.stations.length > 0) {
        const nextStations = data.stations as KioskStation[];
        setStations(nextStations);
        setSelectedStation(
          (prev) => nextStations.find((s) => s.id === prev.id) || nextStations[0]
        );
      }
    } catch {
      // Ignore transient polling failures
    } finally {
      syncInFlightRef.current = false;
    }
  }, []);

  const notifyStationSync = useCallback(() => {
    try {
      syncChannelRef.current?.postMessage({ type: 'station-updated', at: Date.now() });
    } catch {
      // Ignore BroadcastChannel errors
    }
  }, []);

  useEffect(() => {
    const shouldSyncAuth = isAuthenticated && isBackendSessionRef.current;
    const shouldSyncPublicKiosk = !isAuthenticated && currentRoute === '/kiosk';
    if (!shouldSyncAuth && !shouldSyncPublicKiosk) return;

    const runSync = () => {
      if (shouldSyncAuth) {
        void syncStationState();
      } else {
        void syncPublicStationState();
      }
    };

    if (shouldSyncPublicKiosk) {
      runSync();
    }

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('unicharge_station_sync');
      syncChannelRef.current = channel;
      channel.onmessage = () => {
        runSync();
      };
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        runSync();
      }
    }, 3000);

    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        runSync();
      }
    };
    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      channel?.close();
      syncChannelRef.current = null;
    };
  }, [currentRoute, isAuthenticated, syncPublicStationState, syncStationState]);

  // Real-time Firestore onSnapshot subscription (only when Firebase Auth is verified & active)
  useEffect(() => {
    if (!isFirestoreLive || !firebaseAuthUser) {
      return;
    }

    setFirestoreError(null);
    const unsubscribe = subscribeUserNotifications(firebaseAuthUser.uid, {
      onSnapshotData: (allItems, newlyAddedUnread) => {
        setNotifications(allItems);
        if (newlyAddedUnread.length > 0) {
          const latestCritical = newlyAddedUnread.some(
            (item) => item.type === 'unexpected_door_open'
          );
          if (latestCritical) {
            sound.playTamperAlarm();
          } else {
            sound.playChargingConnected();
          }
          setLiveToastNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const additions = newlyAddedUnread.filter((n) => !existingIds.has(n.id));
            return [...additions, ...prev].slice(0, 4);
          });
        }
      },
      onError: (err) => {
        console.error('Firestore notifications snapshot error:', err);
        setFirestoreError(err.message);
      },
    });

    return () => unsubscribe();
  }, [isFirestoreLive, firebaseAuthUser]);

  const student = currentUser ?? INITIAL_STUDENT;
  const storedActiveSession = currentUser
    ? (sessionsByUserId[currentUser.id] ?? null)
    : null;
  const activeSession = storedActiveSession
    ? {
        ...storedActiveSession,
        remainingSeconds: getRemainingSessionSeconds(
          storedActiveSession.startTime,
          storedActiveSession.durationMinutes
        ),
      }
    : null;
  const sessionHistory = currentUser ? (historyByUserId[currentUser.id] ?? []) : [];
  const walletTransactions = currentUser ? (walletTxByUserId[currentUser.id] ?? []) : [];

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
        if (user.profileCompleted === false) {
          return '/onboarding';
        }
        if (targetRoute === '/admin/dashboard') {
          setAccessDeniedMessage('Access Denied: Admin privileges required');
          return '/student/dashboard';
        }
        if (targetRoute === '/kiosk') return '/kiosk';
        if (
          targetRoute === '/login' ||
          targetRoute === '/signup' ||
          targetRoute === '/onboarding'
        ) {
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

  const clearReservationTimeout = useCallback(() => {
    setReservationTimeoutMessage(null);
  }, []);

  // 5-Minute Countdown Timer for Pending QR Unlock Token + Auto-Release Sync
  useEffect(() => {
    if (!pendingUnlockToken) {
      setPendingSecondsLeft(0);
      return;
    }

    const updateLeft = () => {
      const diff = Math.max(0, Math.ceil((pendingUnlockToken.expiresAt - Date.now()) / 1000));
      setPendingSecondsLeft(diff);

      if (diff === 0 && expiredHandledTokenRef.current !== pendingUnlockToken.tokenId) {
        expiredHandledTokenRef.current = pendingUnlockToken.tokenId;
        const expiredSlot = pendingUnlockToken.slotNumber;
        const expiredStationId = pendingUnlockToken.stationId;
        setReservationTimeoutMessage(
          `Reservation timed out (5-minute limit) — ${formatCompartmentLabel(
            expiredSlot
          )} released with ₱0 charged.`
        );

        if (isBackendSessionRef.current) {
          window.setTimeout(() => {
            void syncStationState();
            notifyStationSync();
          }, 700);
        } else {
          setStations((prevStations) =>
            prevStations.map((st) => {
              if (st.id !== expiredStationId) return st;
              const updatedSlots = st.slots.map((s) =>
                s.slotNumber === expiredSlot
                  ? { ...s, status: 'available' as const, isDoorOpen: false, isLocked: true }
                  : s
              );
              return {
                ...st,
                slots: updatedSlots,
                availableSlots: updatedSlots.filter((s) => s.status === 'available').length,
              };
            })
          );
          setPendingUnlockToken(null);
        }
      }
    };

    updateLeft();
    const timer = setInterval(updateLeft, 500);
    return () => clearInterval(timer);
  }, [pendingUnlockToken, notifyStationSync, syncStationState]);

  // Active Session Timer & Dynamic Telemetry (keeps locker locked & stops charging at 00:00)
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active' || !currentUser) return;
    const uid = currentUser.id;

    const interval = setInterval(() => {
      setSessionsByUserId((prevMap) => {
        const prev = prevMap[uid];
        if (!prev || prev.status !== 'active') return prevMap;
        const newRemaining = getRemainingSessionSeconds(
          prev.startTime,
          prev.durationMinutes
        );
        if (prev.remainingSeconds === newRemaining) return prevMap;
        const elapsedSeconds = Math.max(0, prev.durationMinutes * 60 - newRemaining);
        const simulatedCurrentBattery = Math.min(
          100,
          Math.floor(prev.batteryInitial + elapsedSeconds / 30)
        );
        const tempVariance = Math.sin(Date.now() / 15000) * 1.2;
        const currentTemp = +(29.5 + tempVariance).toFixed(1);
        const wattage =
          prev.serviceType === 'storage' || newRemaining === 0
            ? 0
            : simulatedCurrentBattery > 85
            ? 18.5
            : 42.0 + Math.floor(Math.sin(Date.now() / 4000) * 4);

        const nextSession: ActiveSession =
          newRemaining === 0
            ? {
                ...prev,
                remainingSeconds: 0,
                batteryCurrent: prev.serviceType === 'charging' ? 100 : prev.batteryCurrent,
                chargingRateWatts: 0,
                isOverchargeProtectionActive: true,
                status: 'active',
              }
            : {
                ...prev,
                remainingSeconds: newRemaining,
                batteryCurrent: prev.serviceType === 'charging' ? simulatedCurrentBattery : prev.batteryCurrent,
                lockerTemperature: currentTemp,
                chargingRateWatts: wattage,
              };

        return { ...prevMap, [uid]: nextSession };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession?.status, currentUser?.id]);

  const setSelectedService = useCallback(
    (service: ServiceType) => {
      setSelectedServiceState(service);
      const defaultTier = getDefaultTierForService(service);
      setSelectedTierState(defaultTier);
      setSelectedDuration(defaultTier.durationMinutes);
      const firstFree =
        selectedStation.slots.find(
          (s) => s.status === 'available' && s.category === service
        ) ||
        selectedStation.slots.find((s) => s.category === service) ||
        null;
      setSelectedSlot(firstFree);
    },
    [selectedStation.slots]
  );

  const setSelectedTier = useCallback((tier: PricingTier) => {
    setSelectedTierState(tier);
    setSelectedServiceState(tier.serviceType);
    setSelectedDuration(tier.durationMinutes);
  }, []);

  const calculateFee = (
    tierOrService: string = selectedTier.id,
    durationMinutes: number = selectedDuration
  ): number => {
    return resolvePricingTier({
      tierId: tierOrService,
      serviceType: selectedService,
      durationMinutes,
    }).fee;
  };

  // Account-level RBAC login resolution (backed by PostgreSQL)
  const loginWithAccount = async (
    identifier: string,
    password: string
  ): Promise<AuthResult> => {
    sound.playTap();
    const authGeneration = authGenerationRef.current;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Invalid email/ID or password',
        };
      }
      if (authGeneration !== authGenerationRef.current) {
        return { success: false, error: 'Sign-in was cancelled.' };
      }
      authGenerationRef.current += 1;
      idTokenRef.current = data.token;
      isBackendSessionRef.current = true;
      const loadedUser = applyBootstrapPayload(data);
      setAccessDeniedMessage(null);
      setAuthSuccessMessage(null);
      const destination: AppRoute =
        loadedUser.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
      setCurrentRoute(destination);
      syncBrowserUrl(destination, false);
      return { success: true, user: loadedUser };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to reach authentication server.';
      return { success: false, error: message };
    }
  };

  const loginWithGoogle = async (): Promise<AuthResult> => {
    sound.playTap();
    const startingAuthGeneration = authGenerationRef.current;
    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      if (startingAuthGeneration !== authGenerationRef.current) {
        logoutInProgressRef.current = true;
        authGenerationRef.current += 1;
        try {
          await signOut(auth);
        } catch (error: unknown) {
          console.error('Cancelled Google sign-in could not be signed out:', error);
        } finally {
          if (!auth.currentUser) logoutInProgressRef.current = false;
        }
        return { success: false, cancelled: true };
      }
      authGenerationRef.current += 1;
      logoutInProgressRef.current = false;
      setFirebaseAuthUser({
        uid: credential.user.uid,
        emailVerified: credential.user.emailVerified,
      });
      const loginGeneration = authGenerationRef.current;
      const token = await credential.user.getIdToken();
      const loadedUser = await hydrateFromBackend(token, loginGeneration);
      setAccessDeniedMessage(null);
      setAuthSuccessMessage(null);
      const destination: AppRoute =
        loadedUser.role === 'admin'
          ? '/admin/dashboard'
          : loadedUser.profileCompleted === false
          ? '/onboarding'
          : '/student/dashboard';
      setCurrentRoute(destination);
      syncBrowserUrl(destination, false);
      return { success: true, user: loadedUser };
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user') {
        return { success: false, cancelled: true };
      }
      if (code === 'auth/unauthorized-domain') {
        const host =
          typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        return {
          success: false,
          error: `Domain "${host}" is not yet authorized for Google Sign-In. Add "${host}" in Firebase Console → Authentication → Settings → Authorized domains.`,
        };
      }
      const message =
        error instanceof Error ? error.message : 'Google Sign-In failed. Please try again.';
      return { success: false, error: message };
    }
  };

  const completeGoogleOnboarding = async ({
    name,
    studentIdNumber,
    college,
    course,
  }: {
    name?: string;
    studentIdNumber: string;
    college: string;
    course: string;
  }): Promise<AuthResult> => {
    sound.playTap();
    try {
      const data = await authorizedFetch('/api/auth/complete-onboarding', {
        method: 'POST',
        body: JSON.stringify({
          ...(name !== undefined ? { name } : {}),
          studentIdNumber,
          college,
          course,
        }),
      });
      if (!data?.user) {
        return { success: false, error: 'Session expired. Please sign in with Google again.' };
      }
      const updatedUser = data.user as UserAccount;
      setCurrentUser(updatedUser);
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
      );
      setAccessDeniedMessage(null);
      setCurrentRoute('/student/dashboard');
      syncBrowserUrl('/student/dashboard', false);
      return { success: true, user: updatedUser };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to save your student profile.';
      return { success: false, error: message };
    }
  };

  const loginDemoByEmail = async (email: string): Promise<AuthResult> => {
    const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!matched) {
      return { success: false, error: 'Invalid email/ID or password' };
    }
    return loginWithAccount(matched.email, matched.password);
  };

  const sendSignupVerificationCode = async ({
    name,
    studentIdNumber,
    email,
    password,
    college,
    course,
  }: {
    name: string;
    studentIdNumber: string;
    email: string;
    password: string;
    college: string;
    course: string;
  }): Promise<VerificationSendResult> => {
    sound.playTap();
    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          studentIdNumber: studentIdNumber.trim(),
          email: email.trim().toLowerCase(),
          password,
          college,
          course,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Unable to send verification code.',
        };
      }
      return {
        success: true,
        email: data.email,
        deliveryMode: data.deliveryMode,
        previewUrl: data.previewUrl,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to reach verification service.';
      return { success: false, error: message };
    }
  };

  const registerStudentAccount = async ({
    name,
    studentIdNumber,
    email,
    password,
    college,
    course,
    verificationCode,
  }: {
    name: string;
    studentIdNumber: string;
    email: string;
    password: string;
    college: string;
    course: string;
    verificationCode: string;
  }): Promise<AuthResult> => {
    sound.playTap();
    const cleanEmail = email.trim().toLowerCase();
    const cleanId = studentIdNumber.trim();

    if (
      !name.trim() ||
      !cleanId ||
      !cleanEmail ||
      !password ||
      !college ||
      !course ||
      !verificationCode
    ) {
      return { success: false, error: 'Please complete all required fields and verification code.' };
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          studentIdNumber: cleanId,
          email: cleanEmail,
          password,
          college,
          course,
          verificationCode: verificationCode.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Unable to create account.',
        };
      }

      const newStudent = data.user as UserAccount;
      setUsers((prev) => [
        ...prev.filter((u) => u.id !== newStudent.id && u.email !== newStudent.email),
        newStudent,
      ]);
      setSessionsByUserId((prev) => ({ ...prev, [newStudent.id]: null }));
      setHistoryByUserId((prev) => ({ ...prev, [newStudent.id]: [] }));
      setAccessDeniedMessage(null);
      setCurrentUser(null);
      setAuthSuccessMessage(
        `Email verified! Account created for ${newStudent.name} (${newStudent.studentIdNumber}). Please sign in with your credentials.`
      );
      setCurrentRoute('/login');
      syncBrowserUrl('/login', false);
      return { success: true, user: newStudent };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to reach registration server.';
      return { success: false, error: message };
    }
  };

  const sendPasswordResetCode = async (
    identifier: string
  ): Promise<{
    success: boolean;
    error?: string;
    maskedEmail?: string;
    previewUrl?: string;
  }> => {
    sound.playTap();
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Unable to send password reset code.',
        };
      }
      return {
        success: true,
        maskedEmail: data.maskedEmail,
        previewUrl: data.previewUrl,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to reach reset service.';
      return { success: false, error: message };
    }
  };

  const resetPasswordWithCode = async ({
    identifier,
    verificationCode,
    newPassword,
  }: {
    identifier: string;
    verificationCode: string;
    newPassword: string;
  }): Promise<{ success: boolean; error?: string; message?: string }> => {
    sound.playTap();
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          verificationCode: verificationCode.trim(),
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Unable to reset password.',
        };
      }
      setAuthSuccessMessage(
        data.message ||
          'Your password has been reset. You can now sign in with your new password.'
      );
      return {
        success: true,
        message: data.message,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to reach reset server.';
      return { success: false, error: message };
    }
  };

  const loginDemo = () => {
    void loginDemoByEmail('jastinalberca8@gmail.com');
  };

  const loginWithCredentials = (studentId: string, email: string): boolean => {
    const matched = users.find(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() ||
        u.studentIdNumber.toLowerCase() === studentId.trim().toLowerCase()
    );
    if (matched) {
      void loginWithAccount(matched.email, matched.password);
      return true;
    }
    return false;
  };

  const logout = () => {
    sound.playTap();
    logoutInProgressRef.current = true;
    authGenerationRef.current += 1;
    setAccessDeniedMessage(null);
    setAuthSuccessMessage(null);
    setPendingUnlockToken(null);
    setNotifications([]);
    setLiveToastNotifications([]);
    setFirestoreError(null);
    setFirebaseAuthUser(null);
    notifiedChargeSessionsRef.current.clear();
    idTokenRef.current = null;
    isBackendSessionRef.current = false;
    signOut(auth)
      .catch((error: unknown) => {
        console.error('Firebase sign-out failed:', error);
      })
      .finally(() => {
        if (!auth.currentUser) logoutInProgressRef.current = false;
      });
    setCurrentUser(null);
    setCurrentRoute('/login');
    syncBrowserUrl('/login', true);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEYS.currentUserId);
    }
  };

  const updateCurrentUserState = (updater: (user: UserAccount) => UserAccount) => {
    if (!currentUser) return;
    const updated = updater(currentUser);
    setCurrentUser(updated);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  // STEP 1 of Secure IoT Unlock: Generate time-sensitive 5-minute QR / 6-digit PIN & email pass
  const generateUnlockToken = async (
    paymentMethod: PaymentMethod
  ): Promise<{ success: boolean; message: string; token?: PendingUnlockToken }> => {
    sound.playTap();
    setReservationTimeoutMessage(null);

    if (currentUser?.role === 'admin') {
      return {
        success: false,
        message: 'Admin accounts cannot avail student compartments. Kiosk usage is restricted to students.',
      };
    }

    if (activeSession && activeSession.status === 'active') {
      return {
        success: false,
        message: `You already have an active session in ${formatCompartmentLabel(
          activeSession.slotNumber
        )}. Retrieve your item and end your session before availing another compartment.`,
      };
    }

    const slotToBook =
      (selectedSlot &&
      selectedSlot.status === 'available' &&
      selectedSlot.category === selectedService
        ? selectedSlot
        : null) ||
      selectedStation.slots.find(
        (s) => s.status === 'available' && s.category === selectedService
      );

    if (!slotToBook || slotToBook.status !== 'available') {
      return {
        success: false,
        message: `No free ${selectedService} compartments right now. Please check back shortly.`,
      };
    }

    const activeTier =
      selectedTier.serviceType === selectedService
        ? selectedTier
        : getDefaultTierForService(selectedService);
    const fee = activeTier.fee;

    if (paymentMethod === 'wallet' && student.walletBalance < fee) {
      return {
        success: false,
        message: `Insufficient campus e-wallet balance (₱${student.walletBalance.toFixed(
          2
        )}). Please reload ₱ or choose GCash, Maya, or GoTyme Bank.`,
      };
    }

    if (isBackendSessionRef.current) {
      try {
        const data = await authorizedFetch('/api/kiosk/unlock-tokens', {
          method: 'POST',
          body: JSON.stringify({
            stationId: selectedStation.id,
            slotNumber: slotToBook.slotNumber,
            serviceType: selectedService,
            pricingTier: activeTier.name,
            durationMinutes: activeTier.durationMinutes,
            paymentMethod,
          }),
        });
        if (!data?.token) {
          return {
            success: false,
            message: 'Session expired. Please sign in again to generate an unlock QR.',
          };
        }
        const serverToken = data.token as PendingUnlockToken;
        if (Array.isArray(data.stations) && data.stations.length > 0) {
          const nextStations = data.stations as KioskStation[];
          setStations(nextStations);
          setSelectedStation(
            (prev) => nextStations.find((s) => s.id === prev.id) || nextStations[0]
          );
        }
        setPendingUnlockToken(serverToken);
        setHardwareKioskStationId(selectedStation.id);
        notifyStationSync();

        const emailSuffix = serverToken.emailSent
          ? ` QR pass emailed to ${serverToken.emailSentTo}.`
          : '';
        return {
          success: true,
          message: `QR Unlock Token generated for ${formatCompartmentLabel(
            slotToBook.slotNumber
          )} (${activeTier.name}).${emailSuffix}`,
          token: serverToken,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unable to generate unlock QR token.';
        return { success: false, message };
      }
    }

    const now = Date.now();
    const randomPin = String(Math.floor(100000 + Math.random() * 900000));
    const tokenId = `TOK-${Math.floor(10000 + Math.random() * 90000)}`;
    const compartmentCode = formatCompartmentCode(slotToBook.slotNumber);
    const token: PendingUnlockToken = {
      tokenId,
      stationId: selectedStation.id,
      stationName: selectedStation.name,
      stationCode: selectedStation.campusCode,
      slotNumber: slotToBook.slotNumber,
      serviceType: selectedService,
      pricingTier: activeTier.name,
      durationMinutes: activeTier.durationMinutes,
      totalFee: fee,
      paymentMethod,
      qrPayload: `UNICHARGE|${selectedStation.campusCode}|SLOT-${compartmentCode}|PIN-${randomPin}|${tokenId}`,
      pinCode: randomPin,
      createdAt: now,
      expiresAt: now + 5 * 60 * 1000,
    };

    setStations((prevStations) =>
      prevStations.map((st) => {
        if (st.id !== selectedStation.id) return st;
        const updatedSlots = st.slots.map((s) => {
          if (pendingUnlockToken && s.slotNumber === pendingUnlockToken.slotNumber) {
            return { ...s, status: 'available' as const, isDoorOpen: false, isLocked: true };
          }
          if (s.slotNumber === slotToBook.slotNumber) {
            return { ...s, status: 'in_use' as const, isDoorOpen: false, isLocked: true };
          }
          return s;
        });
        return {
          ...st,
          slots: updatedSlots,
          availableSlots: updatedSlots.filter((s) => s.status === 'available').length,
        };
      })
    );

    setPendingUnlockToken(token);
    setHardwareKioskStationId(selectedStation.id);

    return {
      success: true,
      message: `QR Unlock Token generated for ${formatCompartmentLabel(
        slotToBook.slotNumber
      )}. Scan at the kiosk within 5 minutes.`,
      token,
    };
  };

  const regenerateUnlockToken = async () => {
    const method = pendingUnlockToken?.paymentMethod || 'wallet';
    return generateUnlockToken(method);
  };

  const resendUnlockQrEmail = async (): Promise<{
    success: boolean;
    message: string;
    emailSentTo?: string;
    emailSentFrom?: string;
    deliveryMode?: 'smtp' | 'resend' | 'ethereal';
    previewUrl?: string;
  }> => {
    sound.playTap();
    if (!pendingUnlockToken) {
      return {
        success: false,
        message: 'No active QR unlock token to email.',
      };
    }
    if (!isBackendSessionRef.current) {
      return {
        success: false,
        message: 'Sign in with a registered student account to email QR passes.',
      };
    }
    try {
      const data = await authorizedFetch('/api/kiosk/email-unlock-qr', {
        method: 'POST',
        body: JSON.stringify({ tokenId: pendingUnlockToken.tokenId }),
      });
      if (!data?.sent) {
        return { success: false, message: 'Unable to send QR pass email.' };
      }
      setPendingUnlockToken((prev) =>
        prev
          ? {
              ...prev,
              emailSent: true,
              emailSentTo: data.emailSentTo || prev.emailSentTo,
              emailSentFrom: data.emailSentFrom || prev.emailSentFrom,
              emailDeliveryMode: data.deliveryMode || prev.emailDeliveryMode,
              emailError: undefined,
              emailPreviewUrl: data.previewUrl || prev.emailPreviewUrl,
            }
          : null
      );
      return {
        success: true,
        message: `QR pass sent to ${data.emailSentTo}${data.emailSentFrom ? ` from ${data.emailSentFrom}` : ''}.`,
        emailSentTo: data.emailSentTo,
        emailSentFrom: data.emailSentFrom,
        deliveryMode: data.deliveryMode,
        previewUrl: data.previewUrl,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to send QR pass email.';
      setPendingUnlockToken((prev) => (prev ? { ...prev, emailError: message } : null));
      return { success: false, message };
    }
  };

  const cancelPendingUnlock = () => {
    sound.playTap();
    const activeToken = pendingUnlockToken;
    setPendingUnlockToken(null);
    if (isBackendSessionRef.current && activeToken?.tokenId) {
      authorizedFetch(`/api/kiosk/unlock-tokens/${encodeURIComponent(activeToken.tokenId)}`, {
        method: 'DELETE',
      })
        .then((data) => {
          if (Array.isArray(data?.stations) && data.stations.length > 0) {
            const nextStations = data.stations as KioskStation[];
            setStations(nextStations);
            setSelectedStation(
              (prev) => nextStations.find((s) => s.id === prev.id) || nextStations[0]
            );
          }
          notifyStationSync();
        })
        .catch((err) => console.error('Cancel unlock token failed:', err));
    } else if (activeToken) {
      setStations((prevStations) =>
        prevStations.map((st) => {
          if (st.id !== activeToken.stationId) return st;
          const updatedSlots = st.slots.map((s) =>
            s.slotNumber === activeToken.slotNumber
              ? { ...s, status: 'available' as const, isDoorOpen: false, isLocked: true }
              : s
          );
          return {
            ...st,
            slots: updatedSlots,
            availableSlots: updatedSlots.filter((s) => s.status === 'available').length,
          };
        })
      );
    }
  };

  // STEP 2 of Secure IoT Unlock: Triggered ONLY when physical kiosk scanner/PIN pad/coin acceptor verifies the token or retrieves an active locker!
  const verifyKioskUnlock = async (
    pinOrQrPayload: string,
    kioskStationId?: string,
    coinInsertedAmount?: number
  ): Promise<{
    success: boolean;
    message: string;
    requiresCoinPayment?: boolean;
    token?: PendingUnlockToken;
    action?: 'unlocked' | 'retrieved';
    receiptNumber?: string;
    coinChangeCredited?: number;
  }> => {
    sound.playBeep();
    setReservationTimeoutMessage(null);
    const targetKioskId = kioskStationId || hardwareKioskStationId;

    if (isBackendSessionRef.current || !currentUser) {
      try {
        const data = await publicKioskFetch('/api/kiosk/verify-unlock', {
          method: 'POST',
          body: JSON.stringify({
            pinOrQrPayload: pinOrQrPayload.trim(),
            kioskStationId: targetKioskId,
            ...(typeof coinInsertedAmount === 'number' ? { coinInsertedAmount } : {}),
          }),
        });

        if (data?.requiresCoinPayment && data?.token) {
          return {
            success: false,
            requiresCoinPayment: true,
            token: data.token as PendingUnlockToken,
            message:
              data.message ||
              `Please insert ₱${Number(data.token.totalFee).toFixed(2)} in coins to unlock.`,
          };
        }

        if (data?.action === 'retrieved') {
          const updatedStations = Array.isArray(data.stations)
            ? (data.stations as KioskStation[])
            : null;
          const retrievedSlot = Number(data.retrievedSlotNumber);
          const receiptNumber = String(data.receiptNumber || `USTP-REC-${Date.now()}`);

          sound.playSolenoidRelease();

          if (updatedStations && updatedStations.length > 0) {
            setStations(updatedStations);
            setSelectedStation(
              (prev) => updatedStations.find((s) => s.id === prev.id) || updatedStations[0]
            );
          }

          if (activeSession && (!retrievedSlot || activeSession.slotNumber === retrievedSlot)) {
            const historyEntry: SessionHistoryItem = {
              id: `hist-${Date.now()}`,
              receiptNumber,
              date: formatSessionDateTime(new Date()),
              stationName: activeSession.stationName,
              slotNumber: activeSession.slotNumber,
              durationMinutes: activeSession.durationMinutes,
              totalFee: activeSession.totalFee,
              serviceType: activeSession.serviceType,
              pricingTier: activeSession.pricingTier,
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
          }

          setHardwareKioskStationId(targetKioskId);
          setIsKioskDoorOpen(true);
          if (retrievedSlot) {
            setActiveKioskSlotReleased(retrievedSlot);
          }
          notifyStationSync();
          if (isBackendSessionRef.current) {
            void syncStationState();
          } else {
            void syncPublicStationState();
          }

          confetti({
            particleCount: 65,
            spread: 65,
            origin: { y: 0.55 },
            colors: ['#5BC496', '#4E6E81', '#FFFFFF'],
          });

          return {
            success: true,
            action: 'retrieved',
            receiptNumber,
            message:
              data.message ||
              `${formatCompartmentLabel(retrievedSlot)} unlocked! Please retrieve your belongings.`,
          };
        }

        if (!data?.session) {
          return {
            success: false,
            message: 'Session expired. Please sign in again.',
          };
        }

        const verifiedSession = data.session as ActiveSession;
        const updatedUser = data.user as UserAccount;
        const updatedStations = Array.isArray(data.stations)
          ? (data.stations as KioskStation[])
          : null;
        const coinChangeCredited = Number(data.coinChangeCredited || 0);

        sound.playSolenoidRelease();
        setTimeout(() => {
          sound.playChargingConnected();
        }, 450);

        if (updatedUser) {
          setCurrentUser(updatedUser);
          setUsers((prev) =>
            prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
          );
          if (Array.isArray(data.walletTransactions)) {
            setWalletTxByUserId((prevMap) => ({
              ...prevMap,
              [updatedUser.id]: data.walletTransactions as WalletTransaction[],
            }));
          }
        }
        if (updatedStations && updatedStations.length > 0) {
          setStations(updatedStations);
          setSelectedStation(
            (prev) => updatedStations.find((s) => s.id === prev.id) || updatedStations[0]
          );
        }

        setHardwareKioskStationId(verifiedSession.stationId);
        setIsKioskDoorOpen(true);
        setActiveKioskSlotReleased(verifiedSession.slotNumber);
        setActiveSessionForCurrentUser(verifiedSession);
        setPendingUnlockToken(null);
        notifyStationSync();

        confetti({
          particleCount: 55,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#5BC496', '#4E6E81', '#FFFFFF'],
        });

        return {
          success: true,
          action: 'unlocked',
          coinChangeCredited,
          message:
            data.message ||
            `Kiosk Verified! ${formatCompartmentLabel(
              verifiedSession.slotNumber
            )} Solenoid Unlatched at ${verifiedSession.stationName}.`,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unable to verify kiosk unlock pass.';
        return { success: false, message };
      }
    }

    const cleaned = pinOrQrPayload.trim();

    if (!pendingUnlockToken) {
      if (
        activeSession &&
        activeSession.stationId === targetKioskId &&
        (cleaned === activeSession.qrVerificationCode ||
          cleaned === activeSession.sessionId ||
          (/^\d{6}$/.test(cleaned) &&
            activeSession.qrVerificationCode.includes(`PIN-${cleaned}`)))
      ) {
        const res = endActiveSession();
        return {
          success: res.success,
          action: 'retrieved',
          message: res.message,
        };
      }
      return {
        success: false,
        message: 'No pending QR unlock authorization found. Generate an unlock QR from Avail a Locker or use Walk-Up Coin.',
      };
    }

    if (Date.now() > pendingUnlockToken.expiresAt) {
      return {
        success: false,
        message: 'Reservation timed out (5-minute limit) — compartment released with ₱0 charged. Please avail again.',
      };
    }

    if (targetKioskId !== pendingUnlockToken.stationId) {
      return {
        success: false,
        message: `Wrong kiosk! This QR authorizes ${pendingUnlockToken.stationName} (${pendingUnlockToken.stationCode}). Switch the kiosk simulator to ${pendingUnlockToken.stationCode} to scan.`,
      };
    }

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

    if (activeSession?.status === 'active') {
      return {
        success: false,
        message: `You already have an active session in ${formatCompartmentLabel(
          activeSession.slotNumber
        )}. Retrieve your item and end your session before opening another compartment.`,
      };
    }

    if (pendingUnlockToken.paymentMethod === 'cash') {
      const inserted = Number(coinInsertedAmount ?? 0);
      if (inserted < pendingUnlockToken.totalFee) {
        return {
          success: false,
          requiresCoinPayment: true,
          token: pendingUnlockToken,
          message: `Insert ₱${pendingUnlockToken.totalFee.toFixed(
            2
          )} in coins into the kiosk coin slot to unlock ${formatCompartmentLabel(
            pendingUnlockToken.slotNumber
          )}.`,
        };
      }
      if (inserted !== pendingUnlockToken.totalFee) {
        return {
          success: false,
          message: `Exact payment is required: insert ₱${pendingUnlockToken.totalFee.toFixed(
            2
          )}. Overpayment is not accepted.`,
        };
      }
    } else if (pendingUnlockToken.paymentMethod === 'wallet') {
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
      pricingTier: pendingUnlockToken.pricingTier,
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

    confetti({
      particleCount: 55,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#5BC496', '#4E6E81', '#FFFFFF'],
    });

    return {
      success: true,
      action: 'unlocked',
      message: `Kiosk Verified! ${formatCompartmentLabel(
        newSession.slotNumber
      )} Solenoid Unlatched at ${newSession.stationName}.`,
    };
  };

  const unlockViaCoinWalkUp = async (params: {
    stationId?: string;
    slotNumber: number;
    serviceType: ServiceType;
    tierId: string;
    coinInsertedAmount: number;
    customPin: string;
  }): Promise<{
    success: boolean;
    message: string;
    retrievalPin?: string;
    coinChangeCredited?: number;
    coinChangeDispensed?: number;
    session?: ActiveSession;
  }> => {
    sound.playBeep();
    setReservationTimeoutMessage(null);
    if (currentUser?.role === 'admin') {
      return {
        success: false,
        message: 'Admin accounts cannot avail kiosk compartments. Kiosk self-service is restricted to students.',
      };
    }
    if (activeSession && activeSession.status === 'active') {
      return {
        success: false,
        message: `You already have an active session in ${formatCompartmentLabel(
          activeSession.slotNumber
        )}. Retrieve your item and end your session before opening another locker.`,
      };
    }
    const targetStationId = params.stationId || hardwareKioskStationId;
    const cleanCustomPin = (params.customPin || '').trim();

    if (!/^\d{6}$/.test(cleanCustomPin)) {
      return {
        success: false,
        message: 'Please enter your own 6-digit Retrieval PIN (numbers 0–9) before unlatching.',
      };
    }

    if (isBackendSessionRef.current || !currentUser) {
      try {
        const data = await publicKioskFetch('/api/kiosk/coin-unlock', {
          method: 'POST',
          body: JSON.stringify({
            stationId: targetStationId,
            slotNumber: params.slotNumber,
            serviceType: params.serviceType,
            tierId: params.tierId,
            coinInsertedAmount: params.coinInsertedAmount,
            customPin: cleanCustomPin,
          }),
        });
        if (!data?.session) {
          return {
            success: false,
            message: 'Unable to process walk-up coin unlock.',
          };
        }

        const verifiedSession = data.session as ActiveSession;
        const updatedUser = data.user as UserAccount | null;
        const updatedStations = Array.isArray(data.stations)
          ? (data.stations as KioskStation[])
          : null;
        const retrievalPin = String(data.retrievalPin || cleanCustomPin);
        const coinChangeCredited = Number(data.coinChangeCredited || 0);
        const coinChangeDispensed = Number(data.coinChangeDispensed || 0);
        const isCurrentUserOwner = Boolean(currentUser && data.ownerUid === currentUser.id);

        sound.playSolenoidRelease();
        setTimeout(() => {
          sound.playChargingConnected();
        }, 450);

        if (updatedUser && currentUser && updatedUser.id === currentUser.id) {
          setCurrentUser(updatedUser);
          setUsers((prev) =>
            prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
          );
          if (Array.isArray(data.walletTransactions)) {
            setWalletTxByUserId((prevMap) => ({
              ...prevMap,
              [updatedUser.id]: data.walletTransactions as WalletTransaction[],
            }));
          }
        }
        if (updatedStations && updatedStations.length > 0) {
          setStations(updatedStations);
          setSelectedStation(
            (prev) => updatedStations.find((s) => s.id === prev.id) || updatedStations[0]
          );
        }

        setHardwareKioskStationId(verifiedSession.stationId);
        setIsKioskDoorOpen(true);
        setActiveKioskSlotReleased(verifiedSession.slotNumber);
        if (isCurrentUserOwner) {
          setActiveSessionForCurrentUser(verifiedSession);
          setPendingUnlockToken(null);
        }
        notifyStationSync();
        if (isBackendSessionRef.current) {
          void syncStationState();
        } else {
          void syncPublicStationState();
        }

        confetti({
          particleCount: 55,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#5BC496', '#4E6E81', '#FFFFFF'],
        });

        return {
          success: true,
          retrievalPin,
          coinChangeCredited,
          coinChangeDispensed,
          session: verifiedSession,
          message:
            data.message ||
            `Coins Accepted! ${formatCompartmentLabel(
              verifiedSession.slotNumber
            )} unlatched. Retrieval PIN: ${retrievalPin}.`,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unable to process coin payment.';
        return { success: false, message };
      }
    }

    if (activeSession && activeSession.status === 'active') {
      return {
        success: false,
        message: `You already have an active session on ${formatCompartmentLabel(
          activeSession.slotNumber
        )}. Retrieve it first before opening another compartment.`,
      };
    }

    const tier = resolvePricingTier({
      tierId: params.tierId,
      serviceType: params.serviceType,
      slotNumber: params.slotNumber,
    });
    if (!Number.isFinite(params.coinInsertedAmount) || params.coinInsertedAmount < tier.fee) {
      return {
        success: false,
        message: `Insert at least ₱${tier.fee.toFixed(2)} in coins for ${tier.name}.`,
      };
    }
    if (params.coinInsertedAmount !== tier.fee) {
      return {
        success: false,
        message: `Exact payment is required: insert ₱${tier.fee.toFixed(
          2
        )}. Overpayment is not accepted.`,
      };
    }

    const targetStation = stations.find((s) => s.id === targetStationId) || selectedStation;
    const slotObj = targetStation.slots.find((s) => s.slotNumber === params.slotNumber);
    if (!slotObj || slotObj.status !== 'available') {
      return {
        success: false,
        message: `${formatCompartmentLabel(params.slotNumber)} is not available.`,
      };
    }

    const retrievalPin = cleanCustomPin;
    const compartmentCode = formatCompartmentCode(params.slotNumber);
    const newSession: ActiveSession = {
      sessionId: `USTP-SES-${Math.floor(10000 + Math.random() * 90000)}`,
      stationId: targetStation.id,
      stationName: targetStation.name,
      building: targetStation.building,
      slotNumber: params.slotNumber,
      serviceType: tier.serviceType,
      pricingTier: tier.name,
      startTime: Date.now(),
      durationMinutes: tier.durationMinutes,
      remainingSeconds: tier.durationMinutes * 60,
      totalFee: tier.fee,
      batteryInitial: 38,
      batteryCurrent: 38,
      chargingRateWatts: tier.serviceType === 'storage' ? 0 : 58.4,
      lockerTemperature: 28.6,
      isOverchargeProtectionActive: true,
      isTamperAlertArmed: true,
      status: 'active',
      qrVerificationCode: `UNICHARGE|${targetStation.campusCode}|SLOT-${compartmentCode}|PIN-${retrievalPin}|COIN-LOCAL`,
    };

    sound.playSolenoidRelease();
    setTimeout(() => {
      sound.playChargingConnected();
    }, 450);

    setStations((prevStations) =>
      prevStations.map((st) => {
        if (st.id === targetStation.id) {
          const updatedSlots = st.slots.map((s) =>
            s.slotNumber === params.slotNumber
              ? { ...s, status: 'in_use' as const, isDoorOpen: true, isLocked: false }
              : s
          );
          return {
            ...st,
            slots: updatedSlots,
            availableSlots: updatedSlots.filter((s) => s.status === 'available').length,
          };
        }
        return st;
      })
    );

    setHardwareKioskStationId(targetStation.id);
    setIsKioskDoorOpen(true);
    setActiveKioskSlotReleased(params.slotNumber);
    setActiveSessionForCurrentUser(newSession);
    setPendingUnlockToken(null);

    confetti({
      particleCount: 55,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#5BC496', '#4E6E81', '#FFFFFF'],
    });

    return {
      success: true,
      retrievalPin,
      coinChangeCredited: 0,
      coinChangeDispensed: 0,
      session: newSession,
      message: `Exact payment accepted (₱${tier.fee.toFixed(2)})! ${formatCompartmentLabel(
        params.slotNumber
      )} unlatched. Retrieval PIN: ${retrievalPin}.`,
    };
  };

  // Used by the Expo Mobile Companion camera QR scanner screen (the phone scanning the kiosk's display QR)
  const unlockStationViaQr = async (
    qrCode: string,
    paymentMethod: PaymentMethod
  ): Promise<{ success: boolean; message: string }> => {
    sound.playBeep();

    if (activeSession?.status === 'active') {
      return {
        success: false,
        message: `You already have an active session in ${formatCompartmentLabel(
          activeSession.slotNumber
        )}. Retrieve your item and end your session before availing another compartment.`,
      };
    }

    const slotToBook =
      (selectedSlot &&
      selectedSlot.status === 'available' &&
      selectedSlot.category === selectedService
        ? selectedSlot
        : null) ||
      selectedStation.slots.find(
        (s) => s.status === 'available' && s.category === selectedService
      );
    if (!slotToBook) {
      return {
        success: false,
        message: `No free ${selectedService} compartments are available.`,
      };
    }
    const activeTier =
      selectedTier.serviceType === selectedService
        ? selectedTier
        : getDefaultTierForService(selectedService);
    const fee = activeTier.fee;

    if (paymentMethod === 'wallet') {
      if (student.walletBalance < fee) {
        return {
          success: false,
          message: `Insufficient campus e-wallet balance (₱${student.walletBalance.toFixed(
            2
          )}). Please top up or choose GCash/Maya.`,
        };
      }
    }

    let newSession: ActiveSession = {
      sessionId: `USTP-SES-${Math.floor(10000 + Math.random() * 90000)}`,
      stationId: selectedStation.id,
      stationName: selectedStation.name,
      building: selectedStation.building,
      slotNumber: slotToBook.slotNumber,
      serviceType: activeTier.serviceType,
      pricingTier: activeTier.name,
      startTime: Date.now(),
      durationMinutes: activeTier.durationMinutes,
      remainingSeconds: activeTier.durationMinutes * 60,
      totalFee: fee,
      batteryInitial: 38,
      batteryCurrent: 38,
      chargingRateWatts: activeTier.serviceType === 'storage' ? 0 : 58.4,
      lockerTemperature: 28.6,
      isOverchargeProtectionActive: true,
      isTamperAlertArmed: true,
      status: 'active',
      qrVerificationCode:
        qrCode ||
        `${selectedStation.campusCode}-SLOT${formatCompartmentCode(slotToBook.slotNumber)}-AUTH`,
    };

    if (isBackendSessionRef.current) {
      try {
        const data = await authorizedFetch('/api/sessions/start', {
          method: 'POST',
          body: JSON.stringify({
            session: newSession,
            deductWalletAmount: paymentMethod === 'wallet' ? fee : 0,
          }),
        });
        if (data?.session) newSession = data.session as ActiveSession;
        if (data?.user) {
          const updatedUser = data.user as UserAccount;
          setCurrentUser(updatedUser);
          setUsers((prev) =>
            prev.map((user) => (user.id === updatedUser.id ? updatedUser : user))
          );
        }
        if (Array.isArray(data?.stations) && data.stations.length > 0) {
          const nextStations = data.stations as KioskStation[];
          setStations(nextStations);
          setSelectedStation(
            (prev) => nextStations.find((station) => station.id === prev.id) || nextStations[0]
          );
        }
      } catch (error: unknown) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unable to start locker session.',
        };
      }
    } else if (paymentMethod === 'wallet') {
      updateCurrentUserState((user) => ({ ...user, walletBalance: user.walletBalance - fee }));
    }

    sound.playSolenoidRelease();
    setTimeout(() => {
      sound.playChargingConnected();
    }, 450);

    if (!isBackendSessionRef.current) {
      setStations((prevStations) =>
        prevStations.map((station) => {
          if (station.id !== selectedStation.id) return station;
          const updatedSlots = station.slots.map((slot) =>
            slot.slotNumber === slotToBook.slotNumber
              ? { ...slot, status: 'in_use' as const, isDoorOpen: true, isLocked: false }
              : slot
          );
          return {
            ...station,
            slots: updatedSlots,
            availableSlots: updatedSlots.filter((slot) => slot.status === 'available').length,
          };
        })
      );
    }

    setHardwareKioskStationId(selectedStation.id);
    setIsKioskDoorOpen(true);
    setActiveKioskSlotReleased(slotToBook.slotNumber);
    setActiveSessionForCurrentUser(newSession);
    notifyStationSync();

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#5BC496', '#4E6E81', '#FFFFFF'],
    });

    return {
      success: true,
      message: `${formatCompartmentLabel(
        slotToBook.slotNumber
      )} Solenoid Unlatched! Please place your belongings inside.`,
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
      date: formatSessionDateTime(new Date()),
      stationName: activeSession.stationName,
      slotNumber: activeSession.slotNumber,
      durationMinutes: activeSession.durationMinutes,
      totalFee: activeSession.totalFee,
      serviceType: activeSession.serviceType,
      pricingTier: activeSession.pricingTier,
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

    if (isBackendSessionRef.current) {
      authorizedFetch('/api/sessions/end', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: activeSession.sessionId,
          stationId: activeSession.stationId,
          slotNumber: activeSession.slotNumber,
          receiptNumber: historyEntry.receiptNumber,
          dateLabel: historyEntry.date,
        }),
      })
        .then((data) => {
          if (Array.isArray(data?.stations) && data.stations.length > 0) {
            const nextStations = data.stations as KioskStation[];
            setStations(nextStations);
            setSelectedStation(
              (prev) => nextStations.find((s) => s.id === prev.id) || nextStations[0]
            );
          }
          notifyStationSync();
        })
        .catch((err) => console.error('End session sync failed:', err));
    }

    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#5BC496', '#4E6E81', '#FFFFFF'],
    });

    return {
      success: true,
      message: `${formatCompartmentLabel(
        historyEntry.slotNumber
      )} unlocked! Please retrieve your device. Thank you for using UniCharge USTP!`,
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

    if (isBackendSessionRef.current || !currentUser) {
      publicKioskFetch('/api/kiosk/door-state', {
        method: 'POST',
        body: JSON.stringify({
          stationId: hardwareKioskStationId,
          slotNumber,
          isDoorOpen: false,
        }),
      })
        .then((data) => {
          if (Array.isArray(data?.stations) && data.stations.length > 0) {
            const nextStations = data.stations as KioskStation[];
            setStations(nextStations);
            setSelectedStation(
              (prev) => nextStations.find((s) => s.id === prev.id) || nextStations[0]
            );
          }
          notifyStationSync();
        })
        .catch((err) => console.error('Close door sync failed:', err));
    }
  };

  const topUpWallet = async (
    amount: number,
    options?: {
      source?: 'wallet' | 'gcash' | 'maya' | 'gotyme';
      referenceCode?: string;
    }
  ): Promise<{ success: boolean; message: string; referenceCode?: string }> => {
    sound.playTap();
    const source =
      options?.source === 'gcash' || options?.source === 'maya' || options?.source === 'gotyme'
        ? options.source
        : 'wallet';
    const prefix =
      source === 'gcash'
        ? 'GCASH'
        : source === 'maya'
        ? 'MAYA'
        : source === 'gotyme'
        ? 'GOTYME'
        : 'WLT';
    const platformLabel =
      source === 'gcash'
        ? 'GCash'
        : source === 'maya'
        ? 'Maya'
        : source === 'gotyme'
        ? 'GoTyme Bank'
        : 'Campus E-Wallet';
    const cleanRef =
      options?.referenceCode?.trim() || `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

    if (!Number.isFinite(amount) || amount < 10 || amount > 5000) {
      return { success: false, message: 'Reload amount must be between ₱10 and ₱5,000.' };
    }

    if (isBackendSessionRef.current) {
      try {
        const data = await authorizedFetch('/api/wallet/topup', {
          method: 'POST',
          body: JSON.stringify({ amount, source, referenceCode: cleanRef }),
        });
        if (data?.user) {
          const updatedUser = data.user as UserAccount;
          setCurrentUser(updatedUser);
          setUsers((prev) =>
            prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
          );
          if (Array.isArray(data.walletTransactions)) {
            setWalletTxByUserId((prevMap) => ({
              ...prevMap,
              [updatedUser.id]: data.walletTransactions as WalletTransaction[],
            }));
          }
        }
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#5BC496', '#4E6E81'],
        });
        return {
          success: true,
          referenceCode: cleanRef,
          message: `₱${amount.toFixed(2)} credited via ${platformLabel} (Ref ${cleanRef}).`,
        };
      } catch (err: unknown) {
        return {
          success: false,
          message: err instanceof Error ? err.message : 'Wallet reload failed.',
        };
      }
    }

    const nextBalance = +(student.walletBalance + amount).toFixed(2);
    updateCurrentUserState((u) => ({ ...u, walletBalance: nextBalance }));
    if (currentUser) {
      const uid = currentUser.id;
      const nowMs = Date.now();
      const localTx: WalletTransaction = {
        id: `WLT-${nowMs}`,
        txId: `WLT-${nowMs}`,
        userUid: uid,
        kind: 'reload',
        paymentSource: source,
        title: `Campus E-Wallet Reload (${platformLabel})`,
        referenceCode: cleanRef,
        amount,
        walletDelta: amount,
        balanceAfter: nextBalance,
        date: formatSessionDateTime(new Date(nowMs)),
        createdAtMs: nowMs,
      };
      setWalletTxByUserId((prevMap) => ({
        ...prevMap,
        [uid]: [localTx, ...(prevMap[uid] ?? [])],
      }));
    }
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#5BC496', '#4E6E81'],
    });
    return {
      success: true,
      referenceCode: cleanRef,
      message: `₱${amount.toFixed(2)} credited via ${platformLabel} (Ref ${cleanRef}).`,
    };
  };

  const toggleBiometrics = () => {
    sound.playTap();
    const next = !student.biometricEnabled;
    updateCurrentUserState((u) => ({ ...u, biometricEnabled: next }));
    if (isBackendSessionRef.current) {
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
    if (isBackendSessionRef.current) {
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
    if (isBackendSessionRef.current) {
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
    if (isBackendSessionRef.current) {
      authorizedFetch('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }).catch((err) => console.error('Profile sync failed:', err));
    }
  };

  const pushNotificationEvent = useCallback(
    async (input: CreateNotificationInput) => {
      if (isFirestoreLive) {
        try {
          const wrote = await createFirestoreNotification(input);
          if (wrote) return;
        } catch (err) {
          console.error('Failed to persist notification to Firestore:', err);
          setFirestoreError(err instanceof Error ? err.message : String(err));
        }
      }

      const fallbackNotif: DashboardNotification = {
        id: input.id,
        userUid: currentUser?.id || 'local-user',
        sessionId: input.sessionId,
        stationId: input.stationId,
        stationCode: input.stationCode,
        stationName: input.stationName,
        slotNumber: input.slotNumber,
        type: input.type,
        severity: input.severity,
        title: input.title,
        message: input.message,
        read: false,
        createdAtMs: Date.now(),
        source: 'local',
      };

      if (fallbackNotif.type === 'unexpected_door_open') {
        sound.playTamperAlarm();
      } else {
        sound.playChargingConnected();
      }

      setNotifications((prev) => {
        if (prev.some((n) => n.id === fallbackNotif.id)) return prev;
        return [fallbackNotif, ...prev];
      });
      setLiveToastNotifications((prev) => {
        if (prev.some((n) => n.id === fallbackNotif.id)) return prev;
        return [fallbackNotif, ...prev].slice(0, 4);
      });
    },
    [currentUser?.id, isFirestoreLive]
  );

  // Automatic real-time Firestore alert when active session reaches 100% battery
  useEffect(() => {
    if (!activeSession || !currentUser) return;
    if (activeSession.batteryCurrent < 100) return;
    if (notifiedChargeSessionsRef.current.has(activeSession.sessionId)) return;

    notifiedChargeSessionsRef.current.add(activeSession.sessionId);
    const station = stations.find((s) => s.id === activeSession.stationId);
    const stationCode = station?.campusCode || UNICHARGE_STATION_CODE;

    void pushNotificationEvent({
      id: `chg_${activeSession.sessionId}`,
      sessionId: activeSession.sessionId,
      stationId: activeSession.stationId,
      stationCode,
      stationName: activeSession.stationName,
      slotNumber: activeSession.slotNumber,
      type: 'charge_complete',
      severity: 'info',
      title: 'Device Fully Charged (100%)',
      message: `${formatCompartmentLabel(activeSession.slotNumber)} at ${
        activeSession.stationName
      } has reached 100%. Overcharge auto cut-off is protecting your battery — retrieve your device anytime.`,
    });
  }, [activeSession, currentUser, pushNotificationEvent, stations]);

  const dismissLiveToast = useCallback((id: string) => {
    setLiveToastNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const markNotificationRead = useCallback(
    async (id: string) => {
      setLiveToastNotifications((prev) => prev.filter((item) => item.id !== id));
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
      if (isFirestoreLive) {
        try {
          await markFirestoreNotificationRead(id);
        } catch (err) {
          console.error('Mark notification read failed:', err);
        }
      }
    },
    [isFirestoreLive]
  );

  const markAllNotificationsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    setLiveToastNotifications([]);
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    if (isFirestoreLive && unread.length > 0) {
      await Promise.allSettled(unread.map((item) => markFirestoreNotificationRead(item.id)));
    }
  }, [isFirestoreLive, notifications]);

  const deleteNotification = useCallback(
    async (id: string) => {
      setLiveToastNotifications((prev) => prev.filter((item) => item.id !== id));
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      if (isFirestoreLive) {
        try {
          await deleteFirestoreNotification(id);
        } catch (err) {
          console.error('Delete notification failed:', err);
        }
      }
    },
    [isFirestoreLive]
  );

  const simulateFullCharge = async () => {
    if (!activeSession || !currentUser) return;
    sound.playChargingConnected();
    setActiveSessionForCurrentUser((prev) =>
      prev
        ? {
            ...prev,
            batteryCurrent: 100,
            chargingRateWatts: 0,
            status: 'completed',
          }
        : null
    );
  };

  const triggerUnexpectedDoorOpen = async (stationId?: string, slotNumber?: number) => {
    const targetStationId =
      stationId || activeSession?.stationId || hardwareKioskStationId || stations[0]?.id;
    const targetStation = stations.find((s) => s.id === targetStationId) || stations[0];
    const targetSlotNumber =
      slotNumber ||
      activeSession?.slotNumber ||
      targetStation?.slots.find((s) => s.status === 'in_use')?.slotNumber ||
      1;
    const targetSessionId =
      activeSession?.sessionId || `SES_${targetStation?.campusCode || 'KIOSK'}_${targetSlotNumber}`;

    sound.playTamperAlarm();
    setHardwareKioskStationId(targetStationId);
    setIsKioskDoorOpen(true);
    setActiveKioskSlotReleased(targetSlotNumber);

    setStations((prev) =>
      prev.map((st) => {
        if (st.id !== targetStationId) return st;
        return {
          ...st,
          slots: st.slots.map((s) =>
            s.slotNumber === targetSlotNumber
              ? { ...s, isDoorOpen: true, isLocked: false }
              : s
          ),
        };
      })
    );

    if (activeSession) {
      setActiveSessionForCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              isTamperAlertArmed: true,
              lockerTemperature: +(prev.lockerTemperature + 2.4).toFixed(1),
            }
          : null
      );
    }

    setSecurityAlerts((prev) => [
      {
        id: `alt-${Date.now()}`,
        timestamp: formatSessionDateTime(new Date()),
        stationCode: targetStation?.campusCode || UNICHARGE_STATION_CODE,
        stationName: targetStation?.name || UNICHARGE_STATION_NAME,
        slotNumber: targetSlotNumber,
        severity: 'critical',
        type: 'Tamper Vibration',
        message: `Unexpected door opening detected on ${formatCompartmentLabel(
          targetSlotNumber
        )} without QR/PIN retrieval authorization.`,
        resolved: false,
      },
      ...prev,
    ]);

    if (isBackendSessionRef.current || !currentUser) {
      publicKioskFetch('/api/kiosk/tamper-alert', {
        method: 'POST',
        body: JSON.stringify({
          stationId: targetStationId,
          slotNumber: targetSlotNumber,
        }),
      })
        .then((data) => {
          if (Array.isArray(data?.stations) && data.stations.length > 0) {
            const nextStations = data.stations as KioskStation[];
            setStations(nextStations);
            setSelectedStation(
              (prev) => nextStations.find((s) => s.id === prev.id) || nextStations[0]
            );
          }
          if (Array.isArray(data?.securityAlerts)) {
            setSecurityAlerts(data.securityAlerts as SecurityAlert[]);
          }
          notifyStationSync();
        })
        .catch((err) => console.error('Tamper alert persistence failed:', err));
    }

    await pushNotificationEvent({
      id: `door_${targetSessionId}_${Date.now()}`,
      sessionId: targetSessionId,
      stationId: targetStationId,
      stationCode: targetStation?.campusCode || UNICHARGE_STATION_CODE,
      stationName: targetStation?.name || UNICHARGE_STATION_NAME,
      slotNumber: targetSlotNumber,
      type: 'unexpected_door_open',
      severity: 'critical',
      title: 'Locker Door Opened Unexpectedly!',
      message: `${formatCompartmentLabel(targetSlotNumber)} at ${
        targetStation?.name || UNICHARGE_STATION_NAME
      } unlatched without authorization. Check your device or tap Kiosk Scanner immediately.`,
    });
  };

  const triggerSimulatedTamper = () => {
    void triggerUnexpectedDoorOpen(activeSession?.stationId, activeSession?.slotNumber);
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

    if (isBackendSessionRef.current) {
      authorizedFetch('/api/admin/slots/update', {
        method: 'POST',
        body: JSON.stringify({
          stationId,
          slotNumber,
          status: 'available',
          isDoorOpen: true,
          isLocked: false,
        }),
      })
        .then((data) => {
          if (Array.isArray(data?.stations) && data.stations.length > 0) {
            const nextStations = data.stations as KioskStation[];
            setStations(nextStations);
            setSelectedStation(
              (prev) => nextStations.find((s) => s.id === prev.id) || nextStations[0]
            );
          }
          notifyStationSync();
        })
        .catch((err) => console.error('Admin unlock sync failed:', err));
    }
  };

  const adminToggleSlotMaintenance = async (
    stationId: string,
    slotNumber: number
  ): Promise<{ success: boolean; message?: string }> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Admin privileges required.' };
    }
    sound.playTap();

    const targetStation = stations.find((st) => st.id === stationId);
    const currentSlot = targetStation?.slots.find((s) => s.slotNumber === slotNumber);
    if (!currentSlot) {
      return { success: false, message: 'Compartment not found.' };
    }
    if (currentSlot.status === 'in_use') {
      return {
        success: false,
        message: `${formatCompartmentLabel(
          slotNumber
        )} currently has an active session. Force Unlock it first before enabling Maintenance.`,
      };
    }

    const nextStatus: LockerSlot['status'] =
      currentSlot.status === 'maintenance' ? 'available' : 'maintenance';

    setStations((prev) =>
      prev.map((st) => {
        if (st.id !== stationId) return st;
        const updatedSlots = st.slots.map((s) =>
          s.slotNumber === slotNumber
            ? { ...s, status: nextStatus, isDoorOpen: false, isLocked: true }
            : s
        );
        return {
          ...st,
          slots: updatedSlots,
          availableSlots: updatedSlots.filter((s) => s.status === 'available').length,
        };
      })
    );

    if (isBackendSessionRef.current) {
      try {
        const data = await authorizedFetch('/api/admin/slots/update', {
          method: 'POST',
          body: JSON.stringify({
            stationId,
            slotNumber,
            status: nextStatus,
            isDoorOpen: false,
            isLocked: true,
          }),
        });
        if (Array.isArray(data?.stations) && data.stations.length > 0) {
          const nextStations = data.stations as KioskStation[];
          setStations(nextStations);
          setSelectedStation(
            (prev) => nextStations.find((s) => s.id === prev.id) || nextStations[0]
          );
        }
        notifyStationSync();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update compartment status.';
        console.error('Admin maintenance sync failed:', err);
        void syncStationState();
        return { success: false, message };
      }
    }

    return {
      success: true,
      message: `${formatCompartmentLabel(slotNumber)} ${
        nextStatus === 'maintenance' ? 'locked for maintenance.' : 'restored to available.'
      }`,
    };
  };

  const adminProvisionStaff = async ({
    name,
    email,
    staffId,
    password,
  }: {
    name: string;
    email: string;
    staffId: string;
    password: string;
  }): Promise<AuthResult> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin role required.' };
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim() || !cleanEmail || !staffId.trim() || !password) {
      return { success: false, error: 'All staff provisioning fields are required.' };
    }

    try {
      const data = await authorizedFetch('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: cleanEmail,
          staffId: staffId.trim(),
          password,
        }),
      });
      if (data?.user) {
        const created = data.user as UserAccount;
        setUsers((prev) => [
          created,
          ...prev.filter((u) => u.id !== created.id && u.email !== created.email),
        ]);
        return { success: true, user: created };
      }
      return { success: false, error: 'Session expired. Please sign in again.' };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to provision staff account.';
      return { success: false, error: message };
    }
  };


  const resolveSecurityAlert = (alertId: string) => {
    if (currentUser?.role !== 'admin') return;
    sound.playTap();
    setSecurityAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, resolved: true } : a))
    );
    if (isBackendSessionRef.current) {
      authorizedFetch('/api/admin/alerts/resolve', {
        method: 'POST',
        body: JSON.stringify({ alertId }),
      })
        .then((data) => {
          if (Array.isArray(data?.securityAlerts)) {
            setSecurityAlerts(data.securityAlerts as SecurityAlert[]);
          }
          notifyStationSync();
        })
        .catch((err) => console.error('Admin alert sync failed:', err));
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
        selectedTier,
        selectedDuration,
        activeSession,
        pendingUnlockToken,
        pendingSecondsLeft,
        reservationTimeoutMessage,
        clearReservationTimeout,
        sessionHistory,
        walletTransactions,
        securityAlerts,
        adminStationActivity,
        hardwareKioskStationId,
        isKioskDoorOpen,
        activeKioskSlotReleased,
        loginWithAccount,
        loginWithGoogle,
        completeGoogleOnboarding,
        loginDemoByEmail,
        sendSignupVerificationCode,
        registerStudentAccount,
        sendPasswordResetCode,
        resetPasswordWithCode,
        loginDemo,
        loginWithCredentials,
        logout,
        setSelectedStation,
        setSelectedSlot,
        setSelectedService,
        setSelectedTier,
        setSelectedDuration,
        calculateFee,
        generateUnlockToken,
        regenerateUnlockToken,
        resendUnlockQrEmail,
        cancelPendingUnlock,
        verifyKioskUnlock,
        unlockViaCoinWalkUp,
        unlockStationViaQr,
        endActiveSession,
        topUpWallet,
        toggleBiometrics,
        togglePushNotifications,
        toggleOverchargeProtection,
        updateUserProfile,
        closeKioskDoor,
        triggerSimulatedTamper,
        simulateFullCharge,
        triggerUnexpectedDoorOpen,
        setHardwareKioskStationId,
        notifications,
        liveToastNotifications,
        unreadNotificationCount: notifications.filter((n) => !n.read).length,
        isFirestoreLive,
        firestoreError,
        dismissLiveToast,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
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
