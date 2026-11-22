import crypto from 'node:crypto';
import { and, asc, desc, eq, gt, ilike, ne, or } from 'drizzle-orm';
import { db, pool } from './index.ts';
import {
  emailVerifications,
  lockerSlots,
  lockerUnlockTokens,
  securityAlerts,
  sessions,
  stations,
  users,
} from './schema.ts';
import { SEED_SECURITY_ALERTS, SEED_STATIONS } from './seedData.ts';
import {
  ALLOWED_USTP_COLLEGE_VALUES,
  isCourseValidForCollege,
} from '../constants/colleges.ts';
import type {
  ActiveSession,
  KioskStation,
  LockerSize,
  LockerSlot,
  LockerStatus,
  PendingUnlockToken,
  SecurityAlert,
  ServiceType,
  SessionHistoryItem,
  UserAccount,
  UserRole,
} from '../types/index.ts';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STUDENT_ID_REGEX = /^[A-Za-z0-9-]{4,24}$/;

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
    uid: 'usr_ustp_admin_01',
    name: 'Engr. Elena Cruz',
    studentIdNumber: 'ADMIN-01',
    email: 'admin@ustp.edu.ph',
    passwordPlain: 'admin123',
    role: 'admin',
    college: 'USTP ICT Infrastructure & Smart Campus Operations',
    degree: 'Lead Hardware Telemetry Administrator',
    avatar: '',
    walletBalance: 0.0,
    biometricEnabled: true,
    pushNotifications: true,
    overchargeAlerts: true,
    preferredPayment: 'wallet',
  },
  {
    uid: 'usr_ustp_202210481',
    name: 'Marco Villanueva',
    studentIdNumber: '2022-10481',
    email: 'm.villanueva@ustp.edu.ph',
    passwordPlain: 'student123',
    role: 'student',
    college: 'College of Engineering and Architecture (CEA)',
    degree: 'BS Electrical Engineering',
    avatar: '',
    walletBalance: 280.0,
    biometricEnabled: false,
    pushNotifications: true,
    overchargeAlerts: true,
    preferredPayment: 'gcash',
  },
] as const;

export async function ensureCatalogSeeded(): Promise<void> {
  if (catalogSeeded) return;
  if (catalogSeedPromise) return catalogSeedPromise;

  catalogSeedPromise = (async () => {
    try {
      await ensureSchemaReady();
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
        .onConflictDoNothing();

      for (const slot of st.slots) {
        await db
          .insert(lockerSlots)
          .values({
            id: slot.id,
            stationId: st.id,
            slotNumber: slot.slotNumber,
            size: slot.size,
            status: slot.status,
            chargingPower: slot.chargingPower,
            currentTemp: slot.currentTemp,
            isDoorOpen: slot.isDoorOpen,
            isLocked: slot.isLocked,
          })
          .onConflictDoNothing();
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
        .onConflictDoNothing();
    }

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
      row.preferredPayment === 'gcash' || row.preferredPayment === 'maya'
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
      const oldUid = existingByEmail[0].uid;
      if (oldUid !== uid) {
        await db
          .update(sessions)
          .set({ userUid: uid })
          .where(eq(sessions.userUid, oldUid));
        const linked = await db
          .update(users)
          .set({ uid, email: cleanEmail })
          .where(eq(users.id, existingByEmail[0].id))
          .returning();
        return mapUserRow(linked[0]);
      }
      return mapUserRow(existingByEmail[0]);
    }

    const isAdminEmail = cleanEmail === 'admin@ustp.edu.ph';
    const role: UserRole = isAdminEmail ? 'admin' : 'student';
    const defaultName =
      displayName?.trim() ||
      (isAdminEmail
        ? 'Engr. Elena Cruz'
        : cleanEmail.split('@')[0] || 'USTP Student');

    const inserted = await db
      .insert(users)
      .values({
        uid,
        name: defaultName,
        studentIdNumber: isAdminEmail ? 'ADMIN-01' : '',
        email: cleanEmail,
        role,
        college: isAdminEmail
          ? 'USTP ICT Infrastructure & Smart Campus Operations'
          : '',
        degree: isAdminEmail
          ? 'Lead Hardware Telemetry Administrator'
          : '',
        avatar: '',
        walletBalance: 0,
        biometricEnabled: false,
        pushNotifications: true,
        overchargeAlerts: true,
        preferredPayment: 'wallet',
        emailVerified: true,
        profileCompleted: isAdminEmail,
      })
      .returning();

    return mapUserRow(inserted[0]);
  } catch (error) {
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
          ilike(users.studentIdNumber, cleanId)
        )
      );

    if (existing.length > 0) {
      throw new AuthConflictError(
        'An account with this email or USTP ID already exists.'
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

    const existing = await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.email, cleanEmail),
          ilike(users.studentIdNumber, cleanId)
        )
      );

    if (existing.length > 0) {
      throw new AuthConflictError(
        'An account with this email or USTP ID already exists.'
      );
    }

    const uid = `usr_ustp_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const inserted = await db
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

    await db
      .delete(emailVerifications)
      .where(eq(emailVerifications.email, cleanEmail));

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
    const currentRows = await db.select().from(users).where(eq(users.uid, params.uid));
    if (!currentRows[0]) {
      throw new AuthValidationError('User account not found.');
    }

    const duplicateId = await db
      .select()
      .from(users)
      .where(
        and(
          ilike(users.studentIdNumber, cleanId),
          ne(users.uid, params.uid)
        )
      );

    if (duplicateId.length > 0) {
      throw new AuthConflictError(
        'This Student ID is already registered to another account.'
      );
    }

    const updated = await db
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

    return mapUserRow(updated[0]);
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
    const rows = await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.email, cleanIdentifier),
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
  await ensureCatalogSeeded();
  const cleanName = params.name.trim();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanStaffId = params.staffId.trim().toUpperCase();

  if (!cleanName || !cleanEmail || !cleanStaffId || !params.password) {
    throw new AuthValidationError('All staff provisioning fields are required.');
  }

  try {
    const existing = await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.email, cleanEmail),
          ilike(users.studentIdNumber, cleanStaffId)
        )
      );

    if (existing.length > 0) {
      throw new AuthConflictError('Staff email or ID already exists.');
    }

    const uid = `usr_admin_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const inserted = await db
      .insert(users)
      .values({
        uid,
        name: cleanName,
        studentIdNumber: cleanStaffId,
        email: cleanEmail,
        passwordHash: hashPassword(params.password),
        role: 'admin',
        college: 'USTP ICT Infrastructure & Smart Campus Operations',
        degree: 'Station Operations Staff',
        avatar: '',
        walletBalance: 0,
        biometricEnabled: true,
        pushNotifications: true,
        overchargeAlerts: true,
        preferredPayment: 'wallet',
        emailVerified: true,
        profileCompleted: true,
      })
      .returning();

    return mapUserRow(inserted[0]);
  } catch (error) {
    if (error instanceof AuthConflictError || error instanceof AuthValidationError) {
      throw error;
    }
    console.error('Database staff provisioning failed:', error);
    throw new Error('Failed to provision staff account.', { cause: error });
  }
}

export async function fetchStationsWithSlots(): Promise<KioskStation[]> {
  try {
    const stationRows = await db.select().from(stations).orderBy(asc(stations.id));
    const slotRows = await db
      .select()
      .from(lockerSlots)
      .orderBy(asc(lockerSlots.slotNumber));

    return stationRows.map((st) => {
      const slotsForStation: LockerSlot[] = slotRows
        .filter((s) => s.stationId === st.id)
        .map((s) => ({
          id: s.id,
          slotNumber: s.slotNumber,
          size: (s.size as LockerSize) || 'S',
          status: (s.status as LockerStatus) || 'available',
          chargingPower: s.chargingPower,
          currentTemp: s.currentTemp,
          isDoorOpen: s.isDoorOpen,
          isLocked: s.isLocked,
        }));

      const availableCount = slotsForStation.filter(
        (s) => s.status === 'available'
      ).length;

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
        powerDrawWatts: st.powerDrawWatts,
      };
    });
  } catch (error) {
    console.error('Database stations query failed:', error);
    throw new Error('Failed to load campus stations.', { cause: error });
  }
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
          serviceType: (activeRow.serviceType as ServiceType) || 'both',
          compartmentSize: (activeRow.compartmentSize as LockerSize) || 'S',
          startTime: activeRow.startTimeMs,
          durationMinutes: activeRow.durationMinutes,
          remainingSeconds: activeRow.remainingSeconds,
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
      .map((r) => ({
        id: r.sessionId,
        receiptNumber: r.receiptNumber || `USTP-REC-${r.id}`,
        date: r.dateLabel || r.createdAt.toLocaleDateString(),
        stationName: r.stationName,
        slotNumber: r.slotNumber,
        durationMinutes: r.durationMinutes,
        totalFee: r.totalFee,
        serviceType: (r.serviceType as ServiceType) || 'both',
        compartmentSize: (r.compartmentSize as LockerSize) || 'S',
        status: 'Completed',
      }));

    return { activeSession, history };
  } catch (error) {
    console.error('Database user session query failed:', error);
    throw new Error('Failed to load user sessions.', { cause: error });
  }
}

export async function getBootstrapData(
  uid: string,
  email: string,
  displayName?: string
) {
  await ensureCatalogSeeded();
  const user = await getOrCreateUser(uid, email, displayName);
  const [stationList, alertList, userSessions] = await Promise.all([
    fetchStationsWithSlots(),
    fetchSecurityAlerts(),
    fetchUserSessionState(user.id),
  ]);

  let allUsers: UserAccount[] = [user];
  if (user.role === 'admin') {
    try {
      const rows = await db.select().from(users).orderBy(desc(users.createdAt));
      allUsers = rows.map(mapUserRow);
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
    pendingUnlockToken: pendingRows[0] ? mapUnlockTokenRow(pendingRows[0]) : null,
  };
}

const UNLOCK_TOKEN_TTL_MS = 5 * 60 * 1000;
const LOCKER_HOURLY_RATES: Record<LockerSize, number> = {
  S: 15,
  M: 20,
  L: 30,
};

export function calculateLockerFee(
  size: LockerSize,
  durationMinutes: number,
  service: ServiceType
): number {
  const hourly = LOCKER_HOURLY_RATES[size] || 15;
  const hours = durationMinutes / 60;
  const baseFee = hourly * hours;
  const addOn = service === 'both' ? 5 : 0;
  return Math.round(baseFee + addOn);
}

function mapUnlockTokenRow(row: typeof lockerUnlockTokens.$inferSelect): PendingUnlockToken {
  return {
    tokenId: row.tokenId,
    stationId: row.stationId,
    stationName: row.stationName,
    stationCode: row.stationCode,
    slotNumber: row.slotNumber,
    serviceType: (row.serviceType as ServiceType) || 'both',
    compartmentSize: (row.compartmentSize as LockerSize) || 'S',
    durationMinutes: row.durationMinutes,
    totalFee: Number(row.totalFee),
    paymentMethod:
      row.paymentMethod === 'gcash' ||
      row.paymentMethod === 'maya' ||
      row.paymentMethod === 'cash'
        ? row.paymentMethod
        : 'wallet',
    qrPayload: row.qrPayload,
    pinCode: row.pinCode,
    createdAt: row.createdAt.getTime(),
    expiresAt: row.expiresAt.getTime(),
  };
}

export async function createUnlockTokenDb(params: {
  uid: string;
  stationId: string;
  slotNumber?: number;
  serviceType: ServiceType;
  compartmentSize: LockerSize;
  durationMinutes: number;
  paymentMethod: 'wallet' | 'gcash' | 'maya' | 'cash';
}): Promise<{ token: PendingUnlockToken; userEmail: string; userName: string }> {
  await ensureCatalogSeeded();
  const durationMinutes = Number(params.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 30 || durationMinutes > 240) {
    throw new AuthValidationError('Duration must be between 30 and 240 minutes.');
  }

  const validService: ServiceType =
    params.serviceType === 'charging' ||
    params.serviceType === 'storage' ||
    params.serviceType === 'both'
      ? params.serviceType
      : 'both';

  const validPayment: 'wallet' | 'gcash' | 'maya' | 'cash' =
    params.paymentMethod === 'gcash' ||
    params.paymentMethod === 'maya' ||
    params.paymentMethod === 'cash'
      ? params.paymentMethod
      : 'wallet';

  const userRows = await db.select().from(users).where(eq(users.uid, params.uid));
  const actor = userRows[0];
  if (!actor) {
    throw new AuthValidationError('User account not found.');
  }

  const stationRows = await db
    .select()
    .from(stations)
    .where(eq(stations.id, params.stationId));
  const station = stationRows[0];
  if (!station) {
    throw new AuthValidationError('Selected kiosk station was not found.');
  }

  const slotRows = await db
    .select()
    .from(lockerSlots)
    .where(eq(lockerSlots.stationId, station.id))
    .orderBy(asc(lockerSlots.slotNumber));

  const requestedSlot =
    typeof params.slotNumber === 'number'
      ? slotRows.find((s) => s.slotNumber === params.slotNumber)
      : slotRows.find((s) => s.status === 'available');

  if (!requestedSlot || requestedSlot.status !== 'available') {
    throw new AuthValidationError(
      'Selected compartment is no longer available. Please choose a free compartment.'
    );
  }

  const compartmentSize: LockerSize =
    (requestedSlot.size as LockerSize) || params.compartmentSize || 'S';
  const totalFee = calculateLockerFee(compartmentSize, durationMinutes, validService);

  if (validPayment === 'wallet' && Number(actor.walletBalance) < totalFee) {
    throw new AuthValidationError(
      `Insufficient campus e-wallet balance (₱${Number(actor.walletBalance).toFixed(
        2
      )}). Please reload ₱ or choose GCash/Maya/Coin Slot.`
    );
  }

  // Invalidate any prior unused tokens for this student so only one active pass remains
  await db
    .update(lockerUnlockTokens)
    .set({ used: true })
    .where(
      and(
        eq(lockerUnlockTokens.userUid, actor.uid),
        eq(lockerUnlockTokens.used, false)
      )
    );

  const pinCode = String(crypto.randomInt(100000, 1000000));
  const tokenId = `TOK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const qrPayload = `UNICHARGE|${station.campusCode}|SLOT-${requestedSlot.slotNumber}|PIN-${pinCode}|${tokenId}`;
  const expiresAt = new Date(Date.now() + UNLOCK_TOKEN_TTL_MS);

  const inserted = await db
    .insert(lockerUnlockTokens)
    .values({
      tokenId,
      userUid: actor.uid,
      stationId: station.id,
      stationName: station.name,
      stationCode: station.campusCode,
      slotNumber: requestedSlot.slotNumber,
      serviceType: validService,
      compartmentSize,
      durationMinutes,
      totalFee,
      paymentMethod: validPayment,
      pinCode,
      qrPayload,
      used: false,
      expiresAt,
    })
    .returning();

  return {
    token: mapUnlockTokenRow(inserted[0]),
    userEmail: actor.email,
    userName: actor.name,
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

export async function cancelUnlockTokenDb(uid: string, tokenId: string): Promise<void> {
  await db
    .update(lockerUnlockTokens)
    .set({ used: true })
    .where(
      and(
        eq(lockerUnlockTokens.userUid, uid),
        eq(lockerUnlockTokens.tokenId, tokenId.trim()),
        eq(lockerUnlockTokens.used, false)
      )
    );
}

export async function verifyAndConsumeUnlockTokenDb(params: {
  actorUid: string;
  pinOrQrPayload: string;
  kioskStationId: string;
}): Promise<{
  user: UserAccount;
  session: ActiveSession;
  stations: KioskStation[];
  message: string;
}> {
  await ensureCatalogSeeded();
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

  const actorRows = await db.select().from(users).where(eq(users.uid, params.actorUid));
  const actor = actorRows[0];
  if (!actor) {
    throw new AuthValidationError('Authenticated account not found.');
  }

  const isSixDigitPin = /^\d{6}$/.test(cleaned);

  const matchingRows = isSixDigitPin
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
    throw new AuthValidationError(
      'Invalid QR code or 6-digit PIN. Hold your active UniCharge QR directly to the camera or check your email pass.'
    );
  }

  if (tokenRow.userUid !== actor.uid && actor.role !== 'admin') {
    throw new AuthValidationError(
      'This QR unlock pass belongs to a different UniCharge student account.'
    );
  }

  if (tokenRow.used) {
    throw new AuthValidationError(
      'This QR unlock pass has already been redeemed. Reserve a locker to generate a new pass.'
    );
  }

  if (tokenRow.expiresAt.getTime() < Date.now()) {
    await db
      .update(lockerUnlockTokens)
      .set({ used: true })
      .where(eq(lockerUnlockTokens.id, tokenRow.id));
    throw new AuthValidationError(
      'QR verification token expired (5-minute limit). Please regenerate a fresh Unlock QR.'
    );
  }

  if (tokenRow.stationId !== targetKioskId) {
    throw new AuthValidationError(
      `Wrong kiosk! This QR authorizes ${tokenRow.stationName} (${tokenRow.stationCode}). Switch the kiosk selector to ${tokenRow.stationCode} to scan.`
    );
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
    if (!targetSlot || targetSlot.status !== 'available') {
      throw new AuthValidationError(
        `Compartment #${tokenRow.slotNumber} is no longer available. Please choose another free compartment.`
      );
    }

    const ownerRows = await tx
      .select()
      .from(users)
      .where(eq(users.uid, tokenRow.userUid));
    const owner = ownerRows[0];
    if (!owner) {
      throw new AuthValidationError('Account associated with this QR pass was not found.');
    }

    const stationRows = await tx
      .select()
      .from(stations)
      .where(eq(stations.id, tokenRow.stationId));
    const targetStation = stationRows[0];

    const computedFee = calculateLockerFee(
      (tokenRow.compartmentSize as LockerSize) || 'S',
      tokenRow.durationMinutes,
      (tokenRow.serviceType as ServiceType) || 'both'
    );

    let updatedOwner = owner;
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
      serviceType: (tokenRow.serviceType as ServiceType) || 'both',
      compartmentSize: (tokenRow.compartmentSize as LockerSize) || 'S',
      startTime: nowMs,
      durationMinutes: tokenRow.durationMinutes,
      remainingSeconds: tokenRow.durationMinutes * 60,
      totalFee: computedFee,
      batteryInitial: 38,
      batteryCurrent: 38,
      chargingRateWatts: tokenRow.serviceType === 'storage' ? 0 : 58.4,
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
      compartmentSize: newSession.compartmentSize,
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
      qrVerificationCode: newSession.qrVerificationCode,
    });

    return { updatedOwner, newSession };
  });

  const updatedStations = await fetchStationsWithSlots();

  return {
    user: mapUserRow(result.updatedOwner),
    session: result.newSession,
    stations: updatedStations,
    message: `Kiosk Verified! Compartment #${result.newSession.slotNumber} Solenoid Unlatched at ${result.newSession.stationName}.`,
  };
}

export async function topUpWalletDb(uid: string, amount: number): Promise<UserAccount> {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid));
    if (!existing[0]) {
      throw new Error('User account not found.');
    }
    const nextBalance = Number(existing[0].walletBalance) + amount;
    const updated = await db
      .update(users)
      .set({ walletBalance: nextBalance })
      .where(eq(users.uid, uid))
      .returning();
    return mapUserRow(updated[0]);
  } catch (error) {
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
    if (updates.college !== undefined || updates.degree !== undefined) {
      const existingRows = await db.select().from(users).where(eq(users.uid, uid));
      const existingUser = existingRows[0];
      if (!existingUser) {
        throw new AuthValidationError('User account not found.');
      }
      if (existingUser.role !== 'admin') {
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
    }

    const updated = await db
      .update(users)
      .set({
        ...(updates.name !== undefined ? { name: updates.name } : {}),
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

    if (!updated[0]) {
      throw new Error('User account not found.');
    }
    return mapUserRow(updated[0]);
  } catch (error) {
    if (error instanceof AuthValidationError) {
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
}): Promise<{ user: UserAccount; session: ActiveSession }> {
  try {
    const existingUser = await db.select().from(users).where(eq(users.uid, params.uid));
    if (!existingUser[0]) {
      throw new Error('User account not found.');
    }

    let finalUser = existingUser[0];
    if (params.deductWalletAmount > 0) {
      const nextBalance = Math.max(
        0,
        Number(existingUser[0].walletBalance) - params.deductWalletAmount
      );
      const updatedUser = await db
        .update(users)
        .set({ walletBalance: nextBalance })
        .where(eq(users.uid, params.uid))
        .returning();
      finalUser = updatedUser[0];
    }

    await db
      .update(lockerSlots)
      .set({ status: 'in_use', isDoorOpen: true, isLocked: false })
      .where(
        and(
          eq(lockerSlots.stationId, params.session.stationId),
          eq(lockerSlots.slotNumber, params.session.slotNumber)
        )
      );

    await db.insert(sessions).values({
      sessionId: params.session.sessionId,
      userUid: params.uid,
      stationId: params.session.stationId,
      stationName: params.session.stationName,
      building: params.session.building,
      slotNumber: params.session.slotNumber,
      serviceType: params.session.serviceType,
      compartmentSize: params.session.compartmentSize,
      startTimeMs: params.session.startTime,
      durationMinutes: params.session.durationMinutes,
      remainingSeconds: params.session.remainingSeconds,
      totalFee: params.session.totalFee,
      batteryInitial: params.session.batteryInitial,
      batteryCurrent: params.session.batteryCurrent,
      chargingRateWatts: params.session.chargingRateWatts,
      lockerTemperature: params.session.lockerTemperature,
      isOverchargeProtectionActive: params.session.isOverchargeProtectionActive,
      isTamperAlertArmed: params.session.isTamperAlertArmed,
      status: 'active',
      qrVerificationCode: params.session.qrVerificationCode,
    });

    return { user: mapUserRow(finalUser), session: params.session };
  } catch (error) {
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
}): Promise<void> {
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
  } catch (error) {
    console.error('Database end session failed:', error);
    throw new Error('Failed to end locker session.', { cause: error });
  }
}

export async function adminUpdateSlotDb(params: {
  stationId: string;
  slotNumber: number;
  status: LockerStatus;
  isDoorOpen?: boolean;
  isLocked?: boolean;
}): Promise<void> {
  try {
    await db
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
  } catch (error) {
    console.error('Database admin slot update failed:', error);
    throw new Error('Failed to update compartment status.', { cause: error });
  }
}

export async function adminResolveAlertDb(alertId: string): Promise<void> {
  try {
    await db
      .update(securityAlerts)
      .set({ resolved: true })
      .where(eq(securityAlerts.id, alertId));
  } catch (error) {
    console.error('Database resolve alert failed:', error);
    throw new Error('Failed to resolve security alert.', { cause: error });
  }
}
