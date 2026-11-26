import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

declare global {
  // eslint-disable-next-line no-var
  var _postgresPool: Pool | undefined;
}

const TRANSIENT_PG_CODES = new Set([
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now (scale-to-zero wake)
  "08000", // connection_exception
  "08003", // connection_does_not_exist
  "08006", // connection_failure
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
]);

export function isTransientIdleDisconnectError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  if (e.code && TRANSIENT_PG_CODES.has(String(e.code))) return true;
  const msg = String(e.message || "");
  return (
    /Connection terminated unexpectedly/i.test(msg) ||
    /terminating connection due to administrator command/i.test(msg) ||
    /Client has encountered a connection error/i.test(msg) ||
    /ECONNRESET|EPIPE|ETIMEDOUT/i.test(msg)
  );
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    global._postgresPool.on("error", (err) => {
      // Cloud SQL (scale-to-zero / proxy) routinely closes idle TCP sockets.
      // pg.Pool automatically removes the closed idle client and reconnects on the next query.
      if (isTransientIdleDisconnectError(err)) {
        return;
      }
      console.warn(
        "SQL pool client error (will reconnect on next query):",
        err instanceof Error ? err.message : String(err)
      );
    });
  }
  return global._postgresPool;
};

export const pool = createPool();
export const db = drizzle(pool, { schema });
