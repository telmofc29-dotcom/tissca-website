// scripts/vercel-fix-next-manifests.mjs
// v3.0.0
//
// PURPOSE:
// - This script exists ONLY to patch certain Vercel Next.js build edge cases.
// - On Railway (or anywhere else), we must NOT touch .next output or fail builds.
//
// BEHAVIOUR:
// - If NOT running on Vercel -> exit 0 immediately.
// - If running on Vercel -> attempt best-effort fixes, never hard-fail.

import fs from "node:fs";
import path from "node:path";

function isVercel() {
  // Vercel sets VERCEL=1 and VERCEL_ENV=production|preview|development
  return process.env.VERCEL === "1" || !!process.env.VERCEL_ENV;
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeCopy(src, dest) {
  try {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    return true;
  } catch {
    return false;
  }
}

function run() {
  // ✅ Railway / local / any non-Vercel environment: do nothing.
  if (!isVercel()) {
    console.log("[vercel-fix-next-manifests] Skipping (not Vercel).");
    return;
  }

  const root = process.cwd();
  const nextRoot = path.join(root, ".next");
  const serverApp = path.join(nextRoot, "server", "app");

  if (!exists(serverApp)) {
    console.log("[vercel-fix-next-manifests] No .next/server/app found. Nothing to patch.");
    return;
  }

  // In some builds Vercel expects not-found manifest variants.
  const baseManifest = path.join(serverApp, "page_client-reference-manifest.js");
  if (!exists(baseManifest)) {
    console.log("[vercel-fix-next-manifests] Base manifest missing. Nothing to patch.");
    return;
  }

  const variants = ["_not-found", "not-found"];
  let copied = 0;

  for (const variant of variants) {
    const dest = path.join(serverApp, variant, "page_client-reference-manifest.js");
    if (!exists(dest)) {
      if (safeCopy(baseManifest, dest)) copied++;
    }
  }

  console.log(`[vercel-fix-next-manifests] Done. Copied ${copied} manifest(s).`);
}

try {
  run();
} catch (err) {
  // Never break deployments — best-effort only.
  console.log("[vercel-fix-next-manifests] Non-fatal error:", err?.message ?? err);
  process.exit(0);
}
