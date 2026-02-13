// scripts/vercel-fix-next-manifests.mjs
// v2.0.0 (FIX: Next 14 route groups like (public) are NOT emitted as folders in .next output on Vercel)
// - Never fail build if file paths differ
// - If the manifest exists in the flattened location, optionally copy it into the old expected path
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
  if (exists(to)) {
    console.log(`[vercel-fix] OK: already exists: ${to}`);
    return;
  }
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
  console.log(`[vercel-fix] Created: ${to} (copied from ${from})`);
}

const root = process.cwd();

// 1) Find actual manifest produced by Next
const found = findClientReferenceManifest(root);

if (!found) {
  console.log("[vercel-fix] Skip: page_client-reference-manifest.js not found anywhere. (No action needed)");
  process.exit(0);
}

// 2) Only if someone expects the old (public) path, create it
const legacyExpected = path.join(root, ".next/server/app/(public)/page_client-reference-manifest.js");

// If Next already outputs the (public) folder, do nothing.
// If Next outputs flattened file, copy it into the legacy location.
copyIfMissing(found, legacyExpected);

process.exit(0);