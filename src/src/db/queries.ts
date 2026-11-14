import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { lockerSlots, securityAlerts, sessions, stations, users } from './schema.ts';
import { SEED_SECURITY_ALERTS, SEED_STATIONS } from './seedData.ts';
import type {
  ActiveSession,
  KioskStation,
  LockerSize,
  LockerSlot,
  LockerStatus,
  SecurityAlert,
  ServiceType,
  SessionHistoryItem,
  UserAccount,
  UserRole,
} from '../types/index.ts';

let catalogSeeded = false;

export async function ensureCatalogSeeded(): Promise<void> {
  if (catalogSeeded) return;
  try {
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

    catalogSeeded = true;
  } catch (error) {
    console.error('Database catalog seed failed:', error);
    throw new Error('Failed to initialize campus station catalog.', { cause: error });
  }
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
    const isAdminEmail = cleanEmail === 'admin@ustp.edu.ph';
    const role: UserRole = isAdminEmail ? 'admin' : 'student';
    const defaultName =
      displayName?.trim() ||
      (isAdminEmail
        ? 'Engr. Elena Cruz'
        : cleanEmail.split('@')[0] || 'USTP Student');
    const defaultId = isAdminEmail
      ? 'ADMIN-01'
      : `USTP-${uid.slice(0, 6).toUpperCase()}`;

    const inserted = await db
      .insert(users)
      .values({
        uid,
        name: defaultName,
        studentIdNumber: defaultId,
        email: cleanEmail,
        role,
        college: isAdminEmail
          ? 'USTP ICT Infrastructure & Smart Campus Operations'
          : 'College of Information Technology and Computing (CITC)',
        degree: isAdminEmail
          ? 'Lead Hardware Telemetry Administrator'
          : 'BS Information Technology',
        avatar: '',
        walletBalance: 0,
        biometricEnabled: false,
        pushNotifications: true,
        overchargeAlerts: true,
        preferredPayment: 'wallet',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
        },
      })
      .returning();

    return mapUserRow(inserted[0]);
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to sync user account.', { cause: error });
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

  return {
    user,
    users: allUsers,
    stations: stationList,
    securityAlerts: alertList,
    activeSession: userSessions.activeSession,
    sessionHistory: userSessions.history,
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
    const updated = await db
      .update(users)
      .set({
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.college !== undefined ? { college: updates.college } : {}),
        ...(updates.degree !== undefined ? { degree: updates.degree } : {}),
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
