// scripts/vercel-fix-next-manifests.mjs
// v2.1.0 (ROBUST: ensure ALL client-reference manifests are included in Vercel output tracing)
// - Next 14 + App Router + Vercel can omit client-reference manifests from serverless bundle
// - Fix: add ALL *.client-reference-manifest*.js under .next/server/app/** to required-server-files.json
// - Still keeps the "route group copy" fallback for root page manifest (harmless, sometimes needed)
// - Never fail build; exits 0 on any mismatch.

import fs from "node:fs";
import path from "node:path";

function log(...args) {
  console.log("[vercel-fix-next-manifests]", ...args);
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

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function walkFiles(dir) {
  const out = [];
  if (!exists(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile()) out.push(full);
    }
  }
  return out;
}

function relFrom(nextRoot, absPath) {
  const rel = path.relative(nextRoot, absPath).replace(/\\/g, "/");
  // required-server-files.json expects paths like "server/app/..."
  return rel;
}

function findRouteGroups(serverAppDir) {
  try {
    return fs
      .readdirSync(serverAppDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^\(.*\)$/.test(d.name))
      .map((d) => d.name);
  } catch {
    return [];
  }
}

function tryCopy(src, dest) {
  try {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    return { ok: true };
  } catch (e) {
    return { ok: false, err: String(e?.message ?? e) };
  }
}

function patchRequiredServerFiles(nextRoot, requiredPath, extraFilesAbs) {
  if (!exists(requiredPath)) return { ok: false, reason: "required-server-files.json missing" };

  let json;
  try {
    json = readJson(requiredPath);
  } catch (e) {
    return { ok: false, reason: `failed to read json: ${String(e?.message ?? e)}` };
  }

  if (!Array.isArray(json.files)) json.files = [];

  const before = new Set(json.files);
  let added = 0;

  for (const abs of extraFilesAbs) {
    const rel = relFrom(nextRoot, abs);
    if (!before.has(rel)) {
      json.files.push(rel);
      before.add(rel);
      added++;
    }
  }

  try {
    writeJson(requiredPath, json);
  } catch (e) {
    return { ok: false, reason: `failed to write json: ${String(e?.message ?? e)}` };
  }

  return { ok: true, added, total: json.files.length };
}

function runForRoot(nextRoot) {
  log("----");
  log("NEXT ROOT:", nextRoot);

  const serverApp = path.join(nextRoot, "server", "app");
  const required = path.join(nextRoot, "required-server-files.json");

  log("server/app:", exists(serverApp) ? "FOUND" : "MISSING");
  log("required-server-files.json:", exists(required) ? "FOUND" : "MISSING");

  if (!exists(serverApp) || !exists(required)) {
    log("Nothing to patch for this root (skip).");
    return;
  }

  // 1) Route group copy fallback for ROOT page manifest (sometimes Next expects it in route group dir)
  const basePageManifest = path.join(serverApp, "page_client-reference-manifest.js");
  const baseLayoutManifest = path.join(serverApp, "layout_client-reference-manifest.js");

  log("base page manifest:", exists(basePageManifest) ? "FOUND" : "MISSING");
  log("base layout manifest:", exists(baseLayoutManifest) ? "FOUND" : "MISSING");

  const groups = findRouteGroups(serverApp);
  log("route groups found:", groups.length ? groups.join(", ") : "(none)");

  let copiedCount = 0;
  let skippedCount = 0;

  for (const g of groups) {
    const destPage = path.join(serverApp, g, "page_client-reference-manifest.js");
    if (exists(basePageManifest) && !exists(destPage)) {
      const r = tryCopy(basePageManifest, destPage);
      if (r.ok) {
        log("COPIED:", relFrom(nextRoot, basePageManifest), "->", relFrom(nextRoot, destPage));
        copiedCount++;
      } else {
        log("COPY FAILED:", g, r.err);
      }
    } else {
      skippedCount++;
    }

    // If a base layout manifest exists, mirror it too
    const destLayout = path.join(serverApp, g, "layout_client-reference-manifest.js");
    if (exists(baseLayoutManifest) && !exists(destLayout)) {
      const r2 = tryCopy(baseLayoutManifest, destLayout);
      if (r2.ok) {
        log("COPIED:", relFrom(nextRoot, baseLayoutManifest), "->", relFrom(nextRoot, destLayout));
        copiedCount++;
      }
    }
  }

  // 2) CRITICAL FIX: include ALL client-reference manifests in required-server-files.json
  const allFiles = walkFiles(serverApp);
  const manifestFiles = allFiles.filter((p) =>
    /client-reference-manifest.*\.js$/.test(p.replace(/\\/g, "/"))
  );

  log("client-reference manifests found:", manifestFiles.length);

  const patched = patchRequiredServerFiles(nextRoot, required, manifestFiles);

  log("SUMMARY:", {
    copiedCount,
    skippedCount,
    patched,
  });
}

try {
  log("=== START ===");

  const nextRoot = path.join(process.cwd(), ".next");
  runForRoot(nextRoot);

  // If Next standalone output exists, patch that too (some environments use it)
  const standaloneRoot = path.join(nextRoot, "standalone", ".next");
  if (exists(standaloneRoot)) {
    log("standalone .next detected — patching too.");
    runForRoot(standaloneRoot);
  } else {
    log("No standalone .next detected (ok).");
  }

  log("=== DONE ===");
} catch (e) {
  log("ERROR (ignored):", String(e?.message ?? e));
  log("=== DONE (with ignored error) ===");
  process.exit(0);
}