export type LockerSize = 'standard' | 'large';
export type CompartmentStatus = 'available' | 'in_use' | 'tamper_alert' | 'maintenance';
export type LockState = 'locked' | 'unlocked';
export type PaymentMethod = 'wallet' | 'coins';
export type AuthRole = 'student' | 'admin';
export type AuthView = 'login' | 'signup' | 'forgot-password';
export type StudentTab = 'dashboard' | 'stations' | 'sessions' | 'wallet';
export type AdminTab = 'overview' | 'telemetry' | 'security' | 'revenue';

export interface ActiveSession {
  sessionId: string;
  userId: string;
  userName: string;
  studentId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  pinCode: string;
  qrToken: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  currentWatts: number;
  voltage: number;
  deviceType?: string;
}

export interface LockerCompartment {
  id: string; // e.g. "LIB-01"
  compartmentNumber: number;
  stationId: string;
  size: LockerSize;
  status: CompartmentStatus;
  lockStatus: LockState;
  currentPowerDrawWatts: number;
  temperature: number;
  totalUsageCycles: number;
  currentSession?: ActiveSession;
  tamperAlertMessage?: string;
}

export interface LockerStation {
  id: string;
  name: string;
  buildingCode: string;
  campusZone: string;
  locationDetails: string;
  status: 'online' | 'offline' | 'maintenance';
  voltage: number;
  temperature: number;
  fanSpeedRpm: number;
  coinHopperCount: number;
  coinHopperCapacity: number;
  digitalRevenue: number;
  coinRevenue: number;
  lastHeartbeat: string;
  ipAddress: string;
  esp32Status: 'online' | 'offline';
  outputStabilityPercent: number;
  relayArmed: boolean;
  compartments: LockerCompartment[];
}

export interface StudentUser {
  id: string;
  name: string;
  studentId: string;
  email: string;
  college: string;
  program: string;
  walletBalance: number;
  campusCardRfid: string;
  avatarUrl?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  department: string;
  role: string;
}

export interface TransactionRecord {
  id: string;
  timestamp: string;
  stationId: string;
  stationName: string;
  compartmentNumber: number;
  durationMinutes: number;
  amount: number;
  paymentMethod: PaymentMethod;
  status: 'completed' | 'active' | 'extended';
  receiptRef: string;
  description?: string;
}

export interface TamperAlertEvent {
  id: string;
  timestamp: string;
  stationId: string;
  stationName: string;
  compartmentId: string;
  compartmentNumber: number;
  severity: 'critical' | 'warning' | 'info';
  type: 'forced_door' | 'overheat' | 'overstay' | 'coin_jam' | 'voltage_surge';
  message: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}
