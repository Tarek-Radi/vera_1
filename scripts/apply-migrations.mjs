import { readdir, readFile } from "node:fs/promises";
const directory = new URL("../supabase/migrations/", import.meta.url);
export async function applyMigrations(sql) {
  const files = (await readdir(directory)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
  for (const file of files) await sql.unsafe(await readFile(new URL(file, directory), "utf8"));
}
