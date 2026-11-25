import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

export interface EmailSendResult {
  deliveryMode: 'resend' | 'smtp' | 'ethereal';
  previewUrl?: string;
  sentFrom?: string;
}

interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
  cid?: string;
}

export class EmailDeliveryUnavailableError extends Error {
  statusCode = 503;
}

export class EmailDeliveryNotConfiguredError extends EmailDeliveryUnavailableError {}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildCodeEmailHtml(params: {
  recipientName: string;
  code: string;
  heading: string;
  intro: string;
  footer: string;
}): string {
  const safeName = escapeHtml(params.recipientName);
  const safeHeading = escapeHtml(params.heading);
  const safeIntro = escapeHtml(params.intro);
  const safeFooter = escapeHtml(params.footer);

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #F8FAFC; color: #1E293B;">
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid #4E6E81; border-radius: 12px; padding: 28px;">
        <h2 style="margin: 0 0 8px; color: #1E293B; font-size: 20px;">${safeHeading}</h2>
        <p style="margin: 0 0 18px; color: #64748B; font-size: 14px;">Hi ${safeName || 'Student'},</p>
        <p style="margin: 0 0 18px; color: #334155; font-size: 14px; line-height: 1.5;">
          ${safeIntro}
        </p>
        <div style="background: #F1F5F9; border: 1px dashed #94A3B8; border-radius: 10px; padding: 16px; text-align: center; margin: 0 0 18px;">
          <span style="font-family: monospace; font-size: 30px; font-weight: 700; letter-spacing: 6px; color: #0F172A;">${escapeHtml(params.code)}</span>
        </div>
        <p style="margin: 0; color: #64748B; font-size: 12px; line-height: 1.5;">
          ${safeFooter}
        </p>
      </div>
    </div>
  `;
}

const UNSET_SENTINELS = new Set([
  'none',
  'null',
  'undefined',
  'n/a',
  'na',
  'disabled',
  'false',
  'skip',
]);

function cleanEnv(val: string | undefined): string {
  if (!val) return '';
  const cleaned = val.trim().replace(/^["']|["']$/g, '').trim();
  if (UNSET_SENTINELS.has(cleaned.toLowerCase())) return '';
  return cleaned;
}

function isSmtpConnectionTimeout(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ETIMEDOUT' &&
    'command' in error &&
    error.command === 'CONN'
  );
}

async function sendWithResend(params: {
  toEmail: string;
  subject: string;
  text: string;
  html: string;
  attachments?: MailAttachment[];
}, apiKey: string, fromOverride: string): Promise<EmailSendResult> {
  const { toEmail, subject, text, html, attachments } = params;
  const isPublicWebmail = /@(gmail|yahoo|outlook|hotmail)\.com>?$/i.test(fromOverride);
  const fromAddr =
    fromOverride && !isPublicWebmail
      ? fromOverride
      : 'UniCharge USTP <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddr,
      to: [toEmail],
      subject,
      text,
      html,
      ...(attachments?.length
        ? {
            attachments: attachments.map((att) => ({
              filename: att.filename,
              content: att.content.toString('base64'),
              ...(att.cid ? { content_id: att.cid } : {}),
            })),
          }
        : {}),
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    if (res.status === 401) {
      throw new Error(
        'Resend API key is invalid. Check RESEND_API_KEY in your environment variables (must be an active key starting with re_), or remove it and use Gmail SMTP (SMTP_USER + SMTP_PASS) instead.'
      );
    }
    throw new Error(`Email service returned ${res.status}: ${errText}`);
  }
  return { deliveryMode: 'resend', sentFrom: fromAddr };
}

async function deliverTransitionalEmail(params: {
  toEmail: string;
  subject: string;
  text: string;
  html: string;
  attachments?: MailAttachment[];
}): Promise<EmailSendResult> {
  const { toEmail, subject, text, html, attachments } = params;

  const smtpUser = cleanEnv(process.env.SMTP_USER);
  const smtpPass = cleanEnv(process.env.SMTP_PASS).replace(/\s+/g, '');
  const resendKey = cleanEnv(process.env.RESEND_API_KEY);
  const fromOverride = cleanEnv(process.env.SMTP_FROM);

  if (smtpUser && smtpPass) {
    const port = Number(cleanEnv(process.env.SMTP_PORT) || 587);
    const host = cleanEnv(process.env.SMTP_HOST) || 'smtp.gmail.com';
    const isGmailHost = host.toLowerCase().includes('gmail.com');

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    let fromAddr = `"UniCharge USTP" <${smtpUser}>`;
    if (fromOverride && !isGmailHost) {
      fromAddr = fromOverride.includes('<')
        ? fromOverride
        : `"UniCharge USTP" <${fromOverride}>`;
    } else if (fromOverride && isGmailHost) {
      const displayMatch = fromOverride.match(/^([^<]+)<[^>]+>$/);
      const displayName = displayMatch
        ? displayMatch[1].trim().replace(/^["']|["']$/g, '')
        : 'UniCharge USTP';
      fromAddr = `"${displayName || 'UniCharge USTP'}" <${smtpUser}>`;
    }

    let info;
    try {
      info = await transporter.sendMail({
        from: fromAddr,
        replyTo: smtpUser,
        to: toEmail,
        subject,
        text,
        html,
        ...(attachments?.length ? { attachments } : {}),
      });
    } catch (error: unknown) {
      if (!isSmtpConnectionTimeout(error)) throw error;
      if (resendKey.startsWith('re_')) {
        console.warn('[Mailer] SMTP connection timed out; retrying with Resend.');
        return await sendWithResend(params, resendKey, fromOverride);
      }
      throw new EmailDeliveryUnavailableError(
        'Could not connect to the SMTP server. Your local network may block outbound email. Configure a valid RESEND_API_KEY or check SMTP_HOST and SMTP_PORT.'
      );
    } finally {
      transporter.close();
    }

    if (Array.isArray(info.rejected) && info.rejected.length > 0) {
      throw new Error(
        `Email server rejected recipient ${toEmail}: ${info.response || 'delivery rejected'}`
      );
    }
    if (!Array.isArray(info.accepted) || info.accepted.length === 0) {
      throw new Error(
        `Email server did not accept recipient ${toEmail}. Check SMTP configuration.`
      );
    }

    console.info('[Mailer] SMTP accepted email:', {
      messageId: info.messageId,
      to: toEmail,
      response: info.response,
    });

    return { deliveryMode: 'smtp', sentFrom: smtpUser };
  }

  if (resendKey && resendKey.startsWith('re_')) {
    return sendWithResend(params, resendKey, fromOverride);
  }

  if (resendKey && !resendKey.startsWith('re_')) {
    throw new Error(
      'Invalid RESEND_API_KEY format (Resend keys start with "re_"). Update RESEND_API_KEY or remove it and configure SMTP_USER + SMTP_PASS.'
    );
  }

  // Non-production preview fallback using Ethereal test mailbox when SMTP secrets aren't configured
  if (process.env.NODE_ENV !== 'production') {
    const testAccount = await Promise.race([
      nodemailer.createTestAccount(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Preview mail setup timed out')), 4000)
      ),
    ]);
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    const info = await transporter.sendMail({
      from: `"UniCharge USTP" <${testAccount.user}>`,
      to: toEmail,
      subject,
      text,
      html,
      ...(attachments?.length ? { attachments } : {}),
    });
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    return { deliveryMode: 'ethereal', previewUrl };
  }

  throw new EmailDeliveryNotConfiguredError(
    'Verification email delivery is not configured on the server. Set SMTP_USER and SMTP_PASS (or RESEND_API_KEY) in environment variables.'
  );
}

export async function sendVerificationCodeEmail(params: {
  toEmail: string;
  recipientName: string;
  code: string;
}): Promise<EmailSendResult> {
  const subject = `${params.code} is your UniCharge USTP verification code`;
  const text = `Hi ${params.recipientName || 'Student'},\n\nYour UniCharge USTP verification code is: ${params.code}\n\nThis code expires in 10 minutes.`;
  const html = buildCodeEmailHtml({
    recipientName: params.recipientName,
    code: params.code,
    heading: 'UniCharge USTP Email Verification',
    intro:
      'Enter the 6-digit verification code below to verify your email address and complete your UniCharge USTP registration:',
    footer:
      'This code expires in 10 minutes. If you did not request a UniCharge account, you can safely ignore this message.',
  });

  return deliverTransitionalEmail({
    toEmail: params.toEmail,
    subject,
    text,
    html,
  });
}

export async function sendPasswordResetCodeEmail(params: {
  toEmail: string;
  recipientName: string;
  code: string;
}): Promise<EmailSendResult> {
  const subject = `${params.code} is your UniCharge USTP password reset code`;
  const text = `Hi ${params.recipientName || 'Student'},\n\nYour UniCharge USTP password reset code is: ${params.code}\n\nEnter this code in the app to set a new password. This code expires in 10 minutes.`;
  const html = buildCodeEmailHtml({
    recipientName: params.recipientName,
    code: params.code,
    heading: 'UniCharge USTP Password Reset',
    intro:
      'We received a request to reset your UniCharge USTP password. Enter the 6-digit reset code below to set a new password:',
    footer:
      'This reset code expires in 10 minutes. If you did not request a password reset, you can safely ignore this message.',
  });

  return deliverTransitionalEmail({
    toEmail: params.toEmail,
    subject,
    text,
    html,
  });
}

export async function sendLockerQrUnlockEmail(params: {
  toEmail: string;
  recipientName: string;
  stationName: string;
  stationCode: string;
  slotNumber: number;
  compartmentLabel: string;
  pricingTier: string;
  durationMinutes: number;
  totalFee: number;
  paymentMethod?: string;
  pinCode: string;
  qrPayload: string;
  tokenId: string;
  expiresInMinutes?: number;
}): Promise<EmailSendResult> {
  const expiresMins = params.expiresInMinutes ?? 5;
  const qrBuffer = await QRCode.toBuffer(params.qrPayload, {
    type: 'png',
    width: 400,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#1E293B',
      light: '#FFFFFF',
    },
  });

  const safeName = escapeHtml(params.recipientName || 'Student');
  const safeStation = escapeHtml(params.stationName);
  const safeCode = escapeHtml(params.stationCode);
  const safeCompartment = escapeHtml(params.compartmentLabel);
  const safeTier = escapeHtml(params.pricingTier);
  const safePin = escapeHtml(params.pinCode);
  const safeToken = escapeHtml(params.tokenId);
  const isCoinPayment = params.paymentMethod === 'cash';

  const subject = `UniCharge USTP Locker Pass - ${params.stationCode} ${params.compartmentLabel}`;
  const text = [
    `Hi ${params.recipientName || 'Student'},`,
    '',
    `Your UniCharge USTP locker unlock code for ${params.stationName} (${params.stationCode}), ${params.compartmentLabel} (${params.pricingTier}) is ready.`,
    `Duration: ${params.durationMinutes} minutes · Fee: PHP ${params.totalFee}${isCoinPayment ? ' (Pay via Kiosk Coin Slot)' : ''}`,
    `6-Digit Backup Code: ${params.pinCode}`,
    `Pass ID: ${params.tokenId}`,
    '',
    isCoinPayment
      ? `Hold the attached QR code in front of the ${params.stationName} kiosk camera after tapping "Scan QR" (or enter the 6-digit backup code), then insert PHP ${params.totalFee} in coins when prompted to unlatch.`
      : `Hold the attached QR code in front of the ${params.stationName} kiosk camera after tapping "Scan QR" (or enter the 6-digit backup code).`,
    `Valid for ${expiresMins} minutes (single use).`,
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #F8FAFC; color: #1E293B;">
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid #4E6E81; border-radius: 12px; padding: 28px;">
        <h2 style="margin: 0 0 8px; color: #1E293B; font-size: 20px;">UniCharge Kiosk Unlock Pass</h2>
        <p style="margin: 0 0 16px; color: #64748B; font-size: 14px;">Hi ${safeName},</p>
        <p style="margin: 0 0 18px; color: #334155; font-size: 14px; line-height: 1.5;">
          Tap <strong>Scan QR</strong> on the <strong>${safeStation}</strong> (${safeCode}) kiosk and hold this QR code up to the camera to unlock <strong>${safeCompartment}</strong> (${safeTier}, ${params.durationMinutes} min).
          ${
            isCoinPayment
              ? `<br /><strong style="color: #0F766E;">Coin Slot Payment:</strong> Insert <strong>PHP ${params.totalFee}.00</strong> in coins into the kiosk coin slot when prompted after scanning.`
              : ''
          }
        </p>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px; text-align: center; margin: 0 0 18px;">
          <img src="cid:unicharge-qr-pass" alt="UniCharge Kiosk QR Code" width="220" height="220" style="display: block; margin: 0 auto 14px; border-radius: 8px; background: #FFFFFF;" />
          <div style="font-size: 11px; color: #64748B; font-weight: 600;">Backup Code</div>
          <div style="font-family: monospace; font-size: 26px; font-weight: 700; letter-spacing: 5px; color: #0F172A; margin-top: 2px;">${safePin}</div>
        </div>
        <p style="margin: 0; color: #64748B; font-size: 12px; line-height: 1.5;">
          Pass Reference: <span style="font-family: monospace;">${safeToken}</span> · Single-use, valid for ${expiresMins} minutes.
        </p>
      </div>
    </div>
  `;

  return deliverTransitionalEmail({
    toEmail: params.toEmail,
    subject,
    text,
    html,
    attachments: [
      {
        filename: `unicharge-${params.stationCode.toLowerCase()}-slot-${params.slotNumber}.png`,
        content: qrBuffer,
        contentType: 'image/png',
        cid: 'unicharge-qr-pass',
      },
    ],
  });
}


