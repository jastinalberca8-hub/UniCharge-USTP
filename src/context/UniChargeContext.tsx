import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  LockerStation,
  LockerCompartment,
  StudentUser,
  AdminUser,
  TransactionRecord,
  TamperAlertEvent,
  PaymentMethod,
  ActiveSession,
  AuthRole,
  StudentTab,
  AdminTab,
} from '../types';
import {
  INITIAL_STATIONS,
  INITIAL_STUDENTS,
  INITIAL_ADMIN,
  INITIAL_TRANSACTIONS,
  INITIAL_ALERTS,
} from '../data/mockData';

export type AppRoute = 'login' | 'signup' | 'forgot-password' | 'student-dashboard' | 'admin-dashboard';

interface UniChargeContextType {
  // Routing & Authentication
  currentRoute: AppRoute;
  setCurrentRoute: (route: AppRoute) => void;
  authRole: AuthRole;
  setAuthRole: (role: AuthRole) => void;
  activeStudentTab: StudentTab;
  setActiveStudentTab: (tab: StudentTab) => void;
  activeAdminTab: AdminTab;
  setActiveAdminTab: (tab: AdminTab) => void;
  
  // Users
  currentUser: StudentUser;
  setCurrentUser: (u: StudentUser) => void;
  currentAdmin: AdminUser;
  studentsList: StudentUser[];
  
  // Auth Handlers
  loginAsStudent: (emailOrId: string) => boolean;
  loginAsAdmin: (emailOrId: string) => boolean;
  signUpStudent: (data: { name: string; studentId: string; college: string; email: string }) => void;
  logout: () => void;
  
  // Data State
  stations: LockerStation[];
  activeStationId: string;
  setActiveStationId: (id: string) => void;
  selectedStation: LockerStation;
  selectedCompartment: LockerCompartment | null;
  setSelectedCompartment: (c: LockerCompartment | null) => void;
  transactions: TransactionRecord[];
  alerts: TamperAlertEvent[];

  // Compatibility
  currentView: string;
  setCurrentView: (v: any) => void;
  theme: string;
  toggleTheme: () => void;
  
  // Modals
  isKioskModalOpen: boolean;
  setIsKioskModalOpen: (open: boolean) => void;
  kioskInitialStationId: string;
  setKioskInitialStationId: (id: string) => void;
  isBookingModalOpen: boolean;
  setIsBookingModalOpen: (open: boolean) => void;
  bookingTarget: { stationId: string; compartmentNumber: number } | null;
  setBookingTarget: (target: { stationId: string; compartmentNumber: number } | null) => void;
  receiptModalData: TransactionRecord | null;
  setReceiptModalData: (txn: TransactionRecord | null) => void;
  
  // Actions
  bookLocker: (
    stationId: string,
    compartmentNumber: number,
    durationHours: number,
    paymentMethod: PaymentMethod,
    deviceType?: string
  ) => { success: boolean; qrToken: string; pinCode: string; message: string };
  extendSession: (compartmentId: string, additionalMinutes: number) => { success: boolean; message: string };
  unlockAndEndSession: (compartmentId: string) => { success: boolean; message: string };
  topUpWallet: (amount: number, method: string) => void;
  remoteForceUnlock: (compartmentId: string, adminKey: string) => { success: boolean; message: string };
  resolveAlert: (alertId: string, resolvedBy: string) => void;
  toggleStationMaintenance: (stationId: string) => void;
  toggleCompartmentMaintenance: (stationId: string, compartmentNumber: number) => void;
  insertCoinAtKiosk: (stationId: string, coinValue: number) => void;
  emptyCoinHopper: (stationId: string) => void;
  rebootStationGateway: (stationId: string) => void;
  emergencyFanOverride: (stationId: string) => void;
  
  // Computed
  activeUserSessions: { compartment: LockerCompartment; session: ActiveSession; station: LockerStation }[];
}

const UniChargeContext = createContext<UniChargeContextType | undefined>(undefined);

export const UniChargeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation & Auth
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('student-dashboard'); // default to student dashboard for immediate preview, user can logout to /login anytime
  const [authRole, setAuthRole] = useState<AuthRole>('student');
  const [activeStudentTab, setActiveStudentTab] = useState<StudentTab>('dashboard');
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('overview');

  // Users
  const [studentsList, setStudentsList] = useState<StudentUser[]>(INITIAL_STUDENTS);
  const [currentUser, setCurrentUser] = useState<StudentUser>(INITIAL_STUDENTS[0]); // Jastin Alberca
  const [currentAdmin] = useState<AdminUser>(INITIAL_ADMIN);

  // System Data
  const [stations, setStations] = useState<LockerStation[]>(INITIAL_STATIONS);
  const [activeStationId, setActiveStationId] = useState<string>('station-lib');
  const [selectedCompartment, setSelectedCompartment] = useState<LockerCompartment | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS);
  const [alerts, setAlerts] = useState<TamperAlertEvent[]>(INITIAL_ALERTS);

  // Modals
  const [isKioskModalOpen, setIsKioskModalOpen] = useState(false);
  const [kioskInitialStationId, setKioskInitialStationId] = useState('station-lib');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingTarget, setBookingTarget] = useState<{ stationId: string; compartmentNumber: number } | null>(null);
  const [receiptModalData, setReceiptModalData] = useState<TransactionRecord | null>(null);

  // Authentication logic
  const loginAsStudent = (emailOrId: string) => {
    const matched = studentsList.find(
      s => s.email.toLowerCase() === emailOrId.toLowerCase() || s.studentId === emailOrId
    );
    if (matched) {
      setCurrentUser(matched);
    } else {
      // Allow demo login
      setCurrentUser(INITIAL_STUDENTS[0]);
    }
    setAuthRole('student');
    setCurrentRoute('student-dashboard');
    setActiveStudentTab('dashboard');
    return true;
  };

  const loginAsAdmin = (_emailOrId: string) => {
    setAuthRole('admin');
    setCurrentRoute('admin-dashboard');
    setActiveAdminTab('overview');
    return true;
  };

  const signUpStudent = (data: { name: string; studentId: string; college: string; email: string }) => {
    const newStudent: StudentUser = {
      id: `user-${Date.now()}`,
      name: data.name,
      studentId: data.studentId,
      email: data.email,
      college: data.college,
      program: `${data.college} Student`,
      walletBalance: 150.0,
      campusCardRfid: `USTP-RFID-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    setStudentsList(prev => [newStudent, ...prev]);
    setCurrentUser(newStudent);
  };

  const logout = () => {
    setCurrentRoute('login');
  };

  // Periodic Telemetry Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setStations(prevStations =>
        prevStations.map(station => {
          const vJitter = (Math.random() - 0.5) * 0.4;
          const newVoltage = Math.round((station.voltage + vJitter) * 10) / 10;
          
          const updatedCompartments = station.compartments.map(comp => {
            if (comp.status === 'in_use' && comp.currentSession) {
              const pJitter = (Math.random() - 0.5) * 0.8;
              const newWatts = Math.max(5, Math.min(65, Math.round((comp.currentPowerDrawWatts + pJitter) * 10) / 10));
              const newTemp = Math.min(42, Math.round((comp.temperature + (Math.random() - 0.48) * 0.15) * 10) / 10);
              return {
                ...comp,
                currentPowerDrawWatts: newWatts,
                temperature: newTemp,
                currentSession: {
                  ...comp.currentSession,
                  currentWatts: newWatts,
                },
              };
            }
            return comp;
          });

          const avgTemp = Math.round((updatedCompartments.reduce((acc, c) => acc + c.temperature, 0) / updatedCompartments.length) * 10) / 10;

          return {
            ...station,
            voltage: newVoltage,
            temperature: avgTemp,
            compartments: updatedCompartments,
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const selectedStation = stations.find(s => s.id === activeStationId) || stations[0];

  const activeUserSessions = stations.flatMap(station =>
    station.compartments
      .filter(comp => comp.currentSession && comp.currentSession.userId === currentUser.id)
      .map(comp => ({
        compartment: comp,
        session: comp.currentSession!,
        station,
      }))
  );

  const bookLocker = (
    stationId: string,
    compartmentNumber: number,
    durationHours: number,
    paymentMethod: PaymentMethod,
    deviceType = 'Smart Device / Laptop'
  ) => {
    const station = stations.find(s => s.id === stationId);
    if (!station) return { success: false, qrToken: '', pinCode: '', message: 'Station not found.' };

    const comp = station.compartments.find(c => c.compartmentNumber === compartmentNumber);
    if (!comp) return { success: false, qrToken: '', pinCode: '', message: 'Compartment not found.' };

    if (comp.status !== 'available') {
      return { success: false, qrToken: '', pinCode: '', message: 'Locker is already in use or under maintenance.' };
    }

    const ratePerHour = comp.size === 'large' ? 15 : 10;
    const totalCost = ratePerHour * durationHours;

    if (paymentMethod === 'wallet' && currentUser.walletBalance < totalCost) {
      return {
        success: false,
        qrToken: '',
        pinCode: '',
        message: `Insufficient USTP E-Wallet balance. Required: ₱${totalCost.toFixed(2)}, Available: ₱${currentUser.walletBalance.toFixed(2)}. Please top up or use coins.`,
      };
    }

    const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
    const qrToken = `USTP-LOCKER-${comp.id}-SEC-${pinCode}`;
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    const baseWatts = comp.size === 'large' ? 55 : 25;

    const newSession: ActiveSession = {
      sessionId: `sess-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      studentId: currentUser.studentId,
      startTime,
      endTime,
      durationMinutes: durationHours * 60,
      pinCode,
      qrToken,
      paymentMethod,
      amountPaid: totalCost,
      currentWatts: baseWatts,
      voltage: station.voltage,
      deviceType,
    };

    setStations(prev =>
      prev.map(st => {
        if (st.id !== stationId) return st;
        return {
          ...st,
          digitalRevenue: paymentMethod === 'wallet' ? st.digitalRevenue + totalCost : st.digitalRevenue,
          coinRevenue: paymentMethod === 'coins' ? st.coinRevenue + totalCost : st.coinRevenue,
          coinHopperCount: paymentMethod === 'coins' ? Math.min(st.coinHopperCapacity, st.coinHopperCount + Math.floor(totalCost / 5)) : st.coinHopperCount,
          compartments: st.compartments.map(c => {
            if (c.compartmentNumber !== compartmentNumber) return c;
            return {
              ...c,
              status: 'in_use',
              lockStatus: 'locked',
              currentPowerDrawWatts: baseWatts,
              totalUsageCycles: c.totalUsageCycles + 1,
              currentSession: newSession,
            };
          }),
        };
      })
    );

    if (paymentMethod === 'wallet') {
      setCurrentUser(prev => ({
        ...prev,
        walletBalance: prev.walletBalance - totalCost,
      }));
    }

    const newTxn: TransactionRecord = {
      id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: 'Just now',
      stationId,
      stationName: station.name,
      compartmentNumber,
      durationMinutes: durationHours * 60,
      amount: totalCost,
      paymentMethod,
      status: 'active',
      receiptRef: `USTP-${paymentMethod.toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      description: `Locker #${compartmentNumber} (${durationHours}h Reservation)`,
    };
    setTransactions(prev => [newTxn, ...prev]);

    return {
      success: true,
      qrToken,
      pinCode,
      message: `Compartment #${compartmentNumber} reserved! Scan QR or use PIN ${pinCode} at kiosk to unlock.`,
    };
  };

  const extendSession = (compartmentId: string, additionalMinutes: number) => {
    const cost = (additionalMinutes / 60) * 10;
    if (currentUser.walletBalance < cost) {
      return { success: false, message: `Insufficient balance (₱${cost.toFixed(2)} needed). Please top up first.` };
    }

    let found = false;
    setStations(prev =>
      prev.map(st => ({
        ...st,
        digitalRevenue: st.digitalRevenue + cost,
        compartments: st.compartments.map(c => {
          if (c.id === compartmentId && c.currentSession) {
            found = true;
            const currentEnd = new Date(c.currentSession.endTime).getTime();
            const newEnd = new Date(currentEnd + additionalMinutes * 60 * 1000).toISOString();
            return {
              ...c,
              currentSession: {
                ...c.currentSession,
                endTime: newEnd,
                durationMinutes: c.currentSession.durationMinutes + additionalMinutes,
                amountPaid: c.currentSession.amountPaid + cost,
              },
            };
          }
          return c;
        }),
      }))
    );

    if (found) {
      setCurrentUser(prev => ({ ...prev, walletBalance: prev.walletBalance - cost }));
      return { success: true, message: `Session extended by +${additionalMinutes} mins. ₱${cost.toFixed(2)} deducted.` };
    }
    return { success: false, message: 'Active session not found.' };
  };

  const unlockAndEndSession = (compartmentId: string) => {
    let targetSession: ActiveSession | undefined;
    let targetStation: LockerStation | undefined;
    let targetComp: LockerCompartment | undefined;

    stations.forEach(st => {
      const c = st.compartments.find(comp => comp.id === compartmentId);
      if (c && c.currentSession) {
        targetComp = c;
        targetStation = st;
        targetSession = c.currentSession;
      }
    });

    if (!targetComp || !targetSession) {
      return { success: false, message: 'No active session found for this compartment.' };
    }

    setStations(prev =>
      prev.map(st => {
        if (st.id !== targetStation?.id) return st;
        return {
          ...st,
          compartments: st.compartments.map(c => {
            if (c.id !== compartmentId) return c;
            return {
              ...c,
              status: 'available',
              lockStatus: 'unlocked',
              currentPowerDrawWatts: 0,
              currentSession: undefined,
            };
          }),
        };
      })
    );

    setTransactions(prev =>
      prev.map(t =>
        t.compartmentNumber === targetComp?.compartmentNumber && t.stationId === targetStation?.id && t.status === 'active'
          ? { ...t, status: 'completed' }
          : t
      )
    );

    return {
      success: true,
      message: `Compartment ${targetComp.id} unlocked! Please retrieve your devices. Door latch reset to available.`,
    };
  };

  const topUpWallet = (amount: number, method: string) => {
    setCurrentUser(prev => ({
      ...prev,
      walletBalance: prev.walletBalance + amount,
    }));
    const newTxn: TransactionRecord = {
      id: `TOPUP-${Date.now().toString().slice(-5)}`,
      timestamp: 'Just now',
      stationId: 'ONLINE-PORTAL',
      stationName: `Online Top-up (${method})`,
      compartmentNumber: 0,
      durationMinutes: 0,
      amount,
      paymentMethod: 'wallet',
      status: 'completed',
      receiptRef: `USTP-TOP-${Date.now()}`,
      description: `E-Wallet Reload via ${method}`,
    };
    setTransactions(prev => [newTxn, ...prev]);
  };

  const remoteForceUnlock = (compartmentId: string, adminKey: string) => {
    if (!adminKey || adminKey.trim().length < 4) {
      return { success: false, message: 'Invalid Admin Security Authorization Key.' };
    }

    let found = false;
    let stationName = '';
    let compNum = 0;

    setStations(prev =>
      prev.map(st => {
        const c = st.compartments.find(comp => comp.id === compartmentId);
        if (c) {
          found = true;
          stationName = st.name;
          compNum = c.compartmentNumber;
          return {
            ...st,
            compartments: st.compartments.map(comp =>
              comp.id === compartmentId
                ? {
                    ...comp,
                    lockStatus: 'unlocked',
                    status: 'available',
                    currentPowerDrawWatts: 0,
                    currentSession: undefined,
                    tamperAlertMessage: undefined,
                  }
                : comp
            ),
          };
        }
        return st;
      })
    );

    if (found) {
      const newAlert: TamperAlertEvent = {
        id: `SEC-OVERRIDE-${Date.now()}`,
        timestamp: 'Just now',
        stationId: 'SYSTEM',
        stationName,
        compartmentId,
        compartmentNumber: compNum,
        severity: 'info',
        type: 'forced_door',
        message: `Remote force unlock executed by Campus Admin (${currentAdmin.name}). Door solenoid disengaged.`,
        isResolved: true,
        resolvedAt: 'Just now',
        resolvedBy: currentAdmin.name,
      };
      setAlerts(prev => [newAlert, ...prev]);

      return { success: true, message: `Emergency unlock command sent to ${compartmentId}. Solenoid released.` };
    }
    return { success: false, message: 'Compartment not found.' };
  };

  const resolveAlert = (alertId: string, resolvedBy: string) => {
    setAlerts(prev =>
      prev.map(a =>
        a.id === alertId
          ? {
              ...a,
              isResolved: true,
              resolvedAt: 'Just now',
              resolvedBy,
            }
          : a
      )
    );
  };

  const toggleStationMaintenance = (stationId: string) => {
    setStations(prev =>
      prev.map(st =>
        st.id === stationId
          ? {
              ...st,
              status: st.status === 'online' ? 'maintenance' : 'online',
            }
          : st
      )
    );
  };

  const toggleCompartmentMaintenance = (stationId: string, compartmentNumber: number) => {
    setStations(prev =>
      prev.map(st => {
        if (st.id !== stationId) return st;
        return {
          ...st,
          compartments: st.compartments.map(c =>
            c.compartmentNumber === compartmentNumber
              ? {
                  ...c,
                  status: c.status === 'maintenance' ? 'available' : 'maintenance',
                  lockStatus: 'locked',
                }
              : c
          ),
        };
      })
    );
  };

  const insertCoinAtKiosk = (stationId: string, coinValue: number) => {
    setStations(prev =>
      prev.map(st => {
        if (st.id !== stationId) return st;
        const newCount = Math.min(st.coinHopperCapacity, st.coinHopperCount + 1);
        return {
          ...st,
          coinRevenue: st.coinRevenue + coinValue,
          coinHopperCount: newCount,
        };
      })
    );
  };

  const emptyCoinHopper = (stationId: string) => {
    setStations(prev =>
      prev.map(st => {
        if (st.id !== stationId) return st;
        return {
          ...st,
          coinHopperCount: 0,
        };
      })
    );
  };

  const rebootStationGateway = (stationId: string) => {
    setStations(prev =>
      prev.map(st => {
        if (st.id !== stationId) return st;
        return {
          ...st,
          esp32Status: 'online',
          lastHeartbeat: 'Just rebooted',
        };
      })
    );
  };

  const emergencyFanOverride = (stationId: string) => {
    setStations(prev =>
      prev.map(st => {
        if (st.id !== stationId) return st;
        return {
          ...st,
          fanSpeedRpm: 3200,
          temperature: Math.max(24, st.temperature - 3.2),
        };
      })
    );
  };

  return (
    <UniChargeContext.Provider
      value={{
        currentRoute,
        setCurrentRoute,
        authRole,
        setAuthRole,
        activeStudentTab,
        setActiveStudentTab,
        activeAdminTab,
        setActiveAdminTab,
        currentUser,
        setCurrentUser,
        currentAdmin,
        studentsList,
        loginAsStudent,
        loginAsAdmin,
        signUpStudent,
        logout,
        stations,
        activeStationId,
        setActiveStationId,
        selectedStation,
        selectedCompartment,
        setSelectedCompartment,
        transactions,
        alerts,
        isKioskModalOpen,
        setIsKioskModalOpen,
        kioskInitialStationId,
        setKioskInitialStationId,
        isBookingModalOpen,
        setIsBookingModalOpen,
        bookingTarget,
        setBookingTarget,
        receiptModalData,
        setReceiptModalData,
        bookLocker,
        extendSession,
        unlockAndEndSession,
        topUpWallet,
        remoteForceUnlock,
        resolveAlert,
        toggleStationMaintenance,
        toggleCompartmentMaintenance,
        insertCoinAtKiosk,
        emptyCoinHopper,
        rebootStationGateway,
        emergencyFanOverride,
        activeUserSessions,
        currentView: currentRoute === 'student-dashboard' ? 'dashboard' : currentRoute === 'admin-dashboard' ? 'admin' : 'landing',
        setCurrentView: (v: any) => setCurrentRoute(v === 'dashboard' ? 'student-dashboard' : v === 'admin' ? 'admin-dashboard' : 'login'),
        theme: 'light',
        toggleTheme: () => {},
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
