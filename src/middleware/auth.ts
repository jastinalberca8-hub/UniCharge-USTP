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
      const msg = err instanceof Error ? err.message : '';
      if (
        code === 'ERR_REQUIRE_ESM' ||
        msg.includes('ERR_REQUIRE_ESM') ||
        msg.includes('Cannot find module')
      ) {
        adminAuthDisabled = true;
      } else {
        throw err;
      }
    }
  }
  return verifyTokenWithGoogleCerts(token);
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
    const decodedToken = await verifyFirebaseIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};