import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const sqlHost = process.env.SQL_HOST || '';
    const isUnixSocket = sqlHost.startsWith('/');
    const connectionString =
      !isUnixSocket
        ? (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim()
        : '';
    const maxConnections = process.env.VERCEL ? 3 : 10;

    if (connectionString) {
      const isLocalUrl =
        connectionString.includes('localhost') ||
        connectionString.includes('127.0.0.1');
      const useSsl =
        process.env.SQL_SSL === 'true' ||
        (!isLocalUrl && process.env.SQL_SSL !== 'false');

      global._postgresPool = new Pool({
        connectionString,
        ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
        max: maxConnections,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 20000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 5000,
        allowExitOnIdle: true,
      });
    } else {
      const isLocalHost = sqlHost === 'localhost' || sqlHost === '127.0.0.1';
      const useSsl =
        !isUnixSocket &&
        (process.env.SQL_SSL === 'true' || (!isLocalHost && process.env.SQL_SSL !== 'false'));

      global._postgresPool = new Pool({
        host: sqlHost,
        ...(isUnixSocket ? {} : { port: Number(process.env.SQL_PORT) || 5432 }),
        ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: maxConnections,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 20000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 5000,
        allowExitOnIdle: true,
      });
    }

    global._postgresPool.on('error', (err: Error & { code?: string }) => {
      const msg = err?.message || '';
      const code = err?.code || '';
      const isTransientIdleDisconnect =
        msg.includes('Connection terminated unexpectedly') ||
        code === 'ECONNRESET' ||
        code === 'EPIPE' ||
        code === 'ETIMEDOUT' ||
        code === '57P01' ||
        code === '57P02' ||
        code === '57P03';
      if (isTransientIdleDisconnect) {
        // pg.Pool automatically removes the dead idle client and reconnects on next query.
        return;
      }
      console.error('Unexpected SQL pool error:', err?.message || err);
    });
  }
  return global._postgresPool;
};

export const pool = createPool();

export const db = drizzle(pool, { schema });
