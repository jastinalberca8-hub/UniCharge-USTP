import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  name: text('name').notNull(),
  studentIdNumber: text('student_id_number').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('student'),
  college: text('college')
    .notNull()
    .default('College of Information Technology and Computing (CITC)'),
  degree: text('degree').notNull().default('BS Information Technology'),
  avatar: text('avatar').notNull().default(''),
  walletBalance: doublePrecision('wallet_balance').notNull().default(0),
  biometricEnabled: boolean('biometric_enabled').notNull().default(false),
  pushNotifications: boolean('push_notifications').notNull().default(true),
  overchargeAlerts: boolean('overcharge_alerts').notNull().default(true),
  preferredPayment: text('preferred_payment').notNull().default('wallet'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const stations = pgTable('stations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  campusCode: text('campus_code').notNull(),
  building: text('building').notNull(),
  floor: text('floor').notNull(),
  walkMinutes: integer('walk_minutes').notNull(),
  distanceMeters: integer('distance_meters').notNull(),
  totalSlots: integer('total_slots').notNull().default(8),
  online: boolean('online').notNull().default(true),
  powerDrawWatts: integer('power_draw_watts').notNull().default(200),
  mapX: integer('map_x').notNull().default(50),
  mapY: integer('map_y').notNull().default(50),
  lat: doublePrecision('lat').notNull().default(8.4855),
  lng: doublePrecision('lng').notNull().default(124.6565),
  image: text('image').notNull().default('/src/assets/images/smart_locker_station_1794365237708.jpg'),
  isPopular: boolean('is_popular').notNull().default(false),
});

export const lockerSlots = pgTable('locker_slots', {
  id: text('id').primaryKey(),
  stationId: text('station_id')
    .references(() => stations.id)
    .notNull(),
  slotNumber: integer('slot_number').notNull(),
  size: text('size').notNull(),
  status: text('status').notNull().default('available'),
  chargingPower: text('charging_power').notNull(),
  currentTemp: doublePrecision('current_temp').notNull().default(28.0),
  isDoorOpen: boolean('is_door_open').notNull().default(false),
  isLocked: boolean('is_locked').notNull().default(true),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull().unique(),
  userUid: text('user_uid')
    .references(() => users.uid)
    .notNull(),
  stationId: text('station_id').notNull(),
  stationName: text('station_name').notNull(),
  building: text('building').notNull(),
  slotNumber: integer('slot_number').notNull(),
  serviceType: text('service_type').notNull(),
  compartmentSize: text('compartment_size').notNull(),
  startTimeMs: doublePrecision('start_time_ms').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  remainingSeconds: integer('remaining_seconds').notNull(),
  totalFee: doublePrecision('total_fee').notNull(),
  batteryInitial: integer('battery_initial').notNull(),
  batteryCurrent: integer('battery_current').notNull(),
  chargingRateWatts: doublePrecision('charging_rate_watts').notNull(),
  lockerTemperature: doublePrecision('locker_temperature').notNull(),
  isOverchargeProtectionActive: boolean('is_overcharge_protection_active')
    .notNull()
    .default(true),
  isTamperAlertArmed: boolean('is_tamper_alert_armed').notNull().default(true),
  status: text('status').notNull().default('active'),
  qrVerificationCode: text('qr_verification_code').notNull(),
  receiptNumber: text('receipt_number'),
  dateLabel: text('date_label'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const securityAlerts = pgTable('security_alerts', {
  id: text('id').primaryKey(),
  timestampLabel: text('timestamp_label').notNull(),
  stationCode: text('station_code').notNull(),
  stationName: text('station_name').notNull(),
  slotNumber: integer('slot_number').notNull(),
  severity: text('severity').notNull(),
  type: text('type').notNull(),
  message: text('message').notNull(),
  resolved: boolean('resolved').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const stationsRelations = relations(stations, ({ many }) => ({
  slots: many(lockerSlots),
}));

export const lockerSlotsRelations = relations(lockerSlots, ({ one }) => ({
  station: one(stations, {
    fields: [lockerSlots.stationId],
    references: [stations.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userUid],
    references: [users.uid],
  }),
}));
