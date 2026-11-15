import { readFile } from "node:fs/promises";
import postgres from "postgres";
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL first.");
const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
});
try {
  await sql.unsafe(
    await readFile(
      new URL("../supabase/migrations/001_store.sql", import.meta.url),
      "utf8",
    ),
  );
  console.log("Store migration applied.");
} finally {
  await sql.end();
}
