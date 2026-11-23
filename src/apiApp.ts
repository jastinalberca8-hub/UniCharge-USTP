import express from 'express';
import { requireAuth, signAppToken, type AuthRequest } from './middleware/auth.ts';
import {
  EmailDeliveryNotConfiguredError,
  sendLockerQrUnlockEmail,
  sendPasswordResetCodeEmail,
  sendVerificationCodeEmail,
} from './lib/mailer.ts';
import {
  AuthConflictError,
  AuthCredentialsError,
  AuthValidationError,
  adminProvisionStaffDb,
  adminResolveAlertDb,
  adminUpdateSlotDb,
  authenticateUserDb,
  cancelUnlockTokenDb,
  completeGoogleOnboardingDb,
  createEmailVerificationDb,
  createUnlockTokenDb,
  endSessionDb,
  getBootstrapData,
  getStationSyncStateDb,
  getUnlockTokenByIdDb,
  recordTamperAlertDb,
  registerStudentUserDb,
  requestPasswordResetDb,
  resetPasswordWithCodeDb,
  startSessionDb,
  topUpWalletDb,
  updateKioskDoorStateDb,
  updateUserProfileDb,
  verifyAndConsumeUnlockTokenDb,
} from './db/queries.ts';
import {
  UNICHARGE_STATION_ID,
  formatCompartmentLabel,
} from './constants/pricing.ts';
import { formatSessionDateTime } from './utils/format.ts';
import type { LockerStatus, ServiceType } from './types/index.ts';

export const apiApp = express();

apiApp.set('trust proxy', 1);
apiApp.use(express.json({ limit: '5mb' }));

apiApp.get('/api/health', (_req, res) => {
  const hasSmtp = Boolean(
    process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()
  );
  const hasResend = Boolean(
    process.env.RESEND_API_KEY?.trim()?.startsWith('re_')
  );
  const dbConfigured = Boolean(
    process.env.SQL_HOST?.trim() ||
      process.env.DATABASE_URL?.trim() ||
      process.env.POSTGRES_URL?.trim()
  );

  res.json({
    ok: true,
    dbConfigured,
    emailConfigured: hasSmtp || hasResend,
    emailProvider: hasSmtp ? 'smtp' : hasResend ? 'resend' : 'none',
  });
});

apiApp.post('/api/auth/send-verification', async (req, res) => {
  try {
    const { name, studentIdNumber, email, password, college, course, degree } =
      req.body ?? {};
    const verification = await createEmailVerificationDb({
      name: String(name || ''),
      studentIdNumber: String(studentIdNumber || ''),
      email: String(email || ''),
      password: String(password || ''),
      college: String(college || ''),
      course: String(course || degree || ''),
    });

    const delivery = await sendVerificationCodeEmail({
      toEmail: verification.email,
      recipientName: verification.name,
      code: verification.code,
    });

    res.json({
      sent: true,
      email: verification.email,
      deliveryMode: delivery.deliveryMode,
      ...(delivery.previewUrl ? { previewUrl: delivery.previewUrl } : {}),
    });
  } catch (error: unknown) {
    if (
      error instanceof AuthValidationError ||
      error instanceof AuthConflictError ||
      error instanceof EmailDeliveryNotConfiguredError
    ) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const message =
      error instanceof Error ? error.message : 'Unable to send verification email.';
    console.error('Send verification route error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/auth/register', async (req, res) => {
  try {
    const {
      name,
      studentIdNumber,
      email,
      password,
      college,
      course,
      degree,
      verificationCode,
    } = req.body ?? {};
    const user = await registerStudentUserDb({
      name: String(name || ''),
      studentIdNumber: String(studentIdNumber || ''),
      email: String(email || ''),
      password: String(password || ''),
      college: String(college || ''),
      course: String(course || degree || ''),
      verificationCode: String(verificationCode || ''),
    });
    res.status(201).json({ user });
  } catch (error: unknown) {
    if (error instanceof AuthValidationError || error instanceof AuthConflictError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to create account.';
    console.error('Register route error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/auth/complete-onboarding', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { name, studentIdNumber, college, course, degree } = req.body ?? {};
    const user = await completeGoogleOnboardingDb({
      uid,
      ...(typeof name === 'string' && name.trim() ? { name } : {}),
      studentIdNumber: String(studentIdNumber || ''),
      college: String(college || ''),
      course: String(course || degree || ''),
    });
    res.json({ user });
  } catch (error: unknown) {
    if (error instanceof AuthValidationError || error instanceof AuthConflictError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const message =
      error instanceof Error ? error.message : 'Failed to save onboarding details.';
    console.error('Complete onboarding route error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body ?? {};
    const user = await authenticateUserDb(
      String(identifier || ''),
      String(password || '')
    );
    const bootstrap = await getBootstrapData(user.id, user.email, user.name);
    const token = signAppToken({
      uid: bootstrap.user.id,
      email: bootstrap.user.email,
      name: bootstrap.user.name,
    });
    res.json({ token, ...bootstrap });
  } catch (error: unknown) {
    if (error instanceof AuthCredentialsError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Sign in failed';
    console.error('Login route error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body ?? {};
    const resetReq = await requestPasswordResetDb(String(identifier || ''));
    const delivery = await sendPasswordResetCodeEmail({
      toEmail: resetReq.email,
      recipientName: resetReq.name,
      code: resetReq.code,
    });
    res.json({
      sent: true,
      maskedEmail: resetReq.maskedEmail,
      deliveryMode: delivery.deliveryMode,
      ...(delivery.previewUrl ? { previewUrl: delivery.previewUrl } : {}),
    });
  } catch (error: unknown) {
    if (
      error instanceof AuthValidationError ||
      error instanceof EmailDeliveryNotConfiguredError
    ) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const message =
      error instanceof Error ? error.message : 'Unable to send password reset code.';
    console.error('Forgot password route error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { identifier, verificationCode, newPassword } = req.body ?? {};
    await resetPasswordWithCodeDb({
      identifier: String(identifier || ''),
      verificationCode: String(verificationCode || ''),
      newPassword: String(newPassword || ''),
    });
    res.json({
      reset: true,
      message: 'Your password has been reset. You can now sign in with your new password.',
    });
  } catch (error: unknown) {
    if (error instanceof AuthValidationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const message =
      error instanceof Error ? error.message : 'Unable to reset password.';
    console.error('Reset password route error:', error);
    res.status(500).json({ error: message });
  }
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

apiApp.get('/api/station/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email || '';
    const data = await getStationSyncStateDb(uid, email);
    res.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to sync station state';
    console.error('Station sync route error:', error);
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
    if (error instanceof AuthValidationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Profile update failed';
    console.error('Profile update route error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/kiosk/unlock-tokens', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const {
      stationId,
      slotNumber,
      serviceType,
      pricingTier,
      durationMinutes,
      paymentMethod,
    } = req.body ?? {};

    const { token, userEmail, userName, stations } = await createUnlockTokenDb({
      uid,
      stationId: String(stationId || UNICHARGE_STATION_ID),
      ...(typeof slotNumber === 'number' ? { slotNumber } : {}),
      serviceType: String(serviceType || 'charging') as ServiceType,
      ...(typeof pricingTier === 'string' && pricingTier.trim() ? { pricingTier } : {}),
      durationMinutes: Number(durationMinutes) || 120,
      paymentMethod: String(paymentMethod || 'wallet') as
        | 'wallet'
        | 'gcash'
        | 'maya'
        | 'cash',
    });

    let emailSent = false;
    let emailDeliveryMode: 'smtp' | 'resend' | 'ethereal' | undefined;
    let emailSentFrom: string | undefined;
    let emailError: string | undefined;
    let emailPreviewUrl: string | undefined;

    try {
      const delivery = await sendLockerQrUnlockEmail({
        toEmail: userEmail,
        recipientName: userName,
        stationName: token.stationName,
        stationCode: token.stationCode,
        slotNumber: token.slotNumber,
        compartmentLabel: formatCompartmentLabel(token.slotNumber),
        pricingTier: token.pricingTier,
        durationMinutes: token.durationMinutes,
        totalFee: token.totalFee,
        pinCode: token.pinCode,
        qrPayload: token.qrPayload,
        tokenId: token.tokenId,
        expiresInMinutes: 5,
      });
      emailSent = true;
      emailDeliveryMode = delivery.deliveryMode;
      emailSentFrom = delivery.sentFrom;
      emailPreviewUrl = delivery.previewUrl;
    } catch (mailErr: unknown) {
      emailError =
        mailErr instanceof Error ? mailErr.message : 'Unable to send QR pass email.';
      console.error('QR unlock email send error:', mailErr);
    }

    res.status(201).json({
      token: {
        ...token,
        emailSent,
        emailSentTo: userEmail,
        ...(emailDeliveryMode ? { emailDeliveryMode } : {}),
        ...(emailSentFrom ? { emailSentFrom } : {}),
        ...(emailError ? { emailError } : {}),
        ...(emailPreviewUrl ? { emailPreviewUrl } : {}),
      },
      stations,
      emailSent,
      emailSentTo: userEmail,
      ...(emailDeliveryMode ? { deliveryMode: emailDeliveryMode } : {}),
      ...(emailSentFrom ? { emailSentFrom } : {}),
      ...(emailError ? { emailError } : {}),
      ...(emailPreviewUrl ? { emailPreviewUrl } : {}),
    });
  } catch (error: unknown) {
    if (error instanceof AuthValidationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const message =
      error instanceof Error ? error.message : 'Failed to generate unlock QR token.';
    console.error('Create unlock token error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/kiosk/email-unlock-qr', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { tokenId } = req.body ?? {};
    if (!tokenId) {
      return res.status(400).json({ error: 'Token ID is required.' });
    }

    const { token, userEmail, userName } = await getUnlockTokenByIdDb(uid, String(tokenId));
    const delivery = await sendLockerQrUnlockEmail({
      toEmail: userEmail,
      recipientName: userName,
      stationName: token.stationName,
      stationCode: token.stationCode,
      slotNumber: token.slotNumber,
      compartmentLabel: formatCompartmentLabel(token.slotNumber),
      pricingTier: token.pricingTier,
      durationMinutes: token.durationMinutes,
      totalFee: token.totalFee,
      pinCode: token.pinCode,
      qrPayload: token.qrPayload,
      tokenId: token.tokenId,
      expiresInMinutes: 5,
    });

    res.json({
      sent: true,
      emailSentTo: userEmail,
      deliveryMode: delivery.deliveryMode,
      ...(delivery.sentFrom ? { emailSentFrom: delivery.sentFrom } : {}),
      ...(delivery.previewUrl ? { previewUrl: delivery.previewUrl } : {}),
    });
  } catch (error: unknown) {
    if (
      error instanceof AuthValidationError ||
      error instanceof EmailDeliveryNotConfiguredError
    ) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const message =
      error instanceof Error ? error.message : 'Failed to email unlock QR code.';
    console.error('Resend unlock QR email error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.delete('/api/kiosk/unlock-tokens/:tokenId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const stations = await cancelUnlockTokenDb(uid, String(req.params.tokenId || ''));
    res.json({ ok: true, stations });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to cancel pending unlock QR.';
    console.error('Cancel unlock token error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/kiosk/door-state', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email || '';
    const syncState = await getStationSyncStateDb(uid, email);
    const { stationId, slotNumber, isDoorOpen } = req.body ?? {};
    if (typeof slotNumber !== 'number') {
      return res.status(400).json({ error: 'Valid slotNumber is required.' });
    }
    const stations = await updateKioskDoorStateDb({
      uid,
      role: syncState.user.role,
      stationId: String(stationId || UNICHARGE_STATION_ID),
      slotNumber,
      isDoorOpen: Boolean(isDoorOpen),
    });
    res.json({ ok: true, stations });
  } catch (error: unknown) {
    if (error instanceof AuthValidationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const message =
      error instanceof Error ? error.message : 'Failed to update compartment door state.';
    console.error('Door state route error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/kiosk/tamper-alert', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { stationId, slotNumber } = req.body ?? {};
    if (typeof slotNumber !== 'number') {
      return res.status(400).json({ error: 'Valid slotNumber is required.' });
    }
    const result = await recordTamperAlertDb({
      uid,
      stationId: String(stationId || UNICHARGE_STATION_ID),
      slotNumber,
    });
    res.json({ ok: true, ...result });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to record tamper alert.';
    console.error('Tamper alert route error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/kiosk/verify-unlock', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { pinOrQrPayload, kioskStationId } = req.body ?? {};
    const result = await verifyAndConsumeUnlockTokenDb({
      actorUid: uid,
      pinOrQrPayload: String(pinOrQrPayload || ''),
      kioskStationId: String(kioskStationId || ''),
    });
    res.json(result);
  } catch (error: unknown) {
    if (error instanceof AuthValidationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const message =
      error instanceof Error ? error.message : 'Failed to verify kiosk unlock pass.';
    console.error('Verify kiosk unlock error:', error);
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
    const rawDateLabel = typeof dateLabel === 'string' ? dateLabel.trim() : '';
    const resolvedDateLabel =
      !rawDateLabel || rawDateLabel.toLowerCase() === 'just now'
        ? formatSessionDateTime(new Date())
        : rawDateLabel;
    const stations = await endSessionDb({
      uid,
      sessionId,
      stationId,
      slotNumber,
      receiptNumber: String(receiptNumber || `USTP-REC-${Date.now()}`),
      dateLabel: resolvedDateLabel,
    });
    res.json({ ok: true, stations });
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
    const stations = await adminUpdateSlotDb({
      stationId: String(stationId),
      slotNumber: Number(slotNumber),
      status: status as LockerStatus,
      isDoorOpen: typeof isDoorOpen === 'boolean' ? isDoorOpen : undefined,
      isLocked: typeof isLocked === 'boolean' ? isLocked : undefined,
    });
    res.json({ ok: true, stations });
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
    const securityAlerts = await adminResolveAlertDb(String(alertId));
    res.json({ ok: true, securityAlerts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to resolve alert';
    console.error('Admin resolve alert error:', error);
    res.status(500).json({ error: message });
  }
});

apiApp.post('/api/admin/staff', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email || '';
    const bootstrap = await getBootstrapData(uid, email);
    if (bootstrap.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    const { name, email: staffEmail, staffId, password } = req.body ?? {};
    const user = await adminProvisionStaffDb({
      name: String(name || ''),
      email: String(staffEmail || ''),
      staffId: String(staffId || ''),
      password: String(password || ''),
    });
    res.status(201).json({ user });
  } catch (error: unknown) {
    if (error instanceof AuthValidationError || error instanceof AuthConflictError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Failed to provision staff account';
    console.error('Admin staff provision error:', error);
    res.status(500).json({ error: message });
  }
});
