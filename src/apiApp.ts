import express from 'express';
import { requireAuth, type AuthRequest } from './middleware/auth.ts';
import {
  adminResolveAlertDb,
  adminUpdateSlotDb,
  endSessionDb,
  getBootstrapData,
  startSessionDb,
  topUpWalletDb,
  updateUserProfileDb,
} from './db/queries.ts';
import type { LockerStatus } from './types/index.ts';

export const apiApp = express();

apiApp.use(express.json({ limit: '5mb' }));

apiApp.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

apiApp.get('/api/bootstrap', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email || '';
    const name = typeof req.user!.name === 'string' ? req.user!.name : undefined;
    const data = await getBootstrapData(uid, email, name);
    res.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to load workspace data';
    console.error('Bootstrap route error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/wallet/topup', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 50000) {
      return res.status(400).json({ error: 'Invalid top-up amount' });
    }
    const user = await topUpWalletDb(uid, amount);
    res.json({ user });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Wallet top-up failed';
    console.error('Topup route error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.patch('/api/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const {
      name,
      college,
      degree,
      avatar,
      biometricEnabled,
      pushNotifications,
      overchargeAlerts,
    } = req.body ?? {};
    const user = await updateUserProfileDb(uid, {
      ...(typeof name === 'string' ? { name } : {}),
      ...(typeof college === 'string' ? { college } : {}),
      ...(typeof degree === 'string' ? { degree } : {}),
      ...(typeof avatar === 'string' ? { avatar } : {}),
      ...(typeof biometricEnabled === 'boolean' ? { biometricEnabled } : {}),
      ...(typeof pushNotifications === 'boolean' ? { pushNotifications } : {}),
      ...(typeof overchargeAlerts === 'boolean' ? { overchargeAlerts } : {}),
    });
    res.json({ user });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Profile update failed';
    console.error('Profile update route error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/sessions/start', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { session, deductWalletAmount } = req.body ?? {};
    if (!session || !session.sessionId || !session.stationId) {
      return res.status(400).json({ error: 'Invalid session payload' });
    }
    const result = await startSessionDb({
      uid,
      session,
      deductWalletAmount: Number(deductWalletAmount) || 0,
    });
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start session';
    console.error('Start session route error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/sessions/end', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { sessionId, stationId, slotNumber, receiptNumber, dateLabel } =
      req.body ?? {};
    if (!sessionId || !stationId || typeof slotNumber !== 'number') {
      return res.status(400).json({ error: 'Invalid end session payload' });
    }
    await endSessionDb({
      uid,
      sessionId,
      stationId,
      slotNumber,
      receiptNumber: String(receiptNumber || `USTP-REC-${Date.now()}`),
      dateLabel: String(dateLabel || 'Just now'),
    });
    res.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to end session';
    console.error('End session route error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/admin/slots/update', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email || '';
    const bootstrap = await getBootstrapData(uid, email);
    if (bootstrap.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    const { stationId, slotNumber, status, isDoorOpen, isLocked } = req.body ?? {};
    await adminUpdateSlotDb({
      stationId: String(stationId),
      slotNumber: Number(slotNumber),
      status: status as LockerStatus,
      isDoorOpen: typeof isDoorOpen === 'boolean' ? isDoorOpen : undefined,
      isLocked: typeof isLocked === 'boolean' ? isLocked : undefined,
    });
    res.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update slot';
    console.error('Admin slot update error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/admin/alerts/resolve', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email || '';
    const bootstrap = await getBootstrapData(uid, email);
    if (bootstrap.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    const { alertId } = req.body ?? {};
    await adminResolveAlertDb(String(alertId));
    res.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to resolve alert';
    console.error('Admin resolve alert error:', error);
    res.status(500).json({ error: message });
  }
});
