import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type {
  DashboardNotification,
  DashboardNotificationSeverity,
  DashboardNotificationType,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

function sanitizeId(raw: string, fallback: string, maxLen: number): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : fallback;
}

function truncateText(raw: string, fallback: string, maxLen: number): string {
  const trimmed = raw.trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : fallback;
}

function toTimestampMs(val: unknown): number {
  if (val instanceof Timestamp) {
    return val.toMillis();
  }
  if (
    typeof val === 'object' &&
    val !== null &&
    'toMillis' in val &&
    typeof (val as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (val as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

export interface CreateNotificationInput {
  id: string;
  sessionId: string;
  stationId: string;
  stationCode: string;
  stationName: string;
  slotNumber: number;
  type: DashboardNotificationType;
  severity: DashboardNotificationSeverity;
  title: string;
  message: string;
}

export async function createFirestoreNotification(
  input: CreateNotificationInput
): Promise<boolean> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) {
    return false;
  }

  const docId = sanitizeId(input.id, `notif_${Date.now()}`, 128);
  const path = `notifications/${docId}`;
  const slotNumber = Math.min(64, Math.max(1, Math.trunc(Number(input.slotNumber) || 1)));

  const payload = {
    userUid: sanitizeId(fbUser.uid, fbUser.uid, 128),
    sessionId: sanitizeId(input.sessionId, `SES_${Date.now()}`, 64),
    stationId: sanitizeId(input.stationId, 'station-citc-01', 64),
    stationCode: sanitizeId(input.stationCode, 'USTP-CITC-K01', 32),
    stationName: truncateText(input.stationName, 'USTP Smart Kiosk', 120),
    slotNumber,
    type: input.type,
    severity: input.severity,
    title: truncateText(input.title, 'UniCharge Alert', 120),
    message: truncateText(input.message, 'Locker status update received.', 400),
    read: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'notifications', docId), payload);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markFirestoreNotificationRead(notificationId: string): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;

  const docId = sanitizeId(notificationId, notificationId, 128);
  const path = `notifications/${docId}`;
  try {
    await updateDoc(doc(db, 'notifications', docId), {
      read: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFirestoreNotification(notificationId: string): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;

  const docId = sanitizeId(notificationId, notificationId, 128);
  const path = `notifications/${docId}`;
  try {
    await deleteDoc(doc(db, 'notifications', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeUserNotifications(
  userUid: string,
  callbacks: {
    onSnapshotData: (
      allItems: DashboardNotification[],
      newlyAddedUnread: DashboardNotification[]
    ) => void;
    onError: (err: Error) => void;
  }
): Unsubscribe {
  const safeUid = sanitizeId(userUid, userUid, 128);
  const path = 'notifications';
  const q = query(collection(db, path), where('userUid', '==', safeUid));
  let isInitialSnapshot = true;

  return onSnapshot(
    q,
    (snapshot) => {
      const allItems: DashboardNotification[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userUid: String(data.userUid || safeUid),
            sessionId: String(data.sessionId || ''),
            stationId: String(data.stationId || ''),
            stationCode: String(data.stationCode || ''),
            stationName: String(data.stationName || ''),
            slotNumber: Number(data.slotNumber || 1),
            type:
              data.type === 'unexpected_door_open'
                ? ('unexpected_door_open' as const)
                : ('charge_complete' as const),
            severity:
              data.severity === 'critical' ? ('critical' as const) : ('info' as const),
            title: String(data.title || 'UniCharge Alert'),
            message: String(data.message || ''),
            read: Boolean(data.read),
            createdAtMs: toTimestampMs(data.createdAt),
            source: 'firestore' as const,
          };
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs);

      const newlyAddedUnread: DashboardNotification[] = [];
      if (!isInitialSnapshot) {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added') {
            const matched = allItems.find((item) => item.id === change.doc.id);
            if (matched && !matched.read) {
              newlyAddedUnread.push(matched);
            }
          }
        }
      }
      isInitialSnapshot = false;

      callbacks.onSnapshotData(allItems, newlyAddedUnread);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}
