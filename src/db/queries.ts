import crypto from 'node:crypto';
import { and, asc, desc, eq, gt, ilike, inArray, lte, ne, or, sql } from 'drizzle-orm';
import { db, pool } from './index.ts';
import {
  emailVerifications,
  lockerSlots,
  lockerUnlockTokens,
  securityAlerts,
  sessions,
  stations,
  users,
  walletTransactions,
} from './schema.ts';
import { SEED_SECURITY_ALERTS, SEED_STATIONS } from './seedData.ts';
import {
  ALLOWED_USTP_COLLEGE_VALUES,
  isCourseValidForCollege,
} from '../constants/colleges.ts';
import {
  UNICHARGE_STATION_CODE,
  UNICHARGE_STATION_ID,
  UNICHARGE_STATION_NAME,
  formatCompartmentCode,
  formatCompartmentLabel,
  getCompartmentCategory,
  normalizeServiceType,
  resolvePricingTier,
} from '../constants/pricing.ts';
import {
  REANOZA_ADMIN_UID,
  RETIRED_DEMO_USER_UID,
  RETIRED_SEEDED_ADMIN_UIDS,
} from '../constants/seededAccounts.ts';
import {
  formatSessionDateTime,
  getRemainingSessionSeconds,
} from '../utils/format.ts';
import type {
  ActiveSession,
  AdminStationActivity,
  AdminStationTransaction,
  KioskStation,
  LockerSlot,
  LockerStatus,
  PaymentMethod,
  PendingUnlockToken,
  SecurityAlert,
  ServiceType,
  SessionHistoryItem,
  UserAccount,
  UserRole,
  WalletTransaction,
  WalletTransactionKind,
  WalletTransactionSource,
} from '../types/index.ts';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STUDENT_ID_REGEX = /^[A-Za-z0-9-]{4,24}$/;

function hasExactCurrencyAmount(amount: number, expected: number): boolean {
  return Number.isFinite(amount) && Math.round(amount * 100) === Math.round(expected * 100);
}

function normalizeAccountName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeStudentId(value: string): string {
  return value.trim().replace(/[\s-]+/g, '').toLowerCase();
}

function normalizedNameColumn() {
  return sql`lower(regexp_replace(trim(${users.name}), '\\s+', ' ', 'g'))`;
}

function normalizedStudentIdColumn() {
  return sql`lower(regexp_replace(trim(${users.studentIdNumber}), '[[:space:]-]+', '', 'g'))`;
}

async function lockIdentity(tx: { execute: typeof db.execute }, name: string, studentId?: string) {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${normalizeAccountName(name)}), 1)`
  );
  if (studentId) {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${normalizeStudentId(studentId)}), 2)`
    );
  }
}

function hashVerificationCode(code: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto.createHmac('sha256', salt).update(code).digest('hex');
  return `${salt}:${digest}`;
}

function verifyVerificationCode(code: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  const actualBuf = crypto.createHmac('sha256', salt).update(code).digest();
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

let catalogSeeded = false;
let catalogSeedPromise: Promise<void> | null = null;

async function ensureSchemaReady(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      uid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      student_id_number TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'student',
      college TEXT NOT NULL DEFAULT 'College of Information Technology and Computing (CITC)',
      degree TEXT NOT NULL DEFAULT 'BS Information Technology',
      avatar TEXT NOT NULL DEFAULT '',
      wallet_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
      biometric_enabled BOOLEAN NOT NULL DEFAULT false,
      push_notifications BOOLEAN NOT NULL DEFAULT true,
      overcharge_alerts BOOLEAN NOT NULL DEFAULT true,
      preferred_payment TEXT NOT NULL DEFAULT 'wallet',
      email_verified BOOLEAN NOT NULL DEFAULT false,
      profile_completed BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      code_hash TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS stations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      campus_code TEXT NOT NULL,
      building TEXT NOT NULL,
      floor TEXT NOT NULL,
      walk_minutes INTEGER NOT NULL,
      distance_meters INTEGER NOT NULL,
      total_slots INTEGER NOT NULL DEFAULT 8,
      online BOOLEAN NOT NULL DEFAULT true,
      power_draw_watts INTEGER NOT NULL DEFAULT 200,
      map_x INTEGER NOT NULL DEFAULT 50,
      map_y INTEGER NOT NULL DEFAULT 50,
      lat DOUBLE PRECISION NOT NULL DEFAULT 8.4855,
      lng DOUBLE PRECISION NOT NULL DEFAULT 124.6565,
      image TEXT NOT NULL DEFAULT '/src/assets/images/smart_locker_station_1794365237708.jpg',
      is_popular BOOLEAN NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS locker_slots (
      id TEXT PRIMARY KEY,
      station_id TEXT NOT NULL REFERENCES stations(id),
      slot_number INTEGER NOT NULL,
      size TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      charging_power TEXT NOT NULL,
      current_temp DOUBLE PRECISION NOT NULL DEFAULT 28.0,
      is_door_open BOOLEAN NOT NULL DEFAULT false,
      is_locked BOOLEAN NOT NULL DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      session_id TEXT NOT NULL UNIQUE,
      user_uid TEXT NOT NULL REFERENCES users(uid),
      station_id TEXT NOT NULL,
      station_name TEXT NOT NULL,
      building TEXT NOT NULL,
      slot_number INTEGER NOT NULL,
      service_type TEXT NOT NULL,
      compartment_size TEXT NOT NULL,
      start_time_ms DOUBLE PRECISION NOT NULL,
      duration_minutes INTEGER NOT NULL,
      remaining_seconds INTEGER NOT NULL,
      total_fee DOUBLE PRECISION NOT NULL,
      battery_initial INTEGER NOT NULL,
      battery_current INTEGER NOT NULL,
      charging_rate_watts DOUBLE PRECISION NOT NULL,
      locker_temperature DOUBLE PRECISION NOT NULL,
      is_overcharge_protection_active BOOLEAN NOT NULL DEFAULT true,
      is_tamper_alert_armed BOOLEAN NOT NULL DEFAULT true,
      status TEXT NOT NULL DEFAULT 'active',
      qr_verification_code TEXT NOT NULL,
      receipt_number TEXT,
      date_label TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS locker_unlock_tokens (
      id SERIAL PRIMARY KEY,
      token_id TEXT NOT NULL UNIQUE,
      user_uid TEXT NOT NULL REFERENCES users(uid),
      station_id TEXT NOT NULL,
      station_name TEXT NOT NULL,
      station_code TEXT NOT NULL,
      slot_number INTEGER NOT NULL,
      service_type TEXT NOT NULL,
      compartment_size TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      total_fee DOUBLE PRECISION NOT NULL,
      payment_method TEXT NOT NULL,
      pin_code TEXT NOT NULL,
      qr_payload TEXT NOT NULL UNIQUE,
      used BOOLEAN NOT NULL DEFAULT false,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS security_alerts (
      id TEXT PRIMARY KEY,
      timestamp_label TEXT NOT NULL,
      station_code TEXT NOT NULL,
      station_name TEXT NOT NULL,
      slot_number INTEGER NOT NULL,
      severity TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      resolved BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hashHex] = parts;
  if (!salt || !hashHex) return false;
  const expectedBuffer = Buffer.from(hashHex, 'hex');
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  if (expectedBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, derivedBuffer);
}

const DEFAULT_DB_ACCOUNTS = [
  {
    uid: 'usr_ustp_202330192',
    name: 'Jastin Alberca',
    studentIdNumber: '2023-30192',
    email: 'jastinalberca8@gmail.com',
    passwordPlain: 'student123',
    role: 'student',
    college: 'College of Information Technology and Computing (CITC)',
    degree: 'BS Information Technology',
    avatar: '',
    walletBalance: 130.0,
    biometricEnabled: true,
    pushNotifications: true,
    overchargeAlerts: true,
    preferredPayment: 'wallet',
  },
  {
    uid: REANOZA_ADMIN_UID,
    name: 'Reanoza Marilex Basañes Rabosa',
    studentIdNumber: 'ADMIN-05',
    email: 'reanoza.ustp.ph',
    passwordPlain: 'reanoza123',
    role: 'admin',
    college: 'USTP ICT Infrastructure & Smart Campus Operations',
    degree: 'System Administrator',
    avatar: '',
    walletBalance: 0.0,
    biometricEnabled: true,
    pushNotifications: true,
    overchargeAlerts: true,
    preferredPayment: 'wallet',
  },
] as const;

export async function ensureCatalogSeeded(): Promise<void> {
  if (catalogSeeded) return;
  if (catalogSeedPromise) return catalogSeedPromise;

  catalogSeedPromise = (async () => {
    try {
      // In Cloud SQL runtime, SQL_USER has DML permissions on existing tables
      // but lacks CREATE DDL permission on schema public. Check existence first.
      const tableCheck = await pool.query<{ tbl: string | null }>(
        "SELECT to_regclass('public.stations') AS tbl"
      );
      if (!tableCheck.rows[0]?.tbl) {
        await ensureSchemaReady();
      }

      // Remove legacy multi-building compartments & stations so only the single UniCharge Station exists
      await db.delete(lockerSlots).where(ne(lockerSlots.stationId, UNICHARGE_STATION_ID));
      await db.delete(stations).where(ne(stations.id, UNICHARGE_STATION_ID));

      for (const st of SEED_STATIONS) {
        await db
          .insert(stations)
          .values({
            id: st.id,
            name: st.name,
            campusCode: st.campusCode,
            building: st.building,
            floor: st.floor,
            walkMinutes: st.walkMinutes,
            distanceMeters: st.distanceMeters,
            totalSlots: st.totalSlots,
            online: st.online,
            powerDrawWatts: st.powerDrawWatts,
            mapX: st.mapCoords.x,
            mapY: st.mapCoords.y,
            lat: st.coordinates.lat,
            lng: st.coordinates.lng,
            image: st.image,
            isPopular: Boolean(st.isPopular),
          })
          .onConflictDoUpdate({
            target: stations.id,
            set: {
              name: st.name,
              campusCode: st.campusCode,
              building: st.building,
              floor: st.floor,
              walkMinutes: st.walkMinutes,
              distanceMeters: st.distanceMeters,
              totalSlots: st.totalSlots,
              image: st.image,
            },
          });

        for (const slot of st.slots) {
          await db
            .insert(lockerSlots)
            .values({
              id: slot.id,
              stationId: st.id,
              slotNumber: slot.slotNumber,
              size: slot.category,
              status: slot.status,
              chargingPower: slot.chargingPower,
              currentTemp: slot.currentTemp,
              isDoorOpen: slot.isDoorOpen,
              isLocked: slot.isLocked,
            })
            .onConflictDoUpdate({
              target: lockerSlots.id,
              set: {
                slotNumber: slot.slotNumber,
                size: slot.category,
                chargingPower: slot.chargingPower,
              },
            });
        }
      }

      // Remove legacy thermal threshold seed alert and free any orphaned non-active busy slots
      await db.delete(securityAlerts).where(eq(securityAlerts.id, 'alt-1'));

      const now = new Date();
      const [activeSessionSlots, activeTokenSlots] = await Promise.all([
        db
          .select({ slotNumber: sessions.slotNumber })
          .from(sessions)
          .where(
            and(
              eq(sessions.stationId, UNICHARGE_STATION_ID),
              eq(sessions.status, 'active')
            )
          ),
        db
          .select({ slotNumber: lockerUnlockTokens.slotNumber })
          .from(lockerUnlockTokens)
          .where(
            and(
              eq(lockerUnlockTokens.stationId, UNICHARGE_STATION_ID),
              eq(lockerUnlockTokens.used, false),
              gt(lockerUnlockTokens.expiresAt, now)
            )
          ),
      ]);
      const occupiedSlotNumbers = new Set<number>([
        ...activeSessionSlots.map((s) => s.slotNumber),
        ...activeTokenSlots.map((t) => t.slotNumber),
      ]);
      const currentStationSlots = await db
        .select()
        .from(lockerSlots)
        .where(eq(lockerSlots.stationId, UNICHARGE_STATION_ID));
      for (const dbSlot of currentStationSlots) {
        if (dbSlot.status === 'in_use' && !occupiedSlotNumbers.has(dbSlot.slotNumber)) {
          await db
            .update(lockerSlots)
            .set({ status: 'available', isDoorOpen: false, isLocked: true })
            .where(eq(lockerSlots.id, dbSlot.id));
        }
      }

      for (const alert of SEED_SECURITY_ALERTS) {
        await db
          .insert(securityAlerts)
          .values({
            id: alert.id,
            timestampLabel: alert.timestamp,
            stationCode: alert.stationCode,
            stationName: alert.stationName,
            slotNumber: alert.slotNumber,
            severity: alert.severity,
            type: alert.type,
            message: alert.message,
            resolved: alert.resolved,
          })
          .onConflictDoUpdate({
            target: securityAlerts.id,
            set: {
              stationCode: alert.stationCode,
              stationName: alert.stationName,
              slotNumber: alert.slotNumber,
              type: alert.type,
              message: alert.message,
            },
          });
      }

      // Remove retired accounts and all admins except the designated administrator.
      await db.transaction(async (tx) => {
        const retiredAccounts = await tx
          .select({ uid: users.uid })
          .from(users)
          .where(
            or(
              ilike(users.email, 'admin@ustp.edu.ph'),
              inArray(users.uid, [
                'usr_ustp_admin01',
                'usr_ustp_admin_01',
                RETIRED_DEMO_USER_UID,
                ...RETIRED_SEEDED_ADMIN_UIDS,
              ]),
              and(eq(users.role, 'admin'), ne(users.uid, REANOZA_ADMIN_UID))
            )
          );
        if (retiredAccounts.length === 0) return;

        const retiredUids = retiredAccounts.map((account) => account.uid);
        await tx
          .delete(lockerUnlockTokens)
          .where(inArray(lockerUnlockTokens.userUid, retiredUids));
        await tx
          .delete(walletTransactions)
          .where(inArray(walletTransactions.userUid, retiredUids));
        await tx.delete(sessions).where(inArray(sessions.userUid, retiredUids));
        await tx.delete(users).where(inArray(users.uid, retiredUids));
      });

      for (const acct of DEFAULT_DB_ACCOUNTS) {
        await db
          .insert(users)
          .values({
            uid: acct.uid,
            name: acct.name,
            studentIdNumber: acct.studentIdNumber,
            email: acct.email,
            passwordHash: hashPassword(acct.passwordPlain),
            role: acct.role,
            college: acct.college,
            degree: acct.degree,
            avatar: acct.avatar,
            walletBalance: acct.walletBalance,
            biometricEnabled: acct.biometricEnabled,
            pushNotifications: acct.pushNotifications,
            overchargeAlerts: acct.overchargeAlerts,
            preferredPayment: acct.preferredPayment,
            emailVerified: true,
            profileCompleted: true,
          })
          .onConflictDoNothing();
      }

      catalogSeeded = true;
    } catch (error) {
      console.error('Database catalog seed failed:', error);
      throw new Error('Failed to initialize campus station catalog.', { cause: error });
    } finally {
      catalogSeedPromise = null;
    }
  })();

  return catalogSeedPromise;
}

function mapUserRow(row: typeof users.$inferSelect): UserAccount {
  return {
    id: row.uid,
    name: row.name,
    studentIdNumber: row.studentIdNumber,
    email: row.email,
    password: '',
    role: row.role === 'admin' ? 'admin' : 'student',
    college: row.college,
    degree: row.degree,
    avatar: row.avatar,
    walletBalance: Number(row.walletBalance ?? 0),
    biometricEnabled: row.biometricEnabled,
    pushNotifications: row.pushNotifications,
    overchargeAlerts: row.overchargeAlerts,
    preferredPayment:
      row.preferredPayment === 'gcash' ||
      row.preferredPayment === 'maya' ||
      row.preferredPayment === 'gotyme'
        ? row.preferredPayment
        : 'wallet',
    emailVerified: row.emailVerified,
    profileCompleted: row.profileCompleted,
    createdAt: row.createdAt.toISOString().split('T')[0],
  };
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string
): Promise<UserAccount> {
  try {
    const cleanEmail = (email || `${uid}@ustp.edu.ph`).trim().toLowerCase();

    const existingByUid = await db.select().from(users).where(eq(users.uid, uid));
    if (existingByUid[0]) {
      return mapUserRow(existingByUid[0]);
    }

    const existingByEmail = await db
      .select()
      .from(users)
      .where(ilike(users.email, cleanEmail));
    if (existingByEmail[0]) {
      const existing = existingByEmail[0];
      const oldUid = existing.uid;
      if (oldUid !== uid) {
        const migrated = await db.transaction(async (tx) => {
          const tempEmail = `__migrating_${existing.id}_${Date.now()}@unicharge.invalid`;
          await tx
            .update(users)
            .set({ email: tempEmail })
            .where(eq(users.id, existing.id));

          const [insertedUser] = await tx
            .insert(users)
            .values({
              uid,
              name: existing.name,
              studentIdNumber: existing.studentIdNumber,
              email: cleanEmail,
              passwordHash: existing.passwordHash,
              role: existing.role,
              college: existing.college,
              degree: existing.degree,
              avatar: existing.avatar,
              walletBalance: existing.walletBalance,
              biometricEnabled: existing.biometricEnabled,
              pushNotifications: existing.pushNotifications,
              overchargeAlerts: existing.overchargeAlerts,
              preferredPayment: existing.preferredPayment,
              emailVerified: true,
              profileCompleted: existing.profileCompleted,
              createdAt: existing.createdAt,
            })
            .returning();

          await tx
            .update(sessions)
            .set({ userUid: uid })
            .where(eq(sessions.userUid, oldUid));

          await tx
            .update(lockerUnlockTokens)
            .set({ userUid: uid })
            .where(eq(lockerUnlockTokens.userUid, oldUid));

          await tx.delete(users).where(eq(users.id, existing.id));
          return insertedUser;
        });
        return mapUserRow(migrated);
      }
      return mapUserRow(existing);
    }

    const role: UserRole = 'student';
    const defaultName = displayName?.trim() || cleanEmail.split('@')[0] || 'USTP Student';

    const inserted = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${uid}), 3)`);
      const currentUidRows = await tx
        .select()
        .from(users)
        .where(eq(users.uid, uid))
        .limit(1);
      if (currentUidRows[0]) {
        return currentUidRows[0];
      }

      await lockIdentity(tx, defaultName);
      const emailRows = await tx
        .select()
        .from(users)
        .where(ilike(users.email, cleanEmail))
        .limit(1);
      if (emailRows[0]) {
        throw new AuthConflictError('An account with this email already exists.');
      }

      const duplicateName = await tx
        .select({ uid: users.uid })
        .from(users)
        .where(eq(normalizedNameColumn(), normalizeAccountName(defaultName)))
        .limit(1);
      if (duplicateName[0]) {
        throw new AuthConflictError(
          'An account with this name already exists. Contact an administrator if this is your account.'
        );
      }

      const [created] = await tx
        .insert(users)
        .values({
          uid,
          name: defaultName,
          studentIdNumber: '',
          email: cleanEmail,
          role,
          college: '',
          degree: '',
          avatar: '',
          walletBalance: 0,
          biometricEnabled: false,
          pushNotifications: true,
          overchargeAlerts: true,
          preferredPayment: 'wallet',
          emailVerified: true,
          profileCompleted: false,
        })
        .returning();
      return created;
    });

    return mapUserRow(inserted);
  } catch (error) {
    if (error instanceof AuthConflictError || error instanceof AuthValidationError) {
      throw error;
    }
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to sync user account.', { cause: error });
  }
}

export class AuthConflictError extends Error {
  statusCode = 409;
}

export class AuthValidationError extends Error {
  statusCode = 400;
}

export class AuthCredentialsError extends Error {
  statusCode = 401;
}

export async function createEmailVerificationDb(params: {
  name: string;
  studentIdNumber: string;
  email: string;
  password: string;
  college: string;
  course: string;
}): Promise<{ email: string; name: string; code: string }> {
  await ensureCatalogSeeded();
  const cleanName = params.name.trim();
  const cleanId = params.studentIdNumber.trim();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanCollege = params.college.trim();
  const cleanCourse = params.course.trim();

  if (cleanName.length < 2) {
    throw new AuthValidationError('Please enter your full name (at least 2 characters).');
  }
  if (!STUDENT_ID_REGEX.test(cleanId)) {
    throw new AuthValidationError(
      'Enter a valid Student ID (4–24 letters, numbers, or hyphens, e.g. 2024-30512).'
    );
  }
  if (!EMAIL_REGEX.test(cleanEmail)) {
    throw new AuthValidationError('Please enter a valid USTP or personal email address.');
  }
  if (!ALLOWED_USTP_COLLEGE_VALUES.has(cleanCollege)) {
    throw new AuthValidationError('Please select a valid USTP college from the list.');
  }
  if (!cleanCourse) {
    throw new AuthValidationError('Please select your Course / Program from the dropdown menu.');
  }
  if (!isCourseValidForCollege(cleanCollege, cleanCourse)) {
    throw new AuthValidationError('Selected course does not belong to the chosen college.');
  }
  if (!params.password || params.password.length < 6) {
    throw new AuthValidationError('Password must be at least 6 characters.');
  }

  try {
    const existing = await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.email, cleanEmail),
          eq(normalizedStudentIdColumn(), normalizeStudentId(cleanId)),
          eq(normalizedNameColumn(), normalizeAccountName(cleanName))
        )
      );

    if (existing.length > 0) {
      throw new AuthConflictError(
        'An account with this email, name, or USTP ID already exists.'
      );
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db
      .insert(emailVerifications)
      .values({
        email: cleanEmail,
        codeHash,
        attempts: 0,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: emailVerifications.email,
        set: {
          codeHash,
          attempts: 0,
          expiresAt,
        },
      });

    return { email: cleanEmail, name: cleanName, code };
  } catch (error) {
    if (error instanceof AuthConflictError || error instanceof AuthValidationError) {
      throw error;
    }
    console.error('Database verification code creation failed:', error);
    throw new Error('Failed to generate verification code.', { cause: error });
  }
}

export async function registerStudentUserDb(params: {
  name: string;
  studentIdNumber: string;
  email: string;
  password: string;
  college: string;
  course: string;
  verificationCode: string;
}): Promise<UserAccount> {
  await ensureCatalogSeeded();
  const cleanName = params.name.trim();
  const cleanId = params.studentIdNumber.trim();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanCollege = params.college.trim();
  const cleanCourse = params.course.trim();
  const cleanCode = params.verificationCode.trim();

  if (cleanName.length < 2) {
    throw new AuthValidationError('Please enter your full name (at least 2 characters).');
  }
  if (!STUDENT_ID_REGEX.test(cleanId)) {
    throw new AuthValidationError(
      'Enter a valid Student ID (4–24 letters, numbers, or hyphens, e.g. 2024-30512).'
    );
  }
  if (!EMAIL_REGEX.test(cleanEmail)) {
    throw new AuthValidationError('Please enter a valid USTP or personal email address.');
  }
  if (!ALLOWED_USTP_COLLEGE_VALUES.has(cleanCollege)) {
    throw new AuthValidationError('Please select a valid USTP college from the list.');
  }
  if (!cleanCourse) {
    throw new AuthValidationError('Please select your Course / Program from the dropdown menu.');
  }
  if (!isCourseValidForCollege(cleanCollege, cleanCourse)) {
    throw new AuthValidationError('Selected course does not belong to the chosen college.');
  }
  if (!params.password || params.password.length < 6) {
    throw new AuthValidationError('Password must be at least 6 characters.');
  }
  if (!/^\d{6}$/.test(cleanCode)) {
    throw new AuthValidationError('Please enter the 6-digit verification code sent to your email.');
  }

  try {
    const verificationRows = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, cleanEmail));

    const record = verificationRows[0];
    if (!record) {
      throw new AuthValidationError(
        'No pending verification code found for this email. Please request a new code.'
      );
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await db
        .delete(emailVerifications)
        .where(eq(emailVerifications.email, cleanEmail));
      throw new AuthValidationError(
        'Your verification code has expired. Please request a new code.'
      );
    }

    if (record.attempts >= 5) {
      await db
        .delete(emailVerifications)
        .where(eq(emailVerifications.email, cleanEmail));
      throw new AuthValidationError(
        'Too many incorrect verification attempts. Please request a new code.'
      );
    }

    if (!verifyVerificationCode(cleanCode, record.codeHash)) {
      await db
        .update(emailVerifications)
        .set({ attempts: record.attempts + 1 })
        .where(eq(emailVerifications.email, cleanEmail));
      throw new AuthValidationError(
        'Invalid verification code. Please check your inbox and try again.'
      );
    }

    const uid = `usr_ustp_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const inserted = await db.transaction(async (tx) => {
      await lockIdentity(tx, cleanName, cleanId);
      const duplicate = await tx
        .select({ uid: users.uid })
        .from(users)
        .where(
          or(
            ilike(users.email, cleanEmail),
            eq(normalizedStudentIdColumn(), normalizeStudentId(cleanId)),
            eq(normalizedNameColumn(), normalizeAccountName(cleanName))
          )
        )
        .limit(1);
      if (duplicate[0]) {
        throw new AuthConflictError(
          'An account with this email, name, or USTP ID already exists.'
        );
      }

      const created = await tx
        .insert(users)
        .values({
          uid,
          name: cleanName,
          studentIdNumber: cleanId,
          email: cleanEmail,
          passwordHash: hashPassword(params.password),
          role: 'student',
          college: cleanCollege,
          degree: cleanCourse,
          avatar: '',
          walletBalance: 0,
          biometricEnabled: false,
          pushNotifications: true,
          overchargeAlerts: true,
          preferredPayment: 'wallet',
          emailVerified: true,
          profileCompleted: true,
        })
        .returning();

      await tx
        .delete(emailVerifications)
        .where(eq(emailVerifications.email, cleanEmail));
      return created;
    });

    return mapUserRow(inserted[0]);
  } catch (error) {
    if (error instanceof AuthConflictError || error instanceof AuthValidationError) {
      throw error;
    }
    console.error('Database student registration failed:', error);
    throw new Error('Failed to create student account.', { cause: error });
  }
}

export async function completeGoogleOnboardingDb(params: {
  uid: string;
  name?: string;
  studentIdNumber: string;
  college: string;
  course: string;
}): Promise<UserAccount> {
  const cleanId = params.studentIdNumber.trim();
  const cleanCollege = params.college.trim();
  const cleanCourse = params.course.trim();
  const cleanName = params.name?.trim();

  if (cleanName !== undefined && cleanName.length < 2) {
    throw new AuthValidationError('Please enter your full name (at least 2 characters).');
  }
  if (!STUDENT_ID_REGEX.test(cleanId)) {
    throw new AuthValidationError(
      'Enter a valid USTP Student ID (4–24 letters, numbers, or hyphens, e.g. 2023-30192).'
    );
  }
  if (!ALLOWED_USTP_COLLEGE_VALUES.has(cleanCollege)) {
    throw new AuthValidationError('Please select your College from the dropdown menu.');
  }
  if (!cleanCourse) {
    throw new AuthValidationError('Please select your Course / Program from the dropdown menu.');
  }
  if (!isCourseValidForCollege(cleanCollege, cleanCourse)) {
    throw new AuthValidationError('Selected course does not belong to the chosen college.');
  }

  try {
    const updated = await db.transaction(async (tx) => {
      const currentRows = await tx
        .select()
        .from(users)
        .where(eq(users.uid, params.uid))
        .for('update');
      const currentUser = currentRows[0];
      if (!currentUser) {
        throw new AuthValidationError('User account not found.');
      }

      const nextName = cleanName || currentUser.name;
      await lockIdentity(tx, nextName, cleanId);
      const duplicateId = await tx
        .select({ uid: users.uid })
        .from(users)
        .where(
          and(
            eq(normalizedStudentIdColumn(), normalizeStudentId(cleanId)),
            ne(users.uid, params.uid)
          )
        )
        .limit(1);
      if (duplicateId[0]) {
        throw new AuthConflictError(
          'This Student ID is already registered to another account.'
        );
      }

      if (normalizeAccountName(nextName) !== normalizeAccountName(currentUser.name)) {
        const duplicateName = await tx
          .select({ uid: users.uid })
          .from(users)
          .where(
            and(
              eq(normalizedNameColumn(), normalizeAccountName(nextName)),
              ne(users.uid, params.uid)
            )
          )
          .limit(1);
        if (duplicateName[0]) {
          throw new AuthConflictError(
            'This name is already registered to another account.'
          );
        }
      }

      const [savedUser] = await tx
        .update(users)
        .set({
          ...(cleanName ? { name: cleanName } : {}),
          studentIdNumber: cleanId,
          college: cleanCollege,
          degree: cleanCourse,
          emailVerified: true,
          profileCompleted: true,
        })
        .where(eq(users.uid, params.uid))
        .returning();
      return savedUser;
    });

    return mapUserRow(updated);
  } catch (error) {
    if (error instanceof AuthConflictError || error instanceof AuthValidationError) {
      throw error;
    }
    console.error('Database onboarding completion failed:', error);
    throw new Error('Failed to save onboarding profile.', { cause: error });
  }
}

export async function authenticateUserDb(
  identifier: string,
  password: string
): Promise<UserAccount> {
  await ensureCatalogSeeded();
  const cleanIdentifier = identifier.trim();
  if (!cleanIdentifier || !password) {
    throw new AuthCredentialsError('Invalid email/ID or password');
  }

  try {
    const lowerId = cleanIdentifier.toLowerCase();
    const alternateIdentifiers = [cleanIdentifier];
    if (lowerId.endsWith('@ustp.ph')) {
      alternateIdentifiers.push(`${lowerId.slice(0, -'@ustp.ph'.length)}.ustp.ph`);
    } else if (lowerId.endsWith('@ustp.edu.ph')) {
      alternateIdentifiers.push(`${lowerId.slice(0, -'@ustp.edu.ph'.length)}.ustp.ph`);
    } else if (lowerId.endsWith('.ustp.ph') && !lowerId.includes('@')) {
      alternateIdentifiers.push(`${lowerId.slice(0, -'.ustp.ph'.length)}@ustp.ph`);
    }

    const rows = await db
      .select()
      .from(users)
      .where(
        or(
          ...alternateIdentifiers.map((ident) => ilike(users.email, ident)),
          ilike(users.studentIdNumber, cleanIdentifier)
        )
      );

    const row = rows[0];
    if (!row) {
      throw new AuthCredentialsError('Invalid email/ID or password');
    }

    if (!row.passwordHash) {
      throw new AuthCredentialsError(
        'This account uses Google Sign-In. Please click "Continue with Google" to access your portal.'
      );
    }

    if (!verifyPassword(password, row.passwordHash)) {
      throw new AuthCredentialsError('Invalid email/ID or password');
    }

    return mapUserRow(row);
  } catch (error) {
    if (error instanceof AuthCredentialsError) {
      throw error;
    }
    console.error('Database authentication failed:', error);
    throw new Error('Failed to sign in.', { cause: error });
  }
}

function maskEmailAddress(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export async function requestPasswordResetDb(
  identifier: string
): Promise<{ email: string; name: string; code: string; maskedEmail: string }> {
  await ensureCatalogSeeded();
  const cleanIdentifier = identifier.trim();
  if (!cleanIdentifier) {
    throw new AuthValidationError(
      'Please enter your registered USTP/personal email or USTP ID number.'
    );
  }

  try {
    const rows = await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.email, cleanIdentifier),
          ilike(users.studentIdNumber, cleanIdentifier)
        )
      );

    const user = rows[0];
    if (!user) {
      throw new AuthValidationError(
        'No UniCharge account found matching that email or USTP ID.'
      );
    }

    const userEmail = user.email.trim().toLowerCase();
    const resetKey = `reset:${userEmail}`;
    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db
      .insert(emailVerifications)
      .values({
        email: resetKey,
        codeHash,
        attempts: 0,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: emailVerifications.email,
        set: {
          codeHash,
          attempts: 0,
          expiresAt,
        },
      });

    return {
      email: userEmail,
      name: user.name,
      code,
      maskedEmail: maskEmailAddress(userEmail),
    };
  } catch (error) {
    if (error instanceof AuthValidationError) {
      throw error;
    }
    console.error('Database password reset code creation failed:', error);
    throw new Error('Failed to generate password reset code.', { cause: error });
  }
}

export async function resetPasswordWithCodeDb(params: {
  identifier: string;
  verificationCode: string;
  newPassword: string;
}): Promise<{ email: string; name: string }> {
  await ensureCatalogSeeded();
  const cleanIdentifier = params.identifier.trim();
  const cleanCode = params.verificationCode.trim();

  if (!cleanIdentifier) {
    throw new AuthValidationError(
      'Please enter your registered email or USTP ID number.'
    );
  }
  if (!/^\d{6}$/.test(cleanCode)) {
    throw new AuthValidationError(
      'Please enter the 6-digit password reset code sent to your email.'
    );
  }
  if (!params.newPassword || params.newPassword.length < 6) {
    throw new AuthValidationError('New password must be at least 6 characters.');
  }

  try {
    const rows = await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.email, cleanIdentifier),
          ilike(users.studentIdNumber, cleanIdentifier)
        )
      );

    const user = rows[0];
    if (!user) {
      throw new AuthValidationError(
        'No UniCharge account found matching that email or USTP ID.'
      );
    }

    const userEmail = user.email.trim().toLowerCase();
    const resetKey = `reset:${userEmail}`;

    const verificationRows = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, resetKey));

    const record = verificationRows[0];
    if (!record) {
      throw new AuthValidationError(
        'No pending password reset code found. Please request a new code.'
      );
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await db
        .delete(emailVerifications)
        .where(eq(emailVerifications.email, resetKey));
      throw new AuthValidationError(
        'Your password reset code has expired. Please request a new code.'
      );
    }

    if (record.attempts >= 5) {
      await db
        .delete(emailVerifications)
        .where(eq(emailVerifications.email, resetKey));
      throw new AuthValidationError(
        'Too many incorrect reset code attempts. Please request a new code.'
      );
    }

    if (!verifyVerificationCode(cleanCode, record.codeHash)) {
      await db
        .update(emailVerifications)
        .set({ attempts: record.attempts + 1 })
        .where(eq(emailVerifications.email, resetKey));
      throw new AuthValidationError(
        'Invalid reset code. Please check your inbox and try again.'
      );
    }

    await db
      .update(users)
      .set({
        passwordHash: hashPassword(params.newPassword),
        emailVerified: true,
      })
      .where(eq(users.id, user.id));

    await db
      .delete(emailVerifications)
      .where(eq(emailVerifications.email, resetKey));

    return { email: userEmail, name: user.name };
  } catch (error) {
    if (error instanceof AuthValidationError) {
      throw error;
    }
    console.error('Database password reset failed:', error);
    throw new Error('Failed to reset password.', { cause: error });
  }
}

export async function adminProvisionStaffDb(params: {
  name: string;
  email: string;
  staffId: string;
  password: string;
}): Promise<UserAccount> {
  void params;
  throw new AuthValidationError(
    'Staff account creation is disabled. Only the designated administrator is allowed.'
  );
}

async function releaseExpiredReservationsDb(): Promise<void> {
  const now = new Date();
  const expiredTokens = await db
    .update(lockerUnlockTokens)
    .set({ used: true })
    .where(
      and(
        eq(lockerUnlockTokens.used, false),
        lte(lockerUnlockTokens.expiresAt, now)
      )
    )
    .returning();

  if (expiredTokens.length > 0) {
    const seenSlots = new Set<string>();
    for (const tok of expiredTokens) {
      const key = `${tok.stationId}:${tok.slotNumber}`;
      if (seenSlots.has(key)) continue;
      seenSlots.add(key);

      const activeOnSlot = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(
          and(
            eq(sessions.stationId, tok.stationId),
            eq(sessions.slotNumber, tok.slotNumber),
            eq(sessions.status, 'active')
          )
        )
        .limit(1);

      if (activeOnSlot.length > 0) continue;

      const remainingToken = await db
        .select({ id: lockerUnlockTokens.id })
        .from(lockerUnlockTokens)
        .where(
          and(
            eq(lockerUnlockTokens.stationId, tok.stationId),
            eq(lockerUnlockTokens.slotNumber, tok.slotNumber),
            eq(lockerUnlockTokens.used, false),
            gt(lockerUnlockTokens.expiresAt, now)
          )
        )
        .limit(1);

      if (remainingToken.length > 0) continue;

      await db
        .update(lockerSlots)
        .set({ status: 'available', isDoorOpen: false, isLocked: true })
        .where(
          and(
            eq(lockerSlots.stationId, tok.stationId),
            eq(lockerSlots.slotNumber, tok.slotNumber),
            eq(lockerSlots.status, 'in_use')
          )
        );
    }
  }

  const [activeSessionRows, activeTokenSlots, slotRows] = await Promise.all([
    db
      .select({
        id: sessions.id,
        stationId: sessions.stationId,
        slotNumber: sessions.slotNumber,
        startTimeMs: sessions.startTimeMs,
        durationMinutes: sessions.durationMinutes,
        remainingSeconds: sessions.remainingSeconds,
        chargingRateWatts: sessions.chargingRateWatts,
        batteryCurrent: sessions.batteryCurrent,
        serviceType: sessions.serviceType,
      })
      .from(sessions)
      .where(eq(sessions.status, 'active')),
    db
      .select({ stationId: lockerUnlockTokens.stationId, slotNumber: lockerUnlockTokens.slotNumber })
      .from(lockerUnlockTokens)
      .where(
        and(
          eq(lockerUnlockTokens.used, false),
          gt(lockerUnlockTokens.expiresAt, now)
        )
      ),
    db.select().from(lockerSlots),
  ]);
  const nowMs = Date.now();
  for (const session of activeSessionRows) {
    if (getRemainingSessionSeconds(session.startTimeMs, session.durationMinutes, nowMs) > 0) {
      continue;
    }
    if (session.remainingSeconds === 0 && Number(session.chargingRateWatts) === 0) {
      continue;
    }
    // Time expiration stops charging; the locker stays occupied until retrieval.
    await db
      .update(sessions)
      .set({
        remainingSeconds: 0,
        chargingRateWatts: 0,
        ...(session.serviceType === 'charging' ? { batteryCurrent: 100 } : {}),
      })
      .where(eq(sessions.id, session.id));
  }
  const occupiedSlots = new Set(
    [...activeSessionRows, ...activeTokenSlots].map(
      (row) => `${row.stationId}:${row.slotNumber}`
    )
  );

  for (const slot of slotRows) {
    if (slot.status === 'maintenance') continue;
    const occupied = occupiedSlots.has(`${slot.stationId}:${slot.slotNumber}`);
    if (occupied && slot.status !== 'in_use') {
      await db
        .update(lockerSlots)
        .set({ status: 'in_use' })
        .where(eq(lockerSlots.id, slot.id));
    } else if (!occupied && slot.status === 'in_use') {
      await db
        .update(lockerSlots)
        .set({ status: 'available', isDoorOpen: false, isLocked: true })
        .where(eq(lockerSlots.id, slot.id));
    }
  }
}

export async function fetchStationsWithSlots(): Promise<KioskStation[]> {
  try {
    await releaseExpiredReservationsDb();
    const [stationRows, slotRows, activeSessionRows] = await Promise.all([
      db.select().from(stations).orderBy(asc(stations.id)),
      db.select().from(lockerSlots).orderBy(asc(lockerSlots.slotNumber)),
      db
        .select({
          stationId: sessions.stationId,
          startTimeMs: sessions.startTimeMs,
          durationMinutes: sessions.durationMinutes,
          chargingRateWatts: sessions.chargingRateWatts,
        })
        .from(sessions)
        .where(eq(sessions.status, 'active')),
    ]);

    return stationRows.map((st) => {
      const slotsForStation: LockerSlot[] = slotRows
        .filter((s) => s.stationId === st.id)
        .map((s) => ({
          id: s.id,
          slotNumber: s.slotNumber,
          code: formatCompartmentCode(s.slotNumber),
          category: getCompartmentCategory(s.slotNumber),
          status: (s.status as LockerStatus) || 'available',
          chargingPower: s.chargingPower,
          currentTemp: s.currentTemp,
          isDoorOpen: s.isDoorOpen,
          isLocked: s.isLocked,
        }));

      const availableCount = slotsForStation.filter(
        (s) => s.status === 'available'
      ).length;
      const livePowerDrawWatts = Math.round(
        activeSessionRows
          .filter(
            (r) =>
              r.stationId === st.id &&
              getRemainingSessionSeconds(r.startTimeMs, r.durationMinutes) > 0
          )
          .reduce((sum, r) => sum + Number(r.chargingRateWatts || 0), 0)
      );

      return {
        id: st.id,
        name: st.name,
        campusCode: st.campusCode,
        building: st.building,
        floor: st.floor,
        walkMinutes: st.walkMinutes,
        distanceMeters: st.distanceMeters,
        totalSlots: st.totalSlots,
        availableSlots: availableCount,
        slots: slotsForStation,
        mapCoords: { x: st.mapX, y: st.mapY },
        coordinates: { lat: st.lat, lng: st.lng },
        image: st.image,
        isPopular: st.isPopular,
        online: st.online,
        powerDrawWatts: livePowerDrawWatts,
      };
    });
  } catch (error) {
    console.error('Database stations query failed:', error);
    throw new Error('Failed to load campus stations.', { cause: error });
  }
}

export async function getPublicStationStateDb(): Promise<{ stations: KioskStation[] }> {
  await ensureCatalogSeeded();
  await releaseExpiredReservationsDb();
  const stationList = await fetchStationsWithSlots();
  return { stations: stationList };
}

export async function fetchSecurityAlerts(): Promise<SecurityAlert[]> {
  try {
    const rows = await db
      .select()
      .from(securityAlerts)
      .orderBy(desc(securityAlerts.createdAt));

    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestampLabel,
      stationCode: r.stationCode,
      stationName: r.stationName,
      slotNumber: r.slotNumber,
      severity: (r.severity as SecurityAlert['severity']) || 'info',
      type: (r.type as SecurityAlert['type']) || 'Maintenance',
      message: r.message,
      resolved: r.resolved,
    }));
  } catch (error) {
    console.error('Database alerts query failed:', error);
    throw new Error('Failed to load security alerts.', { cause: error });
  }
}

export async function fetchUserSessionState(userUid: string): Promise<{
  activeSession: ActiveSession | null;
  history: SessionHistoryItem[];
}> {
  try {
    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userUid, userUid))
      .orderBy(desc(sessions.createdAt));

    const activeRow = rows.find((r) => r.status === 'active');
    const activeSession: ActiveSession | null = activeRow
      ? {
          sessionId: activeRow.sessionId,
          stationId: activeRow.stationId,
          stationName: activeRow.stationName,
          building: activeRow.building,
          slotNumber: activeRow.slotNumber,
          serviceType: normalizeServiceType(activeRow.serviceType, activeRow.slotNumber),
          pricingTier: resolvePricingTier({
            tierId: activeRow.compartmentSize,
            serviceType: activeRow.serviceType,
            durationMinutes: activeRow.durationMinutes,
            slotNumber: activeRow.slotNumber,
          }).name,
          startTime: activeRow.startTimeMs,
          durationMinutes: activeRow.durationMinutes,
          remainingSeconds: getRemainingSessionSeconds(
            activeRow.startTimeMs,
            activeRow.durationMinutes
          ),
          totalFee: activeRow.totalFee,
          batteryInitial: activeRow.batteryInitial,
          batteryCurrent: activeRow.batteryCurrent,
          chargingRateWatts: activeRow.chargingRateWatts,
          lockerTemperature: activeRow.lockerTemperature,
          isOverchargeProtectionActive: activeRow.isOverchargeProtectionActive,
          isTamperAlertArmed: activeRow.isTamperAlertArmed,
          status: 'active',
          qrVerificationCode: activeRow.qrVerificationCode,
        }
      : null;

    const history: SessionHistoryItem[] = rows
      .filter((r) => r.status !== 'active')
      .map((r) => {
        const storedLabel = (r.dateLabel || '').trim();
        const isGenericJustNow =
          !storedLabel || storedLabel.toLowerCase() === 'just now';
        const formattedDate = isGenericJustNow
          ? formatSessionDateTime(r.startTimeMs || r.createdAt)
          : storedLabel;

        const resolvedMethod =
          r.paymentMethod && r.paymentMethod !== 'wallet'
            ? r.paymentMethod
            : r.qrVerificationCode?.includes('|COIN-')
            ? 'cash'
            : r.paymentMethod || 'wallet';

        return {
          id: r.sessionId,
          receiptNumber: r.receiptNumber || `USTP-REC-${r.id}`,
          date: formattedDate,
          stationName: r.stationName,
          slotNumber: r.slotNumber,
          durationMinutes: r.durationMinutes,
          totalFee: r.totalFee,
          serviceType: normalizeServiceType(r.serviceType, r.slotNumber),
          pricingTier: resolvePricingTier({
            tierId: r.compartmentSize,
            serviceType: r.serviceType,
            durationMinutes: r.durationMinutes,
            slotNumber: r.slotNumber,
          }).name,
          paymentMethod: resolvedMethod,
          status: 'Completed',
        };
      });

    return { activeSession, history };
  } catch (error) {
    console.error('Database user session query failed:', error);
    throw new Error('Failed to load user sessions.', { cause: error });
  }
}

export async function fetchWalletTransactionsDb(
  userUid: string
): Promise<WalletTransaction[]> {
  try {
    const rows = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userUid, userUid))
      .orderBy(desc(walletTransactions.createdAtMs))
      .limit(40);

    return rows.map((r) => {
      const normalizedSource: WalletTransactionSource =
        r.paymentSource === 'cash'
          ? 'cash'
          : r.paymentSource === 'coin_change'
          ? 'coin_change'
          : r.paymentSource === 'gcash'
          ? 'gcash'
          : r.paymentSource === 'maya'
          ? 'maya'
          : r.paymentSource === 'gotyme'
          ? 'gotyme'
          : 'wallet';

      const normalizedKind: WalletTransactionKind =
        r.kind === 'reload'
          ? 'reload'
          : r.kind === 'coin_change'
          ? 'coin_change'
          : r.kind === 'coin_payment' || normalizedSource === 'cash'
          ? 'coin_payment'
          : 'ewallet_payment';

      const cleanedTitle =
        normalizedKind === 'reload' && /QRPh|Cashier/i.test(r.title)
          ? 'Campus E-Wallet Reload'
          : r.title.replace(/QRPh|Cashier/gi, 'E-Wallet');

      return {
        id: r.txId,
        txId: r.txId,
        userUid: r.userUid,
        kind: normalizedKind,
        paymentSource: normalizedSource,
        title: cleanedTitle,
        referenceCode: r.referenceCode,
        amount: Number(r.amount),
        walletDelta: Number(r.walletDelta),
        balanceAfter: Number(r.balanceAfter),
        date: r.dateLabel,
        createdAtMs: Number(r.createdAtMs),
      };
    });
  } catch (error) {
    console.error('Database wallet transactions query failed:', error);
    return [];
  }
}

type DbExecutor = Pick<typeof db, 'insert'>;

async function recordWalletTransaction(
  executor: DbExecutor,
  params: {
    userUid: string;
    kind: WalletTransactionKind;
    paymentSource: WalletTransactionSource;
    title: string;
    referenceCode: string;
    amount: number;
    walletDelta: number;
    balanceAfter: number;
  }
) {
  const nowMs = Date.now();
  const txId = `WLT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  await executor.insert(walletTransactions).values({
    txId,
    userUid: params.userUid,
    kind: params.kind,
    paymentSource: params.paymentSource,
    title: params.title,
    referenceCode: params.referenceCode,
    amount: +Number(params.amount).toFixed(2),
    walletDelta: +Number(params.walletDelta).toFixed(2),
    balanceAfter: +Number(params.balanceAfter).toFixed(2),
    dateLabel: formatSessionDateTime(new Date(nowMs)),
    createdAtMs: nowMs,
  });
}

export async function fetchAdminStationActivityDb(): Promise<AdminStationActivity> {
  try {
    const now = new Date();
    const [allUsers, recentSessionRows, activeTokenRows] = await Promise.all([
      db.select().from(users),
      db.select().from(sessions).orderBy(desc(sessions.createdAt)).limit(25),
      db
        .select()
        .from(lockerUnlockTokens)
        .where(
          and(
            eq(lockerUnlockTokens.used, false),
            gt(lockerUnlockTokens.expiresAt, now)
          )
        )
        .orderBy(desc(lockerUnlockTokens.createdAt)),
    ]);

    const userByUid = new Map(allUsers.map((u) => [u.uid, u]));

    const activeSessions: AdminStationTransaction[] = recentSessionRows
      .filter((r) => r.status === 'active')
      .map((r) => {
        const owner = r.userUid ? userByUid.get(r.userUid) : undefined;
        const resolvedMethod =
          r.paymentMethod === 'cash' || r.qrVerificationCode?.includes('|COIN-')
            ? 'cash'
            : r.paymentMethod === 'gcash' || r.paymentMethod === 'maya' || r.paymentMethod === 'gotyme'
            ? r.paymentMethod
            : 'wallet';

        const remainingSeconds = getRemainingSessionSeconds(
          r.startTimeMs,
          r.durationMinutes
        );

        return {
          id: r.sessionId,
          kind: remainingSeconds > 0 ? 'active' : 'expired',
          userUid: r.userUid ?? null,
          stationId: r.stationId,
          userName: owner?.name || 'USTP Student',
          studentIdNumber: owner?.studentIdNumber || '—',
          slotNumber: r.slotNumber,
          serviceType: normalizeServiceType(r.serviceType, r.slotNumber),
          pricingTier: resolvePricingTier({
            tierId: r.compartmentSize,
            serviceType: r.serviceType,
            durationMinutes: r.durationMinutes,
            slotNumber: r.slotNumber,
          }).name,
          totalFee: Number(r.totalFee),
          paymentMethod: resolvedMethod,
          batteryCurrent: r.batteryCurrent,
          createdAtMs: r.startTimeMs || r.createdAt.getTime(),
          remainingSeconds,
        };
      });

    const pendingReservations: AdminStationTransaction[] = activeTokenRows.map((t) => {
      const owner = userByUid.get(t.userUid);
      return {
        id: t.tokenId,
        kind: 'reserved',
        userUid: t.userUid,
        stationId: t.stationId,
        userName: owner?.name || 'USTP Student',
        studentIdNumber: owner?.studentIdNumber || '—',
        slotNumber: t.slotNumber,
        serviceType: normalizeServiceType(t.serviceType, t.slotNumber),
        pricingTier: resolvePricingTier({
          tierId: t.compartmentSize,
          serviceType: t.serviceType,
          durationMinutes: t.durationMinutes,
          slotNumber: t.slotNumber,
        }).name,
        totalFee: Number(t.totalFee),
        paymentMethod: normalizePaymentMethod(t.paymentMethod),
        createdAtMs: t.createdAt.getTime(),
        expiresAtMs: t.expiresAt.getTime(),
      };
    });

    const completedAndActiveTransactions: AdminStationTransaction[] = recentSessionRows.map(
      (r) => {
        const owner = r.userUid ? userByUid.get(r.userUid) : undefined;
        const resolvedMethod =
          r.paymentMethod === 'cash' || r.qrVerificationCode?.includes('|COIN-')
            ? 'cash'
            : r.paymentMethod === 'gcash' || r.paymentMethod === 'maya' || r.paymentMethod === 'gotyme'
            ? r.paymentMethod
            : 'wallet';

        const remainingSeconds =
          r.status === 'active'
            ? getRemainingSessionSeconds(r.startTimeMs, r.durationMinutes)
            : undefined;

        return {
          id: r.sessionId,
          kind:
            r.status !== 'active'
              ? 'completed'
              : remainingSeconds && remainingSeconds > 0
              ? 'active'
              : 'expired',
          userUid: r.userUid ?? null,
          stationId: r.stationId,
          userName: owner?.name || 'USTP Student',
          studentIdNumber: owner?.studentIdNumber || '—',
          slotNumber: r.slotNumber,
          serviceType: normalizeServiceType(r.serviceType, r.slotNumber),
          pricingTier: resolvePricingTier({
            tierId: r.compartmentSize,
            serviceType: r.serviceType,
            durationMinutes: r.durationMinutes,
            slotNumber: r.slotNumber,
          }).name,
          totalFee: Number(r.totalFee),
          paymentMethod: resolvedMethod,
          batteryCurrent: r.batteryCurrent,
          createdAtMs: r.startTimeMs || r.createdAt.getTime(),
          remainingSeconds,
        };
      }
    );

    const recentTransactions = [...pendingReservations, ...completedAndActiveTransactions]
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
      .slice(0, 15);

    return {
      activeSessions,
      pendingReservations,
      recentTransactions,
    };
  } catch (error) {
    console.error('Database admin station activity failed:', error);
    return { activeSessions: [], pendingReservations: [], recentTransactions: [] };
  }
}

export async function adminSimulateSessionFullChargeDb(
  sessionId: string
): Promise<AdminStationActivity> {
  const [updatedSession] = await db
    .update(sessions)
    .set({
      batteryCurrent: 100,
      chargingRateWatts: 0,
      isOverchargeProtectionActive: true,
    })
    .where(
      and(
        eq(sessions.sessionId, sessionId),
        eq(sessions.status, 'active'),
        eq(sessions.serviceType, 'charging')
      )
    )
    .returning({ sessionId: sessions.sessionId });

  if (!updatedSession) {
    throw new AuthValidationError('The selected active charging session could not be found.');
  }

  return fetchAdminStationActivityDb();
}

export async function getBootstrapData(
  uid: string,
  email: string,
  displayName?: string
) {
  await ensureCatalogSeeded();
  await releaseExpiredReservationsDb();
  const user = await getOrCreateUser(uid, email, displayName);
  const [stationList, alertList, userSessions, walletTxList] = await Promise.all([
    fetchStationsWithSlots(),
    fetchSecurityAlerts(),
    fetchUserSessionState(user.id),
    fetchWalletTransactionsDb(user.id),
  ]);

  let allUsers: UserAccount[] = [user];
  let stationActivity: AdminStationActivity | undefined;
  if (user.role === 'admin') {
    try {
      const [rows, activity] = await Promise.all([
        db.select().from(users).orderBy(desc(users.createdAt)),
        fetchAdminStationActivityDb(),
      ]);
      allUsers = rows.map(mapUserRow);
      stationActivity = activity;
    } catch (error) {
      console.error('Database users list failed:', error);
      throw new Error('Failed to load registered accounts.', { cause: error });
    }
  }

  const pendingRows = await db
    .select()
    .from(lockerUnlockTokens)
    .where(
      and(
        eq(lockerUnlockTokens.userUid, user.id),
        eq(lockerUnlockTokens.used, false),
        gt(lockerUnlockTokens.expiresAt, new Date())
      )
    )
    .orderBy(desc(lockerUnlockTokens.createdAt))
    .limit(1);

  return {
    user,
    users: allUsers,
    stations: stationList,
    securityAlerts: alertList,
    activeSession: userSessions.activeSession,
    sessionHistory: userSessions.history,
    walletTransactions: walletTxList,
    pendingUnlockToken: pendingRows[0] ? mapUnlockTokenRow(pendingRows[0]) : null,
    ...(stationActivity ? { stationActivity } : {}),
  };
}

export async function getStationSyncStateDb(uid: string, email: string) {
  await ensureCatalogSeeded();
  const existingRows = await db.select().from(users).where(eq(users.uid, uid));
  const actor = existingRows[0]
    ? mapUserRow(existingRows[0])
    : await getOrCreateUser(uid, email);

  const [stationList, alertList, userSessions, walletTxList] = await Promise.all([
    fetchStationsWithSlots(),
    fetchSecurityAlerts(),
    fetchUserSessionState(actor.id),
    fetchWalletTransactionsDb(actor.id),
  ]);

  let allUsers: UserAccount[] | undefined;
  let stationActivity: AdminStationActivity | undefined;
  if (actor.role === 'admin') {
    const [rows, activity] = await Promise.all([
      db.select().from(users).orderBy(desc(users.createdAt)),
      fetchAdminStationActivityDb(),
    ]);
    allUsers = rows.map(mapUserRow);
    stationActivity = activity;
  }

  const pendingRows = await db
    .select()
    .from(lockerUnlockTokens)
    .where(
      and(
        eq(lockerUnlockTokens.userUid, actor.id),
        eq(lockerUnlockTokens.used, false),
        gt(lockerUnlockTokens.expiresAt, new Date())
      )
    )
    .orderBy(desc(lockerUnlockTokens.createdAt))
    .limit(1);

  return {
    user: actor,
    stations: stationList,
    securityAlerts: alertList,
    activeSession: userSessions.activeSession,
    sessionHistory: userSessions.history,
    walletTransactions: walletTxList,
    pendingUnlockToken: pendingRows[0] ? mapUnlockTokenRow(pendingRows[0]) : null,
    ...(allUsers ? { users: allUsers } : {}),
    ...(stationActivity ? { stationActivity } : {}),
  };
}

const UNLOCK_TOKEN_TTL_MS = 5 * 60 * 1000;

export function calculateLockerFee(
  tierOrService: string,
  durationMinutes: number
): number {
  return resolvePricingTier({
    tierId: tierOrService,
    serviceType: tierOrService,
    durationMinutes,
  }).fee;
}

function normalizePaymentMethod(method?: string | null): PaymentMethod {
  if (method === 'cash' || method === 'gcash' || method === 'maya' || method === 'gotyme') {
    return method;
  }
  return 'wallet';
}

function formatEpaymentTitle(method: PaymentMethod): string {
  switch (method) {
    case 'gcash':
      return 'GCash';
    case 'maya':
      return 'Maya';
    case 'gotyme':
      return 'GoTyme Bank';
    case 'cash':
      return 'Kiosk Coin Slot';
    case 'wallet':
    default:
      return 'Campus E-Wallet';
  }
}

function mapUnlockTokenRow(row: typeof lockerUnlockTokens.$inferSelect): PendingUnlockToken {
  const tier = resolvePricingTier({
    tierId: row.compartmentSize,
    serviceType: row.serviceType,
    durationMinutes: row.durationMinutes,
    slotNumber: row.slotNumber,
  });

  return {
    tokenId: row.tokenId,
    stationId: row.stationId,
    stationName: row.stationName,
    stationCode: row.stationCode,
    slotNumber: row.slotNumber,
    serviceType: normalizeServiceType(row.serviceType, row.slotNumber),
    pricingTier: tier.name,
    durationMinutes: row.durationMinutes,
    totalFee: Number(row.totalFee),
    paymentMethod: normalizePaymentMethod(row.paymentMethod),
    qrPayload: row.qrPayload,
    pinCode: row.pinCode,
    createdAt: row.createdAt.getTime(),
    expiresAt: row.expiresAt.getTime(),
  };
}

export async function createUnlockTokenDb(params: {
  uid: string;
  stationId?: string;
  slotNumber?: number;
  serviceType: ServiceType | string;
  pricingTier?: string;
  durationMinutes?: number;
  paymentMethod: PaymentMethod;
}): Promise<{
  token: PendingUnlockToken;
  userEmail: string;
  userName: string;
  stations: KioskStation[];
}> {
  await ensureCatalogSeeded();
  await releaseExpiredReservationsDb();

  const resolvedTier = resolvePricingTier({
    tierId: params.pricingTier,
    serviceType: params.serviceType,
    durationMinutes: params.durationMinutes,
    slotNumber: params.slotNumber,
  });

  const validService: ServiceType = resolvedTier.serviceType;
  const durationMinutes = resolvedTier.durationMinutes;
  const totalFee = resolvedTier.fee;

  const validPayment = normalizePaymentMethod(params.paymentMethod);
  if (validPayment === 'wallet') {
    throw new AuthValidationError(
      'Campus E-Wallet is no longer available for locker bookings. Choose GCash, Maya, GoTyme Bank, or Kiosk Coin Slot.'
    );
  }

  const actorRows = await db.select().from(users).where(eq(users.uid, params.uid));
  const actor = actorRows[0];
  if (!actor) {
    throw new AuthValidationError('User account not found.');
  }
  if (actor.role === 'admin') {
    throw new AuthValidationError(
      'Admin accounts cannot avail student compartments. Kiosk locker booking is restricted to students.'
    );
  }

  const existingActive = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userUid, actor.uid), eq(sessions.status, 'active')))
    .limit(1);
  if (existingActive[0]) {
    throw new AuthValidationError(
      `You already have an active session in ${formatCompartmentLabel(
        existingActive[0].slotNumber
      )}. Please retrieve your item and end your session before using another compartment.`
    );
  }

  const targetStationId = params.stationId?.trim() || UNICHARGE_STATION_ID;
  const stationRows = await db
    .select()
    .from(stations)
    .where(eq(stations.id, targetStationId));
  const station =
    stationRows[0] ||
    (await db.select().from(stations).where(eq(stations.id, UNICHARGE_STATION_ID)))[0];
  if (!station) {
    throw new AuthValidationError('UniCharge station was not found.');
  }

  const insertedToken = await db.transaction(async (tx) => {
    const lockedActorRows = await tx
      .select()
      .from(users)
      .where(eq(users.uid, actor.uid))
      .for('update');
    const lockedActor = lockedActorRows[0];
    if (!lockedActor) {
      throw new AuthValidationError('User account not found.');
    }

    const activeSession = await tx
      .select({ slotNumber: sessions.slotNumber })
      .from(sessions)
      .where(and(eq(sessions.userUid, lockedActor.uid), eq(sessions.status, 'active')))
      .limit(1);
    if (activeSession[0]) {
      throw new AuthValidationError(
        `You already have an active session in ${formatCompartmentLabel(
          activeSession[0].slotNumber
        )}. Please retrieve your item and end your session before using another compartment.`
      );
    }
    // Release any prior unused reservation held by this student first
    const priorTokens = await tx
      .update(lockerUnlockTokens)
      .set({ used: true })
      .where(
        and(
          eq(lockerUnlockTokens.userUid, lockedActor.uid),
          eq(lockerUnlockTokens.used, false)
        )
      )
      .returning();

    for (const prev of priorTokens) {
      const activeOnSlot = await tx
        .select({ id: sessions.id })
        .from(sessions)
        .where(
          and(
            eq(sessions.stationId, prev.stationId),
            eq(sessions.slotNumber, prev.slotNumber),
            eq(sessions.status, 'active')
          )
        )
        .limit(1);

      if (activeOnSlot.length === 0) {
        await tx
          .update(lockerSlots)
          .set({ status: 'available', isDoorOpen: false, isLocked: true })
          .where(
            and(
              eq(lockerSlots.stationId, prev.stationId),
              eq(lockerSlots.slotNumber, prev.slotNumber),
              eq(lockerSlots.status, 'in_use')
            )
          );
      }
    }

    const slotRows = await tx
      .select()
      .from(lockerSlots)
      .where(eq(lockerSlots.stationId, station.id))
      .orderBy(asc(lockerSlots.slotNumber));

    const requestedSlot =
      typeof params.slotNumber === 'number'
        ? slotRows.find((s) => s.slotNumber === params.slotNumber)
        : slotRows.find(
            (s) =>
              s.status === 'available' &&
              getCompartmentCategory(s.slotNumber) === validService
          );

    if (!requestedSlot || requestedSlot.status !== 'available') {
      throw new AuthValidationError(
        'Selected compartment is no longer available. Please choose a free compartment.'
      );
    }

    if (getCompartmentCategory(requestedSlot.slotNumber) !== validService) {
      throw new AuthValidationError(
        `${formatCompartmentLabel(requestedSlot.slotNumber)} is reserved for ${getCompartmentCategory(
          requestedSlot.slotNumber
        )} only.`
      );
    }

    // Reserve compartment as busy (in_use) immediately so Admin & other students see it
    const claimedSlot = await tx
      .update(lockerSlots)
      .set({ status: 'in_use', isDoorOpen: false, isLocked: true })
      .where(
        and(
          eq(lockerSlots.stationId, station.id),
          eq(lockerSlots.slotNumber, requestedSlot.slotNumber),
          eq(lockerSlots.status, 'available')
        )
      )
      .returning({ id: lockerSlots.id });
    if (!claimedSlot[0]) {
      throw new AuthValidationError(
        'Selected compartment is no longer available. Please choose a free compartment.'
      );
    }

    const pinCode = String(crypto.randomInt(100000, 1000000));
    const tokenId = `TOK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const compartmentCode = formatCompartmentCode(requestedSlot.slotNumber);
    const qrPayload = `UNICHARGE|${station.campusCode}|SLOT-${compartmentCode}|PIN-${pinCode}|${tokenId}`;
    const expiresAt = new Date(Date.now() + UNLOCK_TOKEN_TTL_MS);

    const [created] = await tx
      .insert(lockerUnlockTokens)
      .values({
        tokenId,
        userUid: lockedActor.uid,
        stationId: station.id,
        stationName: station.name,
        stationCode: station.campusCode,
        slotNumber: requestedSlot.slotNumber,
        serviceType: validService,
        compartmentSize: resolvedTier.name,
        durationMinutes,
        totalFee,
        paymentMethod: validPayment,
        pinCode,
        qrPayload,
        used: false,
        expiresAt,
      })
      .returning();

    return created;
  });

  const updatedStations = await fetchStationsWithSlots();

  return {
    token: mapUnlockTokenRow(insertedToken),
    userEmail: actor.email,
    userName: actor.name,
    stations: updatedStations,
  };
}

export async function getUnlockTokenByIdDb(
  uid: string,
  tokenId: string
): Promise<{ token: PendingUnlockToken; userEmail: string; userName: string }> {
  const userRows = await db.select().from(users).where(eq(users.uid, uid));
  const actor = userRows[0];
  if (!actor) {
    throw new AuthValidationError('User account not found.');
  }

  const rows = await db
    .select()
    .from(lockerUnlockTokens)
    .where(
      and(
        eq(lockerUnlockTokens.userUid, actor.uid),
        eq(lockerUnlockTokens.tokenId, tokenId.trim()),
        eq(lockerUnlockTokens.used, false)
      )
    );

  const record = rows[0];
  if (!record) {
    throw new AuthValidationError('No active QR unlock pass found.');
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new AuthValidationError(
      'Your QR unlock pass has expired. Please generate a new QR pass.'
    );
  }

  return {
    token: mapUnlockTokenRow(record),
    userEmail: actor.email,
    userName: actor.name,
  };
}

export async function cancelUnlockTokenDb(
  uid: string,
  tokenId: string
): Promise<KioskStation[]> {
  await db.transaction(async (tx) => {
    const cancelled = await tx
      .update(lockerUnlockTokens)
      .set({ used: true })
      .where(
        and(
          eq(lockerUnlockTokens.userUid, uid),
          eq(lockerUnlockTokens.tokenId, tokenId.trim()),
          eq(lockerUnlockTokens.used, false)
        )
      )
      .returning();

    for (const tok of cancelled) {
      const activeOnSlot = await tx
        .select({ id: sessions.id })
        .from(sessions)
        .where(
          and(
            eq(sessions.stationId, tok.stationId),
            eq(sessions.slotNumber, tok.slotNumber),
            eq(sessions.status, 'active')
          )
        )
        .limit(1);

      if (activeOnSlot.length === 0) {
        await tx
          .update(lockerSlots)
          .set({ status: 'available', isDoorOpen: false, isLocked: true })
          .where(
            and(
              eq(lockerSlots.stationId, tok.stationId),
              eq(lockerSlots.slotNumber, tok.slotNumber),
              eq(lockerSlots.status, 'in_use')
            )
          );
      }
    }
  });

  return fetchStationsWithSlots();
}

export type VerifyKioskUnlockResult =
  | {
      action: 'unlocked';
      user: UserAccount;
      session: ActiveSession;
      stations: KioskStation[];
      walletTransactions: WalletTransaction[];
      coinChangeCredited?: number;
      message: string;
    }
  | {
      action: 'retrieved';
      user: UserAccount | null;
      stations: KioskStation[];
      retrievedSlotNumber: number;
      receiptNumber: string;
      message: string;
    }
  | {
      requiresCoinPayment: true;
      token: PendingUnlockToken;
      user: UserAccount;
      stations: KioskStation[];
      message: string;
    };

export async function verifyAndConsumeUnlockTokenDb(params: {
  actorUid?: string | null;
  pinOrQrPayload: string;
  kioskStationId: string;
  coinInsertedAmount?: number;
}): Promise<VerifyKioskUnlockResult> {
  await ensureCatalogSeeded();
  await releaseExpiredReservationsDb();
  const cleaned = params.pinOrQrPayload.trim();
  const targetKioskId = params.kioskStationId.trim();

  if (!cleaned) {
    throw new AuthValidationError(
      'Please scan a valid UniCharge QR code or enter your 6-digit PIN.'
    );
  }
  if (!targetKioskId) {
    throw new AuthValidationError('Missing kiosk station identifier.');
  }

  let actor: typeof users.$inferSelect | null = null;
  if (params.actorUid) {
    const actorRows = await db.select().from(users).where(eq(users.uid, params.actorUid));
    actor = actorRows[0] ?? null;
    if (!actor) {
      throw new AuthValidationError('Authenticated account not found.');
    }
  }

  const isSixDigitPin = /^\d{6}$/.test(cleaned);

  const matchingRows = !actor
    ? []
    : isSixDigitPin
    ? await db
        .select()
        .from(lockerUnlockTokens)
        .where(
          and(
            eq(lockerUnlockTokens.userUid, actor.uid),
            eq(lockerUnlockTokens.pinCode, cleaned),
            eq(lockerUnlockTokens.used, false)
          )
        )
        .orderBy(desc(lockerUnlockTokens.createdAt))
        .limit(1)
    : await db
        .select()
        .from(lockerUnlockTokens)
        .where(
          or(
            eq(lockerUnlockTokens.qrPayload, cleaned),
            eq(lockerUnlockTokens.tokenId, cleaned)
          )
        )
        .orderBy(desc(lockerUnlockTokens.createdAt))
        .limit(1);

  const tokenRow = matchingRows[0];
  if (!tokenRow) {
    // Allow kiosk retrieval of an active session via its 6-digit PIN or QR code
    const activeSessionRows = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.stationId, targetKioskId),
          eq(sessions.status, 'active')
        )
      )
      .orderBy(desc(sessions.createdAt));

    const matchedActiveSession = activeSessionRows.find((row) => {
      const code = row.qrVerificationCode || '';
      const isAuthorizedForRow = actor
        ? actor.role === 'admin' || row.userUid === actor.uid
        : false;

      if (!isAuthorizedForRow) return false;
      if (isSixDigitPin) {
        return code.includes(`PIN-${cleaned}`);
      }
      return code === cleaned || row.sessionId === cleaned;
    });

    if (matchedActiveSession) {
      const receiptNumber = `USTP-REC-${crypto.randomInt(100000, 1000000)}`;
      const dateLabel = formatSessionDateTime(new Date());

      await db.transaction(async (tx) => {
        await tx
          .update(sessions)
          .set({
            status: 'completed',
            remainingSeconds: 0,
            receiptNumber,
            dateLabel,
          })
          .where(eq(sessions.id, matchedActiveSession.id));

        await tx
          .update(lockerSlots)
          .set({ status: 'available', isDoorOpen: true, isLocked: false })
          .where(
            and(
              eq(lockerSlots.stationId, matchedActiveSession.stationId),
              eq(lockerSlots.slotNumber, matchedActiveSession.slotNumber)
            )
          );
      });

      const updatedStations = await fetchStationsWithSlots();
      return {
        action: 'retrieved',
        user: actor ? mapUserRow(actor) : null,
        stations: updatedStations,
        retrievedSlotNumber: matchedActiveSession.slotNumber,
        receiptNumber,
        message: `Retrieval Verified! ${formatCompartmentLabel(
          matchedActiveSession.slotNumber
        )} unlocked. Please retrieve your belongings and close the door (Receipt ${receiptNumber}).`,
      };
    }

    throw new AuthValidationError(
      actor
        ? 'Invalid QR code or 6-digit PIN. Hold your active UniCharge QR directly to the camera or check your email pass.'
        : 'Please sign in to your UniCharge student account before scanning or entering a PIN.'
    );
  }

  if (!actor || actor.role === 'admin' || tokenRow.userUid !== actor.uid) {
    throw new AuthValidationError(
      actor?.role === 'admin'
        ? 'Admin accounts cannot redeem student kiosk booking passes. Use Force Unlock for administrative overrides.'
        : 'This QR unlock pass belongs to a different UniCharge student account.'
    );
  }

  if (tokenRow.used) {
    throw new AuthValidationError(
      'This QR unlock pass has already been redeemed. Avail a locker to generate a new pass.'
    );
  }

  if (tokenRow.expiresAt.getTime() < Date.now()) {
    await db
      .update(lockerUnlockTokens)
      .set({ used: true })
      .where(eq(lockerUnlockTokens.id, tokenRow.id));
    await releaseExpiredReservationsDb();
    throw new AuthValidationError(
      'Reservation timed out (5-minute limit) — compartment released with ₱0 charged. Please avail again.'
    );
  }

  if (tokenRow.stationId !== targetKioskId) {
    throw new AuthValidationError(
      `Wrong kiosk! This QR authorizes ${tokenRow.stationName} (${tokenRow.stationCode}). Switch the kiosk selector to ${tokenRow.stationCode} to scan.`
    );
  }

  const preResolvedTier = resolvePricingTier({
    tierId: tokenRow.compartmentSize,
    serviceType: tokenRow.serviceType,
    durationMinutes: tokenRow.durationMinutes,
    slotNumber: tokenRow.slotNumber,
  });

  if (tokenRow.paymentMethod === 'cash') {
    const insertedCoins = Number(params.coinInsertedAmount ?? 0);
    if (!Number.isFinite(insertedCoins) || insertedCoins < preResolvedTier.fee) {
      const currentStations = await fetchStationsWithSlots();
      return {
        requiresCoinPayment: true,
        token: mapUnlockTokenRow(tokenRow),
        user: mapUserRow(actor),
        stations: currentStations,
        message: `Insert ₱${preResolvedTier.fee.toFixed(2)} in coins into the kiosk coin slot to unlock ${formatCompartmentLabel(
          tokenRow.slotNumber
        )}.`,
      };
    }
    if (!hasExactCurrencyAmount(insertedCoins, preResolvedTier.fee)) {
      throw new AuthValidationError(
        `Exact payment is required: insert ₱${preResolvedTier.fee.toFixed(
          2
        )}. Overpayment is not accepted.`
      );
    }
  }

  const result = await db.transaction(async (tx) => {
    const consumed = await tx
      .update(lockerUnlockTokens)
      .set({ used: true })
      .where(
        and(
          eq(lockerUnlockTokens.id, tokenRow.id),
          eq(lockerUnlockTokens.used, false)
        )
      )
      .returning();

    if (!consumed[0]) {
      throw new AuthValidationError('This QR unlock pass has already been redeemed.');
    }

    const slotRows = await tx
      .select()
      .from(lockerSlots)
      .where(
        and(
          eq(lockerSlots.stationId, tokenRow.stationId),
          eq(lockerSlots.slotNumber, tokenRow.slotNumber)
        )
      );
    const targetSlot = slotRows[0];
    if (!targetSlot || targetSlot.status === 'maintenance') {
      throw new AuthValidationError(
        `${formatCompartmentLabel(tokenRow.slotNumber)} is unavailable or under maintenance.`
      );
    }

    const activeSessionsOnSlot = await tx
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.stationId, tokenRow.stationId),
          eq(sessions.slotNumber, tokenRow.slotNumber),
          eq(sessions.status, 'active')
        )
      )
      .limit(1);

    if (activeSessionsOnSlot.length > 0) {
      throw new AuthValidationError(
        `${formatCompartmentLabel(tokenRow.slotNumber)} already has an active session.`
      );
    }

    const ownerRows = await tx
      .select()
      .from(users)
      .where(eq(users.uid, tokenRow.userUid))
      .for('update');
    const owner = ownerRows[0];
    if (!owner) {
      throw new AuthValidationError('Account associated with this QR pass was not found.');
    }
    if (owner.role === 'admin') {
      throw new AuthValidationError('Admin accounts cannot start student locker sessions.');
    }

    const ownerActiveSessions = await tx
      .select({ slotNumber: sessions.slotNumber })
      .from(sessions)
      .where(and(eq(sessions.userUid, owner.uid), eq(sessions.status, 'active')))
      .limit(1);
    if (ownerActiveSessions[0]) {
      throw new AuthValidationError(
        `You already have an active session in ${formatCompartmentLabel(
          ownerActiveSessions[0].slotNumber
        )}. Retrieve your item and end that session first.`
      );
    }

    const stationRows = await tx
      .select()
      .from(stations)
      .where(eq(stations.id, tokenRow.stationId));
    const targetStation = stationRows[0];

    const resolvedTier = resolvePricingTier({
      tierId: tokenRow.compartmentSize,
      serviceType: tokenRow.serviceType,
      durationMinutes: tokenRow.durationMinutes,
      slotNumber: tokenRow.slotNumber,
    });
    const computedFee = resolvedTier.fee;

    let updatedOwner = owner;
    let coinChangeCredited = 0;

    if (tokenRow.paymentMethod === 'wallet') {
      const currentBalance = Number(owner.walletBalance ?? 0);
      if (currentBalance < computedFee) {
        throw new AuthValidationError(
          `Insufficient wallet balance (₱${currentBalance.toFixed(2)}).`
        );
      }
      const nextBalance = currentBalance - computedFee;
      const savedOwner = await tx
        .update(users)
        .set({ walletBalance: nextBalance })
        .where(eq(users.uid, owner.uid))
        .returning();
      updatedOwner = savedOwner[0];
    } else if (tokenRow.paymentMethod === 'cash') {
      const insertedCoins = Number(params.coinInsertedAmount ?? 0);
      if (!hasExactCurrencyAmount(insertedCoins, computedFee)) {
        throw new AuthValidationError(
          `Exact payment is required: insert ₱${computedFee.toFixed(
            2
          )}. Overpayment is not accepted.`
        );
      }
    }

    await tx
      .update(lockerSlots)
      .set({ status: 'in_use', isDoorOpen: true, isLocked: false })
      .where(
        and(
          eq(lockerSlots.stationId, tokenRow.stationId),
          eq(lockerSlots.slotNumber, tokenRow.slotNumber)
        )
      );

    const sessionId = `USTP-SES-${crypto.randomInt(10000, 100000)}`;
    const nowMs = Date.now();
    const newSession: ActiveSession = {
      sessionId,
      stationId: tokenRow.stationId,
      stationName: tokenRow.stationName,
      building: targetStation?.building || tokenRow.stationName,
      slotNumber: tokenRow.slotNumber,
      serviceType: resolvedTier.serviceType,
      pricingTier: resolvedTier.name,
      startTime: nowMs,
      durationMinutes: resolvedTier.durationMinutes,
      remainingSeconds: resolvedTier.durationMinutes * 60,
      totalFee: computedFee,
      batteryInitial: 38,
      batteryCurrent: 38,
      chargingRateWatts: resolvedTier.serviceType === 'storage' ? 0 : 58.4,
      lockerTemperature: 28.6,
      isOverchargeProtectionActive: true,
      isTamperAlertArmed: true,
      status: 'active',
      qrVerificationCode: tokenRow.qrPayload,
    };

    await tx.insert(sessions).values({
      sessionId: newSession.sessionId,
      userUid: owner.uid,
      stationId: newSession.stationId,
      stationName: newSession.stationName,
      building: newSession.building,
      slotNumber: newSession.slotNumber,
      serviceType: newSession.serviceType,
      compartmentSize: newSession.pricingTier,
      startTimeMs: newSession.startTime,
      durationMinutes: newSession.durationMinutes,
      remainingSeconds: newSession.remainingSeconds,
      totalFee: newSession.totalFee,
      batteryInitial: newSession.batteryInitial,
      batteryCurrent: newSession.batteryCurrent,
      chargingRateWatts: newSession.chargingRateWatts,
      lockerTemperature: newSession.lockerTemperature,
      isOverchargeProtectionActive: newSession.isOverchargeProtectionActive,
      isTamperAlertArmed: newSession.isTamperAlertArmed,
      status: 'active',
      paymentMethod: tokenRow.paymentMethod,
      qrVerificationCode: newSession.qrVerificationCode,
    });

    const compartmentLabel = formatCompartmentLabel(newSession.slotNumber);
    const currentWalletBalance = Number(updatedOwner.walletBalance ?? 0);
    const normalizedTokenMethod = normalizePaymentMethod(tokenRow.paymentMethod);
    if (normalizedTokenMethod === 'cash') {
      await recordWalletTransaction(tx, {
        userUid: owner.uid,
        kind: 'coin_payment',
        paymentSource: 'cash',
        title: `${resolvedTier.name} (${compartmentLabel})`,
        referenceCode: sessionId,
        amount: computedFee,
        walletDelta: 0,
        balanceAfter: currentWalletBalance,
      });
    } else if (
      normalizedTokenMethod === 'gcash' ||
      normalizedTokenMethod === 'maya' ||
      normalizedTokenMethod === 'gotyme'
    ) {
      await recordWalletTransaction(tx, {
        userUid: owner.uid,
        kind: 'ewallet_payment',
        paymentSource: normalizedTokenMethod,
        title: `${resolvedTier.name} (${compartmentLabel}) · ${formatEpaymentTitle(normalizedTokenMethod)}`,
        referenceCode: sessionId,
        amount: computedFee,
        walletDelta: 0,
        balanceAfter: currentWalletBalance,
      });
    } else {
      await recordWalletTransaction(tx, {
        userUid: owner.uid,
        kind: 'ewallet_payment',
        paymentSource: 'wallet',
        title: `${resolvedTier.name} (${compartmentLabel})`,
        referenceCode: sessionId,
        amount: computedFee,
        walletDelta: -computedFee,
        balanceAfter: currentWalletBalance,
      });
    }

    return { updatedOwner, newSession, coinChangeCredited };
  });

  const [updatedStations, walletTxList] = await Promise.all([
    fetchStationsWithSlots(),
    fetchWalletTransactionsDb(result.updatedOwner.uid),
  ]);
  return {
    action: 'unlocked',
    user: mapUserRow(result.updatedOwner),
    session: result.newSession,
    stations: updatedStations,
    walletTransactions: walletTxList,
    coinChangeCredited: result.coinChangeCredited,
    message: `Exact coin payment accepted. Kiosk Verified! ${formatCompartmentLabel(
      result.newSession.slotNumber
    )} Solenoid Unlatched at ${result.newSession.stationName}.`,
  };
}

export async function coinWalkUpUnlockDb(params: {
  uid?: string | null;
  stationId?: string;
  slotNumber: number;
  serviceType?: ServiceType | string;
  tierId?: string;
  coinInsertedAmount: number;
  customPin: string;
}): Promise<{
  user: UserAccount | null;
  ownerUid: string | null;
  ownerName: string;
  session: ActiveSession;
  stations: KioskStation[];
  walletTransactions: WalletTransaction[];
  retrievalPin: string;
  coinChangeCredited: number;
  coinChangeDispensed: number;
  message: string;
}> {
  await ensureCatalogSeeded();
  await releaseExpiredReservationsDb();

  if (!params.uid) {
    throw new AuthValidationError(
      'Please sign in to your UniCharge student account before using the kiosk.'
    );
  }
  const actorRows = await db.select().from(users).where(eq(users.uid, params.uid));
  const actor = actorRows[0] ?? null;
  if (!actor) {
    throw new AuthValidationError('Authenticated account not found.');
  }
  if (actor.role === 'admin') {
    throw new AuthValidationError(
      'Admin accounts cannot use the student kiosk terminal. Kiosk rentals are for students only.'
    );
  }

  const targetStationId = params.stationId?.trim() || UNICHARGE_STATION_ID;
  const stationRows = await db
    .select()
    .from(stations)
    .where(eq(stations.id, targetStationId));
  const targetStation =
    stationRows[0] ||
    (await db.select().from(stations).where(eq(stations.id, UNICHARGE_STATION_ID)))[0];
  if (!targetStation) {
    throw new AuthValidationError('UniCharge station was not found.');
  }

  const slotNumber = Number(params.slotNumber);
  if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 20) {
    throw new AuthValidationError('Please select a valid FREE compartment (#01–#15 or S1–S5).');
  }

  const slotCategory = getCompartmentCategory(slotNumber);
  const resolvedTier = resolvePricingTier({
    tierId: params.tierId,
    serviceType: params.serviceType || slotCategory,
    slotNumber,
  });

  if (resolvedTier.serviceType !== slotCategory) {
    throw new AuthValidationError(
      `${formatCompartmentLabel(slotNumber)} is for ${slotCategory} only.`
    );
  }

  const cleanCustomPin = (params.customPin || '').trim();
  if (!/^\d{6}$/.test(cleanCustomPin)) {
    throw new AuthValidationError(
      'Please enter your own 6-digit Retrieval PIN (numbers 0–9) before unlatching.'
    );
  }

  const insertedCoins = Number(params.coinInsertedAmount);
  if (!Number.isFinite(insertedCoins) || insertedCoins < resolvedTier.fee) {
    throw new AuthValidationError(
      `Insert at least ₱${resolvedTier.fee.toFixed(2)} in coins for ${resolvedTier.name} (Inserted: ₱${Math.max(
        0,
        insertedCoins || 0
      ).toFixed(2)}).`
    );
  }
  if (!hasExactCurrencyAmount(insertedCoins, resolvedTier.fee)) {
    throw new AuthValidationError(
      `Exact payment is required: insert ₱${resolvedTier.fee.toFixed(
        2
      )}. Overpayment is not accepted.`
    );
  }

  if (actor) {
    const existingActive = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userUid, actor.uid), eq(sessions.status, 'active')))
      .limit(1);

    if (existingActive[0]) {
      throw new AuthValidationError(
        `${actor.name} already has an active session on ${formatCompartmentLabel(
          existingActive[0].slotNumber
        )}. Retrieve it first before opening another compartment.`
      );
    }
  }

  const stationActiveRows = await db
    .select({ qrVerificationCode: sessions.qrVerificationCode })
    .from(sessions)
    .where(
      and(eq(sessions.stationId, targetStation.id), eq(sessions.status, 'active'))
    );
  const pinInUse = stationActiveRows.some((r) =>
    (r.qrVerificationCode || '').includes(`PIN-${cleanCustomPin}`)
  );
  if (pinInUse) {
    throw new AuthValidationError(
      'That 6-digit PIN is currently used by another active compartment. Please choose a different 6-digit PIN.'
    );
  }

  const result = await db.transaction(async (tx) => {
    const lockedActorRows = await tx
      .select()
      .from(users)
      .where(eq(users.uid, actor.uid))
      .for('update');
    const lockedActor = lockedActorRows[0];
    if (!lockedActor) {
      throw new AuthValidationError('Authenticated account not found.');
    }

    const activeSession = await tx
      .select({ slotNumber: sessions.slotNumber })
      .from(sessions)
      .where(and(eq(sessions.userUid, lockedActor.uid), eq(sessions.status, 'active')))
      .limit(1);
    if (activeSession[0]) {
      throw new AuthValidationError(
        `${lockedActor.name} already has an active session on ${formatCompartmentLabel(
          activeSession[0].slotNumber
        )}. Retrieve it first before opening another compartment.`
      );
    }

    const activePinRows = await tx
      .select({ qrVerificationCode: sessions.qrVerificationCode })
      .from(sessions)
      .where(and(eq(sessions.stationId, targetStation.id), eq(sessions.status, 'active')));
    if (
      activePinRows.some((row) =>
        (row.qrVerificationCode || '').includes(`PIN-${cleanCustomPin}`)
      )
    ) {
      throw new AuthValidationError(
        'That 6-digit PIN is currently used by another active compartment. Please choose a different 6-digit PIN.'
      );
    }

    {
      // Release any prior unused pending reservation owned by signed-in student
      const priorTokens = await tx
        .update(lockerUnlockTokens)
        .set({ used: true })
        .where(
          and(
            eq(lockerUnlockTokens.userUid, lockedActor.uid),
            eq(lockerUnlockTokens.used, false)
          )
        )
        .returning();

      for (const prev of priorTokens) {
        const activeOnSlot = await tx
          .select({ id: sessions.id })
          .from(sessions)
          .where(
            and(
              eq(sessions.stationId, prev.stationId),
              eq(sessions.slotNumber, prev.slotNumber),
              eq(sessions.status, 'active')
            )
          )
          .limit(1);

        if (activeOnSlot.length === 0) {
          await tx
            .update(lockerSlots)
            .set({ status: 'available', isDoorOpen: false, isLocked: true })
            .where(
              and(
                eq(lockerSlots.stationId, prev.stationId),
                eq(lockerSlots.slotNumber, prev.slotNumber),
                eq(lockerSlots.status, 'in_use')
              )
            );
        }
      }
    }

    const slotRows = await tx
      .select()
      .from(lockerSlots)
      .where(
        and(
          eq(lockerSlots.stationId, targetStation.id),
          eq(lockerSlots.slotNumber, slotNumber)
        )
      );
    const targetSlot = slotRows[0];
    if (!targetSlot || targetSlot.status !== 'available') {
      throw new AuthValidationError(
        `${formatCompartmentLabel(slotNumber)} is no longer available. Please choose another FREE compartment.`
      );
    }

    const activeSessionsOnSlot = await tx
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.stationId, targetStation.id),
          eq(sessions.slotNumber, slotNumber),
          eq(sessions.status, 'active')
        )
      )
      .limit(1);
    if (activeSessionsOnSlot.length > 0) {
      throw new AuthValidationError(
        `${formatCompartmentLabel(slotNumber)} already has an active session.`
      );
    }

    let updatedOwner = lockedActor;

    const claimedSlot = await tx
      .update(lockerSlots)
      .set({ status: 'in_use', isDoorOpen: true, isLocked: false })
      .where(
        and(
          eq(lockerSlots.stationId, targetStation.id),
          eq(lockerSlots.slotNumber, slotNumber),
          eq(lockerSlots.status, 'available')
        )
      )
      .returning({ id: lockerSlots.id });
    if (!claimedSlot[0]) {
      throw new AuthValidationError(
        `${formatCompartmentLabel(slotNumber)} is no longer available. Please choose another FREE compartment.`
      );
    }

    const retrievalPin = cleanCustomPin;
    const coinTxId = `COIN-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const compartmentCode = formatCompartmentCode(slotNumber);
    const qrVerificationCode = `UNICHARGE|${targetStation.campusCode}|SLOT-${compartmentCode}|PIN-${retrievalPin}|${coinTxId}`;
    const sessionId = `USTP-SES-${crypto.randomInt(10000, 100000)}`;
    const nowMs = Date.now();

    const newSession: ActiveSession = {
      sessionId,
      stationId: targetStation.id,
      stationName: targetStation.name,
      building: targetStation.building,
      slotNumber,
      serviceType: resolvedTier.serviceType,
      pricingTier: resolvedTier.name,
      startTime: nowMs,
      durationMinutes: resolvedTier.durationMinutes,
      remainingSeconds: resolvedTier.durationMinutes * 60,
      totalFee: resolvedTier.fee,
      batteryInitial: 38,
      batteryCurrent: 38,
      chargingRateWatts: resolvedTier.serviceType === 'storage' ? 0 : 58.4,
      lockerTemperature: 28.6,
      isOverchargeProtectionActive: true,
      isTamperAlertArmed: true,
      status: 'active',
      qrVerificationCode,
    };

    await tx.insert(sessions).values({
      sessionId: newSession.sessionId,
      userUid: actor ? actor.uid : null,
      stationId: newSession.stationId,
      stationName: newSession.stationName,
      building: newSession.building,
      slotNumber: newSession.slotNumber,
      serviceType: newSession.serviceType,
      compartmentSize: newSession.pricingTier,
      startTimeMs: newSession.startTime,
      durationMinutes: newSession.durationMinutes,
      remainingSeconds: newSession.remainingSeconds,
      totalFee: newSession.totalFee,
      batteryInitial: newSession.batteryInitial,
      batteryCurrent: newSession.batteryCurrent,
      chargingRateWatts: newSession.chargingRateWatts,
      lockerTemperature: newSession.lockerTemperature,
      isOverchargeProtectionActive: newSession.isOverchargeProtectionActive,
      isTamperAlertArmed: newSession.isTamperAlertArmed,
      status: 'active',
      paymentMethod: 'cash',
      qrVerificationCode: newSession.qrVerificationCode,
    });

    if (actor && updatedOwner) {
      const slotLabel = formatCompartmentLabel(slotNumber);
      const ownerBalanceAfter = Number(updatedOwner.walletBalance ?? 0);
      await recordWalletTransaction(tx, {
        userUid: actor.uid,
        kind: 'coin_payment',
        paymentSource: 'cash',
        title: `${resolvedTier.name} (${slotLabel})`,
        referenceCode: sessionId,
        amount: resolvedTier.fee,
        walletDelta: 0,
        balanceAfter: ownerBalanceAfter,
      });

    }

    return {
      updatedOwner,
      newSession,
      retrievalPin,
      coinChangeCredited: 0,
      coinChangeDispensed: 0,
    };
  });

  const [updatedStations, walletTxList] = await Promise.all([
    fetchStationsWithSlots(),
    actor ? fetchWalletTransactionsDb(actor.uid) : Promise.resolve([]),
  ]);
  return {
    user: result.updatedOwner ? mapUserRow(result.updatedOwner) : null,
    ownerUid: actor.uid,
    ownerName: actor.name,
    session: result.newSession,
    stations: updatedStations,
    walletTransactions: walletTxList,
    retrievalPin: result.retrievalPin,
    coinChangeCredited: result.coinChangeCredited,
    coinChangeDispensed: result.coinChangeDispensed,
    message: `Exact coin payment accepted (₱${resolvedTier.fee.toFixed(2)})! ${formatCompartmentLabel(
      slotNumber
    )} unlatched for ${actor.name}. Place phone inside & close door — enter your PIN ${result.retrievalPin} later to retrieve.`,
  };
}

export async function topUpWalletDb(params: {
  uid: string;
  amount: number;
  source?: 'wallet' | 'gcash' | 'maya' | 'gotyme';
  referenceCode?: string;
}): Promise<{ user: UserAccount; walletTransactions: WalletTransaction[] }> {
  const source: WalletTransactionSource =
    params.source === 'gcash' || params.source === 'maya' || params.source === 'gotyme'
      ? params.source
      : 'wallet';
  const prefix =
    source === 'gcash'
      ? 'GCASH'
      : source === 'maya'
      ? 'MAYA'
      : source === 'gotyme'
      ? 'GOTYME'
      : 'WLT';
  const cleanRef =
    params.referenceCode?.trim() || `${prefix}-${crypto.randomInt(100000, 1000000)}`;
  const platformLabel = formatEpaymentTitle(source);

  if (!Number.isFinite(params.amount) || params.amount < 10 || params.amount > 5000) {
    throw new AuthValidationError('Reload amount must be between ₱10 and ₱5,000.');
  }

  try {
    const updatedUser = await db.transaction(async (tx) => {
      const existing = await tx.select().from(users).where(eq(users.uid, params.uid));
      if (!existing[0]) {
        throw new AuthValidationError('User account not found.');
      }
      const nextBalance = +(Number(existing[0].walletBalance) + params.amount).toFixed(2);
      const updated = await tx
        .update(users)
        .set({ walletBalance: nextBalance })
        .where(eq(users.uid, params.uid))
        .returning();

      await recordWalletTransaction(tx, {
        userUid: params.uid,
        kind: 'reload',
        paymentSource: source,
        title: `Campus E-Wallet Reload (${platformLabel})`,
        referenceCode: cleanRef,
        amount: params.amount,
        walletDelta: params.amount,
        balanceAfter: nextBalance,
      });

      return updated[0];
    });

    const txList = await fetchWalletTransactionsDb(params.uid);
    return { user: mapUserRow(updatedUser), walletTransactions: txList };
  } catch (error) {
    if (error instanceof AuthValidationError) throw error;
    console.error('Database top-up failed:', error);
    throw new Error('Failed to update wallet balance.', { cause: error });
  }
}

export async function updateUserProfileDb(
  uid: string,
  updates: {
    name?: string;
    college?: string;
    degree?: string;
    avatar?: string;
    biometricEnabled?: boolean;
    pushNotifications?: boolean;
    overchargeAlerts?: boolean;
  }
): Promise<UserAccount> {
  try {
    const updatedUser = await db.transaction(async (tx) => {
      const currentRows = await tx
        .select()
        .from(users)
        .where(eq(users.uid, uid))
        .for('update');
      const existingUser = currentRows[0];
      if (!existingUser) {
        throw new AuthValidationError('User account not found.');
      }

      const nextName = updates.name?.trim() ?? existingUser.name;
      if (updates.name !== undefined && nextName.length < 2) {
        throw new AuthValidationError('Please enter your full name (at least 2 characters).');
      }

      if (updates.name !== undefined) {
        await lockIdentity(tx, nextName);
        if (normalizeAccountName(nextName) !== normalizeAccountName(existingUser.name)) {
          const duplicateName = await tx
            .select({ uid: users.uid })
            .from(users)
            .where(
              and(
                eq(normalizedNameColumn(), normalizeAccountName(nextName)),
                ne(users.uid, uid)
              )
            )
            .limit(1);
          if (duplicateName[0]) {
            throw new AuthConflictError(
              'This name is already registered to another account.'
            );
          }
        }
      }

      if (
        (updates.college !== undefined || updates.degree !== undefined) &&
        existingUser.role !== 'admin'
      ) {
        const nextCollege = (updates.college ?? existingUser.college).trim();
        const nextDegree = (updates.degree ?? existingUser.degree).trim();
        if (!ALLOWED_USTP_COLLEGE_VALUES.has(nextCollege)) {
          throw new AuthValidationError('Please select a valid USTP college from the list.');
        }
        if (!nextDegree) {
          throw new AuthValidationError('Please select your Course / Program from the dropdown menu.');
        }
        if (!isCourseValidForCollege(nextCollege, nextDegree)) {
          throw new AuthValidationError('Selected course does not belong to the chosen college.');
        }
      }

      const [savedUser] = await tx
        .update(users)
        .set({
          ...(updates.name !== undefined ? { name: nextName } : {}),
          ...(updates.college !== undefined ? { college: updates.college.trim() } : {}),
          ...(updates.degree !== undefined ? { degree: updates.degree.trim() } : {}),
          ...(updates.avatar !== undefined ? { avatar: updates.avatar } : {}),
          ...(updates.biometricEnabled !== undefined
            ? { biometricEnabled: updates.biometricEnabled }
            : {}),
          ...(updates.pushNotifications !== undefined
            ? { pushNotifications: updates.pushNotifications }
            : {}),
          ...(updates.overchargeAlerts !== undefined
            ? { overchargeAlerts: updates.overchargeAlerts }
            : {}),
        })
        .where(eq(users.uid, uid))
        .returning();
      return savedUser;
    });

    return mapUserRow(updatedUser);
  } catch (error) {
    if (error instanceof AuthConflictError || error instanceof AuthValidationError) {
      throw error;
    }
    console.error('Database profile update failed:', error);
    throw new Error('Failed to update profile.', { cause: error });
  }
}

export async function startSessionDb(params: {
  uid: string;
  session: ActiveSession;
  deductWalletAmount: number;
}): Promise<{ user: UserAccount; session: ActiveSession; stations: KioskStation[] }> {
  try {
    const result = await db.transaction(async (tx) => {
      const userRows = await tx
        .select()
        .from(users)
        .where(eq(users.uid, params.uid))
        .for('update');
      const existingUser = userRows[0];
      if (!existingUser) {
        throw new AuthValidationError('User account not found.');
      }
      if (existingUser.role === 'admin') {
        throw new AuthValidationError('Admin accounts cannot start student locker sessions.');
      }

      const existingActive = await tx
        .select({ slotNumber: sessions.slotNumber })
        .from(sessions)
        .where(and(eq(sessions.userUid, params.uid), eq(sessions.status, 'active')))
        .limit(1);
      if (existingActive[0]) {
        throw new AuthValidationError(
          `You already have an active session in ${formatCompartmentLabel(
            existingActive[0].slotNumber
          )}. Retrieve your item and end it first.`
        );
      }

      if (!Number.isFinite(params.deductWalletAmount) || params.deductWalletAmount !== 0) {
        throw new AuthValidationError(
          'Campus E-Wallet is no longer available for locker bookings. Choose another payment method.'
        );
      }

      const resolvedTier = resolvePricingTier({
        tierId: params.session.pricingTier,
        serviceType: params.session.serviceType,
        durationMinutes: params.session.durationMinutes,
        slotNumber: params.session.slotNumber,
      });

      const finalUser = existingUser;

      const slotRows = await tx
        .select()
        .from(lockerSlots)
        .where(
          and(
            eq(lockerSlots.stationId, params.session.stationId),
            eq(lockerSlots.slotNumber, params.session.slotNumber)
          )
        );
      if (!slotRows[0] || slotRows[0].status !== 'available') {
        throw new AuthValidationError(
          `${formatCompartmentLabel(params.session.slotNumber)} is no longer available.`
        );
      }

      const claimedSlot = await tx
        .update(lockerSlots)
        .set({ status: 'in_use', isDoorOpen: true, isLocked: false })
        .where(
          and(
            eq(lockerSlots.stationId, params.session.stationId),
            eq(lockerSlots.slotNumber, params.session.slotNumber),
            eq(lockerSlots.status, 'available')
          )
        )
        .returning({ id: lockerSlots.id });
      if (!claimedSlot[0]) {
        throw new AuthValidationError(
          `${formatCompartmentLabel(params.session.slotNumber)} is no longer available.`
        );
      }

      await tx.insert(sessions).values({
        sessionId: params.session.sessionId,
        userUid: params.uid,
        stationId: params.session.stationId,
        stationName: params.session.stationName,
        building: params.session.building,
        slotNumber: params.session.slotNumber,
        serviceType: resolvedTier.serviceType,
        compartmentSize: resolvedTier.name,
        startTimeMs: params.session.startTime,
        durationMinutes: resolvedTier.durationMinutes,
        remainingSeconds: resolvedTier.durationMinutes * 60,
        totalFee: resolvedTier.fee,
        batteryInitial: params.session.batteryInitial,
        batteryCurrent: params.session.batteryCurrent,
        chargingRateWatts:
          resolvedTier.serviceType === 'storage' ? 0 : params.session.chargingRateWatts,
        lockerTemperature: params.session.lockerTemperature,
        isOverchargeProtectionActive: params.session.isOverchargeProtectionActive,
        isTamperAlertArmed: params.session.isTamperAlertArmed,
        status: 'active',
        qrVerificationCode: params.session.qrVerificationCode,
      });

      return { user: finalUser };
    });
    const updatedStations = await fetchStationsWithSlots();
    return {
      user: mapUserRow(result.user),
      session: params.session,
      stations: updatedStations,
    };
  } catch (error) {
    if (error instanceof AuthValidationError) throw error;
    console.error('Database start session failed:', error);
    throw new Error('Failed to start locker session.', { cause: error });
  }
}

export async function endSessionDb(params: {
  uid: string;
  sessionId: string;
  stationId: string;
  slotNumber: number;
  receiptNumber: string;
  dateLabel: string;
}): Promise<KioskStation[]> {
  try {
    await db
      .update(sessions)
      .set({
        status: 'completed',
        remainingSeconds: 0,
        receiptNumber: params.receiptNumber,
        dateLabel: params.dateLabel,
      })
      .where(
        and(
          eq(sessions.userUid, params.uid),
          eq(sessions.sessionId, params.sessionId)
        )
      );

    await db
      .update(lockerSlots)
      .set({ status: 'available', isDoorOpen: true, isLocked: false })
      .where(
        and(
          eq(lockerSlots.stationId, params.stationId),
          eq(lockerSlots.slotNumber, params.slotNumber)
        )
      );

    return fetchStationsWithSlots();
  } catch (error) {
    console.error('Database end session failed:', error);
    throw new Error('Failed to end locker session.', { cause: error });
  }
}

export async function updateKioskDoorStateDb(params: {
  uid?: string | null;
  role?: UserRole | null;
  stationId: string;
  slotNumber: number;
  isDoorOpen: boolean;
}): Promise<KioskStation[]> {
  const targetStationId = params.stationId?.trim() || UNICHARGE_STATION_ID;
  if (params.role !== 'admin') {
    if (params.uid) {
      const ownedSession = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(
          and(
            eq(sessions.userUid, params.uid),
            eq(sessions.stationId, targetStationId),
            eq(sessions.slotNumber, params.slotNumber)
          )
        )
        .limit(1);

      const ownedToken = await db
        .select({ id: lockerUnlockTokens.id })
        .from(lockerUnlockTokens)
        .where(
          and(
            eq(lockerUnlockTokens.userUid, params.uid),
            eq(lockerUnlockTokens.stationId, targetStationId),
            eq(lockerUnlockTokens.slotNumber, params.slotNumber)
          )
        )
        .limit(1);

      if (ownedSession.length === 0 && ownedToken.length === 0) {
        throw new AuthValidationError('You are not authorized to operate this compartment latch.');
      }
    } else {
      if (params.isDoorOpen) {
        throw new AuthValidationError('Authorization required to open compartment door.');
      }
      const slotRows = await db
        .select()
        .from(lockerSlots)
        .where(
          and(
            eq(lockerSlots.stationId, targetStationId),
            eq(lockerSlots.slotNumber, params.slotNumber)
          )
        )
        .limit(1);
      const slotRow = slotRows[0];
      if (!slotRow || !slotRow.isDoorOpen) {
        throw new AuthValidationError('Compartment door is already closed.');
      }
      const activeOnSlot = await db
        .select({ userUid: sessions.userUid })
        .from(sessions)
        .where(
          and(
            eq(sessions.stationId, targetStationId),
            eq(sessions.slotNumber, params.slotNumber),
            eq(sessions.status, 'active')
          )
        )
        .limit(1);
      if (activeOnSlot[0] && activeOnSlot[0].userUid !== null) {
        throw new AuthValidationError('Sign in to operate a registered student compartment latch.');
      }
    }
  }

  await db
    .update(lockerSlots)
    .set({
      isDoorOpen: params.isDoorOpen,
      isLocked: !params.isDoorOpen,
    })
    .where(
      and(
        eq(lockerSlots.stationId, targetStationId),
        eq(lockerSlots.slotNumber, params.slotNumber)
      )
    );

  return fetchStationsWithSlots();
}

export async function recordTamperAlertDb(params: {
  uid?: string | null;
  stationId?: string;
  slotNumber: number;
}): Promise<{ stations: KioskStation[]; securityAlerts: SecurityAlert[] }> {
  const targetStationId = params.stationId?.trim() || UNICHARGE_STATION_ID;
  if (!params.uid) {
    const activeOnSlot = await db
      .select({ userUid: sessions.userUid })
      .from(sessions)
      .where(
        and(
          eq(sessions.stationId, targetStationId),
          eq(sessions.slotNumber, params.slotNumber),
          eq(sessions.status, 'active')
        )
      )
      .limit(1);
    if (activeOnSlot[0] && activeOnSlot[0].userUid !== null) {
      throw new AuthValidationError('Sign in required to simulate tamper on an account compartment.');
    }
  }

  const stationRows = await db
    .select()
    .from(stations)
    .where(eq(stations.id, targetStationId));
  const station = stationRows[0];

  await db
    .update(lockerSlots)
    .set({ isDoorOpen: true, isLocked: false })
    .where(
      and(
        eq(lockerSlots.stationId, targetStationId),
        eq(lockerSlots.slotNumber, params.slotNumber)
      )
    );

  await db.insert(securityAlerts).values({
    id: `alt-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    timestampLabel: formatSessionDateTime(new Date()),
    stationCode: station?.campusCode || UNICHARGE_STATION_CODE,
    stationName: station?.name || UNICHARGE_STATION_NAME,
    slotNumber: params.slotNumber,
    severity: 'critical',
    type: 'Tamper Vibration',
    message: `Unexpected door opening detected on ${formatCompartmentLabel(
      params.slotNumber
    )} without QR/PIN retrieval authorization.`,
    resolved: false,
  });

  const [updatedStations, updatedAlerts] = await Promise.all([
    fetchStationsWithSlots(),
    fetchSecurityAlerts(),
  ]);
  return { stations: updatedStations, securityAlerts: updatedAlerts };
}

export async function adminUpdateSlotDb(params: {
  stationId: string;
  slotNumber: number;
  status: LockerStatus;
  isDoorOpen?: boolean;
  isLocked?: boolean;
}): Promise<KioskStation[]> {
  try {
    await db.transaction(async (tx) => {
      if (params.status === 'maintenance') {
        const [activeOnSlot, currentSlotRows] = await Promise.all([
          tx
            .select({ id: sessions.id })
            .from(sessions)
            .where(
              and(
                eq(sessions.stationId, params.stationId),
                eq(sessions.slotNumber, params.slotNumber),
                eq(sessions.status, 'active')
              )
            )
            .limit(1),
          tx
            .select({ status: lockerSlots.status })
            .from(lockerSlots)
            .where(
              and(
                eq(lockerSlots.stationId, params.stationId),
                eq(lockerSlots.slotNumber, params.slotNumber)
              )
            )
            .limit(1),
        ]);

        if (activeOnSlot[0]) {
          throw new AuthValidationError(
            `${formatCompartmentLabel(
              params.slotNumber
            )} currently has an active session. Force Unlock it first before enabling Maintenance.`
          );
        }

        if (currentSlotRows[0]?.status === 'in_use') {
          throw new AuthValidationError(
            `${formatCompartmentLabel(
              params.slotNumber
            )} is currently occupied. Force Unlock it first before enabling Maintenance.`
          );
        }

        // Release any unused pending reservation on this compartment before locking for maintenance
        await tx
          .update(lockerUnlockTokens)
          .set({ used: true })
          .where(
            and(
              eq(lockerUnlockTokens.stationId, params.stationId),
              eq(lockerUnlockTokens.slotNumber, params.slotNumber),
              eq(lockerUnlockTokens.used, false)
            )
          );
      }

      await tx
        .update(lockerSlots)
        .set({
          status: params.status,
          ...(params.isDoorOpen !== undefined ? { isDoorOpen: params.isDoorOpen } : {}),
          ...(params.isLocked !== undefined ? { isLocked: params.isLocked } : {}),
        })
        .where(
          and(
            eq(lockerSlots.stationId, params.stationId),
            eq(lockerSlots.slotNumber, params.slotNumber)
          )
        );

      if (params.status === 'available') {
        await tx
          .update(sessions)
          .set({
            status: 'completed',
            remainingSeconds: 0,
            receiptNumber: 'ADMIN-OVERRIDE',
            dateLabel: 'Admin Unlocked',
          })
          .where(
            and(
              eq(sessions.stationId, params.stationId),
              eq(sessions.slotNumber, params.slotNumber),
              eq(sessions.status, 'active')
            )
          );

        await tx
          .update(lockerUnlockTokens)
          .set({ used: true })
          .where(
            and(
              eq(lockerUnlockTokens.stationId, params.stationId),
              eq(lockerUnlockTokens.slotNumber, params.slotNumber),
              eq(lockerUnlockTokens.used, false)
            )
          );
      }
    });

    return fetchStationsWithSlots();
  } catch (error) {
    if (error instanceof AuthValidationError) throw error;
    console.error('Database admin slot update failed:', error);
    throw new Error('Failed to update compartment status.', { cause: error });
  }
}

export async function adminResolveAlertDb(alertId: string): Promise<SecurityAlert[]> {
  try {
    await db
      .update(securityAlerts)
      .set({ resolved: true })
      .where(eq(securityAlerts.id, alertId));
    return fetchSecurityAlerts();
  } catch (error) {
    console.error('Database resolve alert failed:', error);
    throw new Error('Failed to resolve security alert.', { cause: error });
  }
}
