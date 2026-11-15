import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
export async function applyMigrations(sql) {
  const directory = path.resolve("supabase/migrations");
  for (const name of (await readdir(directory)).filter(n => /^\d+_.+\.sql$/.test(n)).sort())
    await sql.unsafe(await readFile(path.join(directory, name), "utf8"));
}
