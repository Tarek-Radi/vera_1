import { applyMigrations } from "./apply-migrations.mjs";
import postgres from "postgres";
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL first.");
const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
});
try {
  await applyMigrations(sql);
  console.log("Store migrations applied in filename order; existing records preserved.");
} finally {
  await sql.end();
}
