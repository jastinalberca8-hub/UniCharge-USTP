export type UserRole = 'student' | 'admin';

export type LockerCategory = 'charging' | 'storage';

export type LockerStatus = 'available' | 'in_use' | 'maintenance';

export type ServiceType = 'charging' | 'storage';

export type PricingTierId =
  | 'charging-short'
  | 'charging-long'
  | 'storage-short'
  | 'storage-medium'
  | 'storage-long'
  | 'storage-extended-long';

export interface PricingTier {
  id: PricingTierId;
  name: string;
  serviceType: ServiceType;
  durationLabel: string;
  durationMinutes: number;
  fee: number;
  description: string;
}

export interface LockerSlot {
  id: string;
  slotNumber: number;
  code: string;
  category: LockerCategory;
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

export type PaymentMethod = 'wallet' | 'gcash' | 'maya' | 'gotyme' | 'cash';

export interface PendingUnlockToken {
  tokenId: string;
  stationId: string;
  stationName: string;
  stationCode: string;
  slotNumber: number;
  serviceType: ServiceType;
  pricingTier: string;
  durationMinutes: number;
  totalFee: number;
  paymentMethod: PaymentMethod;
  qrPayload: string;
  pinCode: string;
  createdAt: number;
  expiresAt: number;
  emailSent?: boolean;
  emailSentTo?: string;
  emailSentFrom?: string;
  emailDeliveryMode?: 'smtp' | 'resend' | 'ethereal';
  emailError?: string;
  emailPreviewUrl?: string;
}

export interface ActiveSession {
  sessionId: string;
  stationId: string;
  stationName: string;
  building: string;
  slotNumber: number;
  serviceType: ServiceType;
  pricingTier: string;
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
  preferredPayment: 'wallet' | 'gcash' | 'maya' | 'gotyme';
  emailVerified?: boolean;
  profileCompleted?: boolean;
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
  pricingTier: string;
  paymentMethod?: PaymentMethod | string;
  status: 'Completed' | 'Refunded';
}

export type WalletTransactionKind =
  | 'reload'
  | 'coin_change'
  | 'ewallet_payment'
  | 'coin_payment';

export type WalletTransactionSource =
  | 'wallet'
  | 'gcash'
  | 'maya'
  | 'gotyme'
  | 'cash'
  | 'coin_change';

export interface WalletTransaction {
  id: string;
  txId: string;
  userUid: string;
  kind: WalletTransactionKind;
  paymentSource: WalletTransactionSource;
  title: string;
  referenceCode: string;
  amount: number;
  walletDelta: number;
  balanceAfter: number;
  date: string;
  createdAtMs: number;
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

export type DashboardNotificationType = 'charge_complete' | 'unexpected_door_open';

export type DashboardNotificationSeverity = 'info' | 'critical';

export interface DashboardNotification {
  id: string;
  userUid: string;
  sessionId: string;
  stationId: string;
  stationCode: string;
  stationName: string;
  slotNumber: number;
  type: DashboardNotificationType;
  severity: DashboardNotificationSeverity;
  title: string;
  message: string;
  read: boolean;
  createdAtMs: number;
  source?: 'firestore' | 'local';
}

export interface AdminStationTransaction {
  id: string;
  kind: 'reserved' | 'active' | 'expired' | 'completed';
  userUid: string | null;
  userName: string;
  studentIdNumber: string;
  slotNumber: number;
  serviceType: ServiceType;
  pricingTier: string;
  totalFee: number;
  paymentMethod?: string;
  createdAtMs: number;
  expiresAtMs?: number;
  remainingSeconds?: number;
}

export interface AdminStationActivity {
  activeSessions: AdminStationTransaction[];
  pendingReservations: AdminStationTransaction[];
  recentTransactions: AdminStationTransaction[];
}
