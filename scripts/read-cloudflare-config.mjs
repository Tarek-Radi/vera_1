import { readFile } from "node:fs/promises";
import { parse, printParseErrorCode } from "jsonc-parser";
export async function readCloudflareConfig() {
  const errors = [];
  const config = parse(await readFile("wrangler.jsonc", "utf8"), errors, {
    allowTrailingComma: true,
  });
  if (errors.length)
    throw new Error(
      `Invalid wrangler.jsonc: ${errors.map((e) => printParseErrorCode(e.error)).join(", ")}`,
    );
  return config;
}
