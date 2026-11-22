import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

if (!connectionString) {
  if (!sqlHost) {
    throw new Error('Set DATABASE_URL (or SQL_HOST) in environment variables.');
  }
  if (!sqlDbName) {
    throw new Error('SQL_DB_NAME must be set in environment variables.');
  }
  if (!user) {
    throw new Error('SQL_ADMIN_USER must be set in environment variables.');
  }
  if (!password) {
    throw new Error('SQL_ADMIN_PASSWORD must be set in environment variables.');
  }
}

const isUnixSocket = Boolean(sqlHost && sqlHost.startsWith('/'));
const isLocalHost =
  sqlHost === 'localhost' ||
  sqlHost === '127.0.0.1' ||
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1');
const useSsl =
  !isUnixSocket &&
  (process.env.SQL_SSL === 'true' || (!isLocalHost && process.env.SQL_SSL !== 'false'));

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials: connectionString
    ? {
        url: connectionString,
      }
    : {
        host: sqlHost!,
        ...(isUnixSocket ? {} : { port: Number(process.env.SQL_PORT) || 5432 }),
        user: user!,
        password: password!,
        database: sqlDbName!,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
      },
  verbose: true,
});
