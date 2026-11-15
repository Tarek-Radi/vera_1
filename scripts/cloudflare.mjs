import { spawn } from "node:child_process";
import { access, readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { readCloudflareConfig } from "./read-cloudflare-config.mjs";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const action = process.argv[2];
if (
  !["build", "preview", "check", "deploy"].includes(action) ||
  process.argv.length !== 3
)
  throw new Error(
    "Use npm run build:cloudflare, preview:cloudflare, check:cloudflare or deploy:cloudflare (no extra flags).",
  );
const config = await readCloudflareConfig();
if (
  config.main !== ".open-next/worker.js" ||
  config.assets?.directory !== ".open-next/assets"
)
  throw new Error(
    "Deploy the OpenNext worker and its assets together; out/ and raw .next/ are not deployable.",
  );
if (
  config.services?.find((s) => s.binding === "WORKER_SELF_REFERENCE")
    ?.service !== config.name
)
  throw new Error(
    "WORKER_SELF_REFERENCE must match the configured Worker name.",
  );
if (config.vars?.SITE_URL !== config.vars?.NEXT_PUBLIC_SITE_URL)
  throw new Error(
    "SITE_URL and NEXT_PUBLIC_SITE_URL must match in wrangler.jsonc.",
  );
const env = {
  ...process.env,
  ...config.vars,
  VERA_BUILD_TARGET: "cloudflare",
  WRANGLER_SEND_METRICS: "false",
  NEXT_TELEMETRY_DISABLED: "1",
  // Prevent Wrangler from redirecting dry runs into an adapter deployment.
  OPEN_NEXT_DEPLOY: "true",
};
const adapter = "node_modules/@opennextjs/cloudflare/dist/cli/index.js";
const wrangler = "node_modules/wrangler/bin/wrangler.js";
function run(file, args = [], capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], {
      env,
      stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
      windowsHide: true,
    });
    let output = "";
    if (capture)
      child.stdout.on("data", (chunk) => {
        output += chunk;
      });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve(output)
        : reject(new Error(`${file} exited with ${code}`)),
    );
    for (const signal of ["SIGINT", "SIGTERM"]) {
      const stop = () => child.kill(signal);
      process.once(signal, stop);
      child.once("exit", () => process.removeListener(signal, stop));
    }
  });
}
async function build() {
  // Explicitly precede the adapter; do not depend on npm's prebuild lifecycle.
  await run("scripts/generate-products.mjs");
  await run(adapter, ["build"]);
  // This cache is just copied into ASSETS; no remote storage is touched.
  await run(adapter, ["populateCache", "local"]);
  await access(".open-next/worker.js");
  await mkdir(".local", { recursive: true });
  await writeFile(
    ".local/cloudflare-build.json",
    JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        next: JSON.parse(
          await readFile("node_modules/next/package.json", "utf8"),
        ).version,
        adapter: JSON.parse(
          await readFile(
            "node_modules/@opennextjs/cloudflare/package.json",
            "utf8",
          ),
        ).version,
        origin: config.vars.NEXT_PUBLIC_SITE_URL,
      },
      null,
      2,
    ),
  );
}
async function check() {
  await access(".open-next/worker.js");
  await run(wrangler, [
    "deploy",
    "--dry-run",
    "--outdir",
    ".local/cloudflare-bundle",
  ]);
}
if (action === "deploy") {
  // Refuse a placeholder, unknown account, accidental new Worker or local fixture target.
  if (
    !config.name ||
    config.name.includes("replace-") ||
    !/^[a-f\d]{32}$/i.test(config.account_id || "")
  )
    throw new Error(
      "Confirm the EXISTING Worker name and account ID in your Cloudflare account, then set name, account_id and WORKER_SELF_REFERENCE in wrangler.jsonc. No deployment attempted.",
    );
  if (
    !/^https:\/\//.test(config.vars.NEXT_PUBLIC_SITE_URL) ||
    !config.vars.NEXT_PUBLIC_SUPABASE_URL ||
    !config.vars.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    throw new Error(
      "Configure the production HTTPS origin and existing Supabase public Auth settings in wrangler.jsonc before deployment.",
    );
  const existing = JSON.parse(
    await run(wrangler, ["deployments", "list", "--json"], true),
  );
  if (!Array.isArray(existing) || existing.length === 0)
    throw new Error(
      "The configured Worker has no existing deployment. Refusing to create a new site.",
    );
  const secrets = JSON.parse(
    await run(wrangler, ["secret", "list", "--format", "json"], true),
  );
  for (const name of ["DATABASE_URL", "COUPON_HMAC_SECRET"]) {
    if (!secrets.some((secret) => secret.name === name))
      throw new Error(
        `Configure the ${name} Worker secret on the confirmed existing Worker before deploying. Its value is never printed here.`,
      );
  }
  await build();
  await check();
  await run(adapter, ["deploy"]);
} else if (action === "build") {
  await build();
} else if (action === "check") {
  await check();
} else {
  await access(".open-next/worker.js");
  await run(adapter, [
    "preview",
    "--local",
    "--ip",
    "127.0.0.1",
    "--port",
    "8787",
  ]);
}
