export type UserRole = 'student' | 'admin';

export type LockerSize = 'S' | 'M' | 'L';

export type LockerStatus = 'available' | 'in_use' | 'maintenance';

export type ServiceType = 'charging' | 'storage' | 'both';

export interface LockerSlot {
  id: string;
  slotNumber: number;
  size: LockerSize;
  status: LockerStatus;
  chargingPower: string;
  currentTemp: number;
  isDoorOpen: boolean;
  isLocked: boolean;
}

export interface KioskStation {
  id: string;
  name: string;
  campusCode: string;
  building: string;
  floor: string;
  walkMinutes: number;
  distanceMeters: number;
  totalSlots: number;
  availableSlots: number;
  slots: LockerSlot[];
  mapCoords: { x: number; y: number };
  coordinates: { lat: number; lng: number };
  image: string;
  isPopular?: boolean;
  online: boolean;
  powerDrawWatts: number;
}

export interface PendingUnlockToken {
  tokenId: string;
  stationId: string;
  stationName: string;
  stationCode: string;
  slotNumber: number;
  serviceType: ServiceType;
  compartmentSize: LockerSize;
  durationMinutes: number;
  totalFee: number;
  paymentMethod: 'wallet' | 'gcash' | 'maya' | 'cash';
  qrPayload: string;
  pinCode: string;
  createdAt: number;
  expiresAt: number;
}

export interface ActiveSession {
  sessionId: string;
  stationId: string;
  stationName: string;
  building: string;
  slotNumber: number;
  serviceType: ServiceType;
  compartmentSize: LockerSize;
  startTime: number;
  durationMinutes: number;
  remainingSeconds: number;
  totalFee: number;
  batteryInitial: number;
  batteryCurrent: number;
  chargingRateWatts: number;
  lockerTemperature: number;
  isOverchargeProtectionActive: boolean;
  isTamperAlertArmed: boolean;
  status: 'active' | 'completed' | 'retrieved';
  qrVerificationCode: string;
}

export interface UserAccount {
  id: string;
  name: string;
  studentIdNumber: string;
  email: string;
  password: string;
  role: UserRole;
  college: string;
  degree: string;
  avatar: string;
  walletBalance: number;
  biometricEnabled: boolean;
  pushNotifications: boolean;
  overchargeAlerts: boolean;
  preferredPayment: 'wallet' | 'gcash' | 'maya';
  createdAt: string;
}

export type StudentProfile = UserAccount;

export interface SessionHistoryItem {
  id: string;
  receiptNumber: string;
  date: string;
  stationName: string;
  slotNumber: number;
  durationMinutes: number;
  totalFee: number;
  serviceType: ServiceType;
  compartmentSize: LockerSize;
  status: 'Completed' | 'Refunded';
}

export interface SecurityAlert {
  id: string;
  timestamp: string;
  stationCode: string;
  stationName: string;
  slotNumber: number;
  severity: 'critical' | 'warning' | 'info';
  type: 'Tamper Vibration' | 'Thermal Threshold' | 'Maintenance' | 'Overcharge Cut-Off';
  message: string;
  resolved: boolean;
}
