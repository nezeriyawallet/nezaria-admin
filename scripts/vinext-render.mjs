import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Render runs this project on Node.js. Tell Vite about that before either
// building or serving, so Cloudflare-only virtual imports are replaced by the
// local compatibility module.
process.env.NEZERIYA_RENDER = "true";

// Values pasted into the Render dashboard sometimes carry stray spaces, line
// breaks or quotes, which break HTTP headers and URL building. Normalise them.
for (const [name, value] of Object.entries(process.env)) {
  if (typeof value !== "string") continue;
  const cleaned = value.trim().replace(/^(["'])(.*)\1$/s, "$2").trim();
  if (cleaned !== value) process.env[name] = cleaned;
}
process.env.WRANGLER_LOG_PATH ??= ".wrangler/wrangler.log";

const command = process.argv[2];
if (command !== "build" && command !== "start") {
  throw new Error("Usage: node scripts/vinext-render.mjs <build|start>");
}

const bin = fileURLToPath(
  new URL(
    process.platform === "win32" ? "../node_modules/.bin/vinext.cmd" : "../node_modules/.bin/vinext",
    import.meta.url,
  ),
);

const child = spawn(bin, [command], {
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
