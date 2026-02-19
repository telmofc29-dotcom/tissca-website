// scripts/vercel-fix-next-manifests.mjs
// v2.1.0 (FIX+: Copy manifest into ALL route-group folders, not just (public))
// - Never fail build if file paths differ
// - Find the real page_client-reference-manifest.js (flattened or already grouped)
// - Copy into any missing (group) folder locations that may be expected by tooling/runtime
// - If nothing is found, exit 0 (do not break deployment)

import fs from "node:fs";
import path from "node:path";

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

function findClientReferenceManifest(root) {
  const candidates = [
    path.join(root, ".next/server/app/page_client-reference-manifest.js"),
    path.join(root, ".next/server/app/(public)/page_client-reference-manifest.js"),
    path.join(root, ".next/server/app/(admin)/page_client-reference-manifest.js"),
    path.join(root, ".next/server/app/(auth)/page_client-reference-manifest.js"),
  ];

  for (const p of candidates) {
    if (exists(p)) return p;
  }

  // Fallback: scan .next/server/app recursively for the file
  const base = path.join(root, ".next/server/app");
  if (!exists(base)) return null;

  const stack = [base];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && e.name === "page_client-reference-manifest.js") return full;
    }
  }

  return null;
}

function copyIfMissing(from, to) {
  try {
    if (exists(to)) {
      console.log(`[vercel-fix] OK: already exists: ${to}`);
      return;
    }
    ensureDir(path.dirname(to));
    fs.copyFileSync(from, to);
    console.log(`[vercel-fix] Created: ${to} (copied from ${from})`);
  } catch (err) {
    // Never break deployment
    console.log(
      `[vercel-fix] Skip: failed to copy to ${to}. Reason: ${err?.message ?? String(err)}`
    );
  }
}

function listRouteGroupDirs(appRoot) {
  // Route groups are folders like "(public)", "(admin)", "(auth)", etc.
  // We’ll collect ALL folders matching /^\(.*\)$/ anywhere under appRoot.
  const groups = new Set();
  const stack = [appRoot];

  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const e of entries) {
      if (!e.isDirectory()) continue;

      const full = path.join(dir, e.name);
      stack.push(full);

      if (e.name.startsWith("(") && e.name.endsWith(")")) {
        groups.add(full);
      }
    }
  }

  return Array.from(groups);
}

const root = process.cwd();
const appRoot = path.join(root, ".next/server/app");

// 1) Find actual manifest produced by Next
const found = findClientReferenceManifest(root);

if (!found) {
  console.log(
    "[vercel-fix] Skip: page_client-reference-manifest.js not found anywhere. (No action needed)"
  );
  process.exit(0);
}

if (!exists(appRoot)) {
  console.log("[vercel-fix] Skip: .next/server/app not found. (No action needed)");
  process.exit(0);
}

// 2) Always ensure the common legacy location exists for (public) (keeps backwards compatibility)
const legacyPublic = path.join(appRoot, "(public)/page_client-reference-manifest.js");
copyIfMissing(found, legacyPublic);

// 3) Copy into ALL route group folders we can see (e.g. (admin), (auth), etc.)
const groupDirs = listRouteGroupDirs(appRoot);

if (groupDirs.length === 0) {
  console.log("[vercel-fix] OK: no route-group folders found under .next/server/app.");
  process.exit(0);
}

for (const groupDir of groupDirs) {
  const target = path.join(groupDir, "page_client-reference-manifest.js");
  copyIfMissing(found, target);
}

process.exit(0);
