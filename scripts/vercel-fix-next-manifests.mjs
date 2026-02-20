// scripts/vercel-fix-next-manifests.mjs
// v3.0.0 (Vercel runtime-safe)
// - Copies flattened client-reference manifests into route-group folders
// - Patches required-server-files.json so Vercel includes them in the runtime bundle
// - Supports both normal and standalone outputs
// - Never fails the build (exits 0), but prints LOUD diagnostics

import fs from "node:fs";
import path from "node:path";

const LOG_PREFIX = "[vercel-fix-next-manifests]";
const cwd = process.cwd();

function log(...args) {
  console.log(LOG_PREFIX, ...args);
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
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function listDirs(dir) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

function isRouteGroupDir(name) {
  return name.startsWith("(") && name.endsWith(")");
}

function copyIfMissing(src, dest) {
  if (!exists(src)) return { ok: false, reason: "src_missing" };
  if (exists(dest)) return { ok: true, copied: false };

  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return { ok: true, copied: true };
}

function detectRequiredFilesPrefix(requiredJson) {
  const files = Array.isArray(requiredJson.files) ? requiredJson.files : [];
  const sample = files.find((f) => typeof f === "string") || "";
  if (sample.startsWith(".next/")) return ".next/";
  if (sample.startsWith("next/")) return "next/";
  return ".next/";
}

function patchRequiredServerFiles(requiredPath, entriesToAddAbsPaths) {
  if (!exists(requiredPath)) {
    return { ok: false, reason: "required_server_files_missing" };
  }

  const json = readJson(requiredPath);
  if (!Array.isArray(json.files)) json.files = [];

  const prefix = detectRequiredFilesPrefix(json);

  const relEntries = entriesToAddAbsPaths
    .map((abs) => path.relative(cwd, abs).replaceAll("\\", "/"))
    .filter(
      (rel) =>
        rel.startsWith(prefix) || rel.startsWith(".next/") || rel.startsWith("next/")
    );

  let added = 0;
  for (const rel of relEntries) {
    if (!json.files.includes(rel)) {
      json.files.push(rel);
      added++;
    }
  }

  if (added > 0) writeJson(requiredPath, json);
  return { ok: true, added, total: json.files.length };
}

function processNextRoot(nextRootAbs) {
  const serverAppAbs = path.join(nextRootAbs, "server", "app");
  const requiredAbs = path.join(nextRootAbs, "required-server-files.json");

  log("----");
  log("NEXT ROOT:", path.relative(cwd, nextRootAbs) || ".");
  log("server/app:", exists(serverAppAbs) ? "FOUND" : "MISSING");
  log("required-server-files.json:", exists(requiredAbs) ? "FOUND" : "MISSING");

  if (!exists(serverAppAbs)) {
    return { ok: false, reason: "server_app_missing" };
  }

  const basePageManifest = path.join(serverAppAbs, "page_client-reference-manifest.js");
  const baseLayoutManifest = path.join(
    serverAppAbs,
    "layout_client-reference-manifest.js"
  );

  log("base page manifest:", exists(basePageManifest) ? "FOUND" : "MISSING");
  log("base layout manifest:", exists(baseLayoutManifest) ? "FOUND" : "MISSING");

  const topDirs = listDirs(serverAppAbs);
  const routeGroups = topDirs.filter(isRouteGroupDir);

  log("route groups found:", routeGroups.length ? routeGroups.join(", ") : "(none)");

  let copiedCount = 0;
  let skippedCount = 0;
  let missingBaseCount = 0;
  const createdAbsPaths = [];

  for (const group of routeGroups) {
    const groupAbs = path.join(serverAppAbs, group);

    const targetPage = path.join(groupAbs, "page_client-reference-manifest.js");
    const pageRes = copyIfMissing(basePageManifest, targetPage);
    if (!pageRes.ok && pageRes.reason === "src_missing") missingBaseCount++;
    if (pageRes.ok && pageRes.copied) {
      copiedCount++;
      createdAbsPaths.push(targetPage);
      log(
        "COPIED:",
        path.relative(cwd, basePageManifest),
        "->",
        path.relative(cwd, targetPage)
      );
    } else if (pageRes.ok && pageRes.copied === false) {
      skippedCount++;
    }

    const targetLayout = path.join(groupAbs, "layout_client-reference-manifest.js");
    const layoutRes = copyIfMissing(baseLayoutManifest, targetLayout);
    if (!layoutRes.ok && layoutRes.reason === "src_missing") missingBaseCount++;
    if (layoutRes.ok && layoutRes.copied) {
      copiedCount++;
      createdAbsPaths.push(targetLayout);
      log(
        "COPIED:",
        path.relative(cwd, baseLayoutManifest),
        "->",
        path.relative(cwd, targetLayout)
      );
    } else if (layoutRes.ok && layoutRes.copied === false) {
      skippedCount++;
    }
  }

  let patchInfo = { ok: false, reason: "skipped" };
  if (createdAbsPaths.length > 0) {
    patchInfo = patchRequiredServerFiles(requiredAbs, createdAbsPaths);
    if (patchInfo.ok) {
      log(
        "PATCHED required-server-files.json:",
        path.relative(cwd, requiredAbs),
        "added:",
        patchInfo.added
      );
    } else {
      log("WARN could not patch required-server-files.json:", patchInfo.reason);
    }
  } else {
    log("No new files created; skipping required-server-files.json patch.");
  }

  log("SUMMARY:", { copiedCount, skippedCount, missingBaseCount, patched: patchInfo });
  return {
    ok: true,
    copiedCount,
    createdAbsPathsCount: createdAbsPaths.length,
    patchInfo,
  };
}

function main() {
  log("=== START ===");

  const normalNextRoot = path.join(cwd, ".next");
  const standaloneNextRoot = path.join(cwd, ".next", "standalone", ".next");

  if (exists(normalNextRoot)) {
    processNextRoot(normalNextRoot);
  } else {
    log("No .next directory found (build might not have produced output).");
  }

  if (exists(standaloneNextRoot)) {
    processNextRoot(standaloneNextRoot);
  } else {
    log("No standalone .next detected (ok).");
  }

  log("=== DONE ===");
  process.exit(0);
}

try {
  main();
} catch (e) {
  log("ERROR (non-fatal):", e?.stack || e?.message || String(e));
  process.exit(0);
}