import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts: Record<string, string> | null = null;
let certsExpiresAt = 0;
let adminAuthDisabled = false;

function base64UrlToBuffer(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLen), 'base64');
}

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  if (cachedCerts && Date.now() < certsExpiresAt) {
    return cachedCerts;
  }
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase public keys (${res.status})`);
  }
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  cachedCerts = (await res.json()) as Record<string, string>;
  certsExpiresAt = Date.now() + maxAgeSec * 1000;
  return cachedCerts;
}

async function verifyTokenWithGoogleCerts(token: string): Promise<DecodedIdToken> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(base64UrlToBuffer(headerB64).toString('utf8')) as {
    alg?: string;
    kid?: string;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported JWT algorithm or missing key ID');
  }

  const certs = await getGooglePublicCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    throw new Error('Unknown Firebase signing key ID');
  }

  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = base64UrlToBuffer(signatureB64);
  const isValid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(signingInput),
    certPem,
    signature
  );
  if (!isValid) {
    throw new Error('Invalid Firebase ID token signature');
  }

  const payload = JSON.parse(base64UrlToBuffer(payloadB64).toString('utf8')) as Record<
    string,
    unknown
  >;

  const now = Math.floor(Date.now() / 1000);
  const projectId = firebaseConfig.projectId;
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;

  if (payload.aud !== projectId) {
    throw new Error('Token audience mismatch');
  }
  if (payload.iss !== expectedIssuer) {
    throw new Error('Token issuer mismatch');
  }
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('Token subject missing');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= now) {
    throw new Error('Firebase ID token expired');
  }
  if (typeof payload.iat !== 'number' || payload.iat > now + 300) {
    throw new Error('Token issued-at invalid');
  }

  return {
    ...(payload as Record<string, unknown>),
    uid: payload.sub,
    sub: payload.sub,
    aud: projectId,
    iss: expectedIssuer,
    exp: payload.exp,
    iat: payload.iat,
    auth_time: typeof payload.auth_time === 'number' ? payload.auth_time : payload.iat,
    firebase: (payload.firebase as DecodedIdToken['firebase']) || {
      identities: {},
      sign_in_provider: 'google.com',
    },
  } as DecodedIdToken;
}

async function verifyFirebaseIdToken(token: string): Promise<DecodedIdToken> {
  if (!adminAuthDisabled) {
    try {
      const { adminAuth } = await import('../lib/firebase-admin.ts');
      return await adminAuth.verifyIdToken(token);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'ERR_REQUIRE_ESM') {
        adminAuthDisabled = true;
      } else {
        // Re-throw genuine auth rejection errors (expired/invalid token)
        const msg = err instanceof Error ? err.message : '';
        if (!msg.includes('ERR_REQUIRE_ESM') && !msg.includes('Cannot find module')) {
          throw err;
        }
        adminAuthDisabled = true;
      }
    }
  }
  return verifyTokenWithGoogleCerts(token);
}

const APP_TOKEN_PREFIX = 'uc_';
const APP_TOKEN_TTL_SEC = 60 * 60 * 24 * 7;

function getAppTokenSecret(): string {
  if (process.env.AUTH_TOKEN_SECRET && process.env.AUTH_TOKEN_SECRET.trim()) {
    return process.env.AUTH_TOKEN_SECRET.trim();
  }
  const dbSecret =
    process.env.SQL_PASSWORD ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    '';
  const seed = `${dbSecret}:${firebaseConfig.apiKey}:${firebaseConfig.projectId}:unicharge`;
  return crypto.createHash('sha256').update(seed).digest('hex');
}

export function signAppToken(user: {
  uid: string;
  email: string;
  name: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.uid,
    uid: user.uid,
    email: user.email,
    name: user.name,
    iat: now,
    exp: now + APP_TOKEN_TTL_SEC,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getAppTokenSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${APP_TOKEN_PREFIX}${payloadB64}.${sig}`;
}

function verifyAppToken(token: string): DecodedIdToken {
  const raw = token.slice(APP_TOKEN_PREFIX.length);
  const dotIdx = raw.indexOf('.');
  if (dotIdx <= 0) {
    throw new Error('Malformed session token');
  }
  const payloadB64 = raw.slice(0, dotIdx);
  const sigB64 = raw.slice(dotIdx + 1);

  const expectedSig = crypto
    .createHmac('sha256', getAppTokenSecret())
    .update(payloadB64)
    .digest();
  const actualSig = base64UrlToBuffer(sigB64);
  if (
    expectedSig.length !== actualSig.length ||
    !crypto.timingSafeEqual(expectedSig, actualSig)
  ) {
    throw new Error('Invalid session token signature');
  }

  const payload = JSON.parse(base64UrlToBuffer(payloadB64).toString('utf8')) as {
    uid?: string;
    sub?: string;
    email?: string;
    name?: string;
    iat?: number;
    exp?: number;
  };
  const now = Math.floor(Date.now() / 1000);
  if (!payload.uid || typeof payload.exp !== 'number' || payload.exp <= now) {
    throw new Error('Session token expired');
  }

  return {
    uid: payload.uid,
    sub: payload.uid,
    email: payload.email || '',
    name: payload.name || '',
    aud: firebaseConfig.projectId,
    iss: 'unicharge-local-auth',
    iat: payload.iat || now,
    exp: payload.exp,
    auth_time: payload.iat || now,
    firebase: {
      identities: {},
      sign_in_provider: 'password',
    },
  } as DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = token.startsWith(APP_TOKEN_PREFIX)
      ? verifyAppToken(token)
      : await verifyFirebaseIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
