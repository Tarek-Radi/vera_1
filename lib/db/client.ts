import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import postgres from "postgres";
import { StoreError } from "../orders/validation";
const globalDb = globalThis as unknown as {
  veraDb?: ReturnType<typeof postgres>;
};
type Client = ReturnType<typeof postgres>;
const requestDb = new AsyncLocalStorage<{ client?: Client }>();

// A Workers socket belongs to one request. Never reuse it in another request.
export function withDatabaseRequest<T>(work: () => Promise<T>): Promise<T> {
  return requestDb.run({}, async () => {
    const scope = requestDb.getStore()!;
    try {
      return await work();
    } finally {
      await scope.client?.end({ timeout: 5 });
    }
  });
}
export const databaseConfigured = () => Boolean(process.env.DATABASE_URL);
export function db() {
  if (!process.env.DATABASE_URL)
    throw new StoreError(
      "Online checkout is being set up. Please contact VERA on WhatsApp for help.",
      503,
      "NOT_CONFIGURED",
    );
  const scope = requestDb.getStore();
  if (!scope && process.env.VERA_RUNTIME === "cloudflare")
    throw new Error("Workers database access requires withDatabaseRequest.");
  const create = () =>
    postgres(process.env.DATABASE_URL!, {
      max: 1,
      prepare: false,
      fetch_types: false,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
    });
  if (scope) return (scope.client ??= create());
  // Local Node scripts/tests can reuse a pool. Production routes use the scope above.
  return (globalDb.veraDb ??= create());
}
