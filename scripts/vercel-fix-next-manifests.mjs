// scripts/vercel-fix-next-manifests.mjs
// v2.3.4 (PROOF-BASED: prune missing manifest refs that cause Vercel lstat ENOENT)
// - Keeps v2.3.3 intent:
//     - patch required-server-files.json
//     - patch *.js.nft.json traces to include client-reference manifests
//     - Fix Path A: align repo-root /server/** from required-server-files.json
//     - Ensure _not-found and not-found variants (best-effort)
// - NEW (v2.3.4):
//     - PRUNE stale references to missing files from required-server-files.json
//     - PRUNE targeted stale references from *.js.nft.json (only manifest refs)
//   This directly prevents Vercel from lstat()'ing paths that do not exist.
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
  // required-server-files.json expects paths like "server/app/..."
  return path.relative(nextRoot, absPath).replace(/\\/g, "/");
}

function relFromRepo(absPath) {
  // NFT traces generally expect paths relative to repo root (process.cwd()).
  return path.relative(process.cwd(), absPath).replace(/\\/g, "/");
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
  if (!exists(requiredPath))
    return { ok: false, reason: "required-server-files.json missing" };

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

function patchNftTrace(nftPath, manifestAbsList) {
  // Add manifest files into the nft json "files" list (repo-relative).
  if (!exists(nftPath)) return { ok: false, reason: "nft missing" };

  let json;
  try {
    json = readJson(nftPath);
  } catch (e) {
    return { ok: false, reason: `failed to read nft json: ${String(e?.message ?? e)}` };
  }

  if (!Array.isArray(json.files)) json.files = [];

  const before = new Set(json.files);
  let added = 0;

  for (const abs of manifestAbsList) {
    const rel = relFromRepo(abs);
    if (!before.has(rel)) {
      json.files.push(rel);
      before.add(rel);
      added++;
    }
  }

  if (added === 0) return { ok: true, added: 0 };

  try {
    writeJson(nftPath, json);
  } catch (e) {
    return { ok: false, reason: `failed to write nft json: ${String(e?.message ?? e)}` };
  }

  return { ok: true, added };
}

function dedupeAbs(list) {
  const seen = new Set();
  const out = [];
  for (const p of list) {
    const norm = p.replace(/\\/g, "/");
    if (!seen.has(norm)) {
      seen.add(norm);
      out.push(p);
    }
  }
  return out;
}

function findNearestServerAppRoot(fromDir) {
  // Walk upwards until we find ".../server/app" (within current nextRoot).
  let cur = fromDir;
  for (let i = 0; i < 12; i++) {
    const cand = cur.replace(/\\/g, "/");
    if (cand.endsWith("/server/app")) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

function patchAllNftTraces(serverAppDir) {
  // For each *.js.nft.json, include sibling client-reference manifests if present.
  const all = walkFiles(serverAppDir);
  const nftFiles = all.filter((p) => p.endsWith(".js.nft.json"));

  let patchedCount = 0;
  let totalAdded = 0;

  for (const nft of nftFiles) {
    const dir = path.dirname(nft);

    const siblingPageManifest = path.join(dir, "page_client-reference-manifest.js");
    const siblingLayoutManifest = path.join(dir, "layout_client-reference-manifest.js");

    const addList = [];
    if (exists(siblingPageManifest)) addList.push(siblingPageManifest);
    if (exists(siblingLayoutManifest)) addList.push(siblingLayoutManifest);

    const rootServerApp = findNearestServerAppRoot(dir);
    if (rootServerApp) {
      const rootPageManifest = path.join(rootServerApp, "page_client-reference-manifest.js");
      const rootLayoutManifest = path.join(rootServerApp, "layout_client-reference-manifest.js");
      if (exists(rootPageManifest)) addList.push(rootPageManifest);
      if (exists(rootLayoutManifest)) addList.push(rootLayoutManifest);
    }

    if (addList.length === 0) continue;

    const r = patchNftTrace(nft, dedupeAbs(addList));
    if (r.ok && r.added > 0) {
      patchedCount++;
      totalAdded += r.added;
    }
  }

  return { nftCount: nftFiles.length, patchedCount, totalAdded };
}

function alignRepoRootServerFilesFromRequired(nextRoot, requiredPath) {
  if (!exists(requiredPath)) return { ok: false, reason: "required-server-files.json missing" };

  let json;
  try {
    json = readJson(requiredPath);
  } catch (e) {
    return { ok: false, reason: `failed to read required json: ${String(e?.message ?? e)}` };
  }

  const files = Array.isArray(json.files) ? json.files : [];
  const serverRel = files.filter((f) => typeof f === "string" && f.startsWith("server/"));

  let copied = 0;
  let missingSource = 0;
  let alreadyThere = 0;

  for (const rel of serverRel) {
    const src = path.join(nextRoot, rel);
    const dst = path.join(process.cwd(), rel);

    if (exists(dst)) {
      alreadyThere++;
      continue;
    }

    if (!exists(src)) {
      missingSource++;
      continue;
    }

    const r = tryCopy(src, dst);
    if (r.ok) copied++;
  }

  return { ok: true, entries: serverRel.length, copied, alreadyThere, missingSource };
}

function ensureNotFoundVariants(serverAppDir, nextRoot) {
  // Ensure both "_not-found" and "not-found" manifests exist (best-effort).
  // Copy source priority:
  //   1) base manifest in server/app
  //   2) the other variant (if already created)
  const basePage = path.join(serverAppDir, "page_client-reference-manifest.js");
  const baseLayout = path.join(serverAppDir, "layout_client-reference-manifest.js");

  const undersDir = path.join(serverAppDir, "_not-found");
  const normalDir = path.join(serverAppDir, "not-found");

  const undersPage = path.join(undersDir, "page_client-reference-manifest.js");
  const normalPage = path.join(normalDir, "page_client-reference-manifest.js");

  const undersLayout = path.join(undersDir, "layout_client-reference-manifest.js");
  const normalLayout = path.join(normalDir, "layout_client-reference-manifest.js");

  // Only create dirs if there is at least some source we could copy from.
  const canMakeAny =
    exists(basePage) || exists(baseLayout) || exists(undersPage) || exists(normalPage) || exists(undersLayout) || exists(normalLayout);

  if (!canMakeAny) {
    log("not-found variants: no base/variant manifests exist; skip creating folders/files.");
    return;
  }

  ensureDir(undersDir);
  ensureDir(normalDir);

  // PAGE: create _not-found
  if (!exists(undersPage)) {
    if (exists(basePage)) {
      const r = tryCopy(basePage, undersPage);
      if (r.ok) log("COPIED:", relFrom(nextRoot, basePage), "->", relFrom(nextRoot, undersPage));
    } else if (exists(normalPage)) {
      const r = tryCopy(normalPage, undersPage);
      if (r.ok) log("COPIED:", relFrom(nextRoot, normalPage), "->", relFrom(nextRoot, undersPage));
    }
  }

  // PAGE: create not-found
  if (!exists(normalPage)) {
    if (exists(basePage)) {
      const r = tryCopy(basePage, normalPage);
      if (r.ok) log("COPIED:", relFrom(nextRoot, basePage), "->", relFrom(nextRoot, normalPage));
    } else if (exists(undersPage)) {
      const r = tryCopy(undersPage, normalPage);
      if (r.ok) log("COPIED:", relFrom(nextRoot, undersPage), "->", relFrom(nextRoot, normalPage));
    }
  }

  // LAYOUT: create _not-found
  if (!exists(undersLayout)) {
    if (exists(baseLayout)) {
      const r = tryCopy(baseLayout, undersLayout);
      if (r.ok) log("COPIED:", relFrom(nextRoot, baseLayout), "->", relFrom(nextRoot, undersLayout));
    } else if (exists(normalLayout)) {
      const r = tryCopy(normalLayout, undersLayout);
      if (r.ok) log("COPIED:", relFrom(nextRoot, normalLayout), "->", relFrom(nextRoot, undersLayout));
    }
  }

  // LAYOUT: create not-found
  if (!exists(normalLayout)) {
    if (exists(baseLayout)) {
      const r = tryCopy(baseLayout, normalLayout);
      if (r.ok) log("COPIED:", relFrom(nextRoot, baseLayout), "->", relFrom(nextRoot, normalLayout));
    } else if (exists(undersLayout)) {
      const r = tryCopy(undersLayout, normalLayout);
      if (r.ok) log("COPIED:", relFrom(nextRoot, undersLayout), "->", relFrom(nextRoot, normalLayout));
    }
  }
}

function pruneRequiredServerFilesMissing(nextRoot, requiredPath) {
  // PROOF-BASED: remove entries that point to files that do NOT exist under nextRoot.
  if (!exists(requiredPath)) return { ok: false, reason: "required-server-files.json missing" };

  let json;
  try {
    json = readJson(requiredPath);
  } catch (e) {
    return { ok: false, reason: `failed to read required json: ${String(e?.message ?? e)}` };
  }

  const files = Array.isArray(json.files) ? json.files : [];
  const beforeCount = files.length;

  const kept = [];
  let removed = 0;

  for (const rel of files) {
    if (typeof rel !== "string") continue;
    const abs = path.join(nextRoot, rel);

    // Keep only if the file exists.
    if (exists(abs)) kept.push(rel);
    else removed++;
  }

  if (removed === 0) return { ok: true, removed: 0, before: beforeCount, after: beforeCount };

  json.files = kept;

  try {
    writeJson(requiredPath, json);
  } catch (e) {
    return { ok: false, reason: `failed to write required json: ${String(e?.message ?? e)}` };
  }

  return { ok: true, removed, before: beforeCount, after: kept.length };
}

function pruneNftTracesMissingManifestRefs(serverAppDir) {
  // PROOF-BASED + TARGETED:
  // Remove only manifest refs from *.js.nft.json if the referenced file does not exist in repo root.
  const all = walkFiles(serverAppDir);
  const nftFiles = all.filter((p) => p.endsWith(".js.nft.json"));

  let scanned = 0;
  let patched = 0;
  let totalRemoved = 0;

  const isManifestRef = (rel) =>
    typeof rel === "string" &&
    rel.replace(/\\/g, "/").includes("client-reference-manifest") &&
    rel.endsWith(".js");

  for (const nft of nftFiles) {
    scanned++;

    if (!exists(nft)) continue;

    let json;
    try {
      json = readJson(nft);
    } catch {
      continue;
    }

    if (!Array.isArray(json.files)) continue;

    const before = json.files.length;
    let removed = 0;

    const kept = [];
    for (const rel of json.files) {
      if (!isManifestRef(rel)) {
        kept.push(rel);
        continue;
      }

      const abs = path.join(process.cwd(), rel);
      if (exists(abs)) kept.push(rel);
      else removed++;
    }

    if (removed === 0) continue;

    json.files = kept;

    try {
      writeJson(nft, json);
      patched++;
      totalRemoved += removed;
      log("NFT PRUNE:", path.relative(process.cwd(), nft).replace(/\\/g, "/"), { removed, before, after: kept.length });
    } catch {
      // ignore
    }
  }

  return { scanned, patched, totalRemoved, nftCount: nftFiles.length };
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

  // 1) Route group copy fallback for ROOT page manifest
  const basePageManifest = path.join(serverApp, "page_client-reference-manifest.js");
  const baseLayoutManifest = path.join(serverApp, "layout_client-reference-manifest.js");

  log("base page manifest:", exists(basePageManifest) ? "FOUND" : "MISSING");
  log("base layout manifest:", exists(baseLayoutManifest) ? "FOUND" : "MISSING");

  // 1.1) Ensure both not-found variants exist (best-effort)
  ensureNotFoundVariants(serverApp, nextRoot);

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

    const destLayout = path.join(serverApp, g, "layout_client-reference-manifest.js");
    if (exists(baseLayoutManifest) && !exists(destLayout)) {
      const r2 = tryCopy(baseLayoutManifest, destLayout);
      if (r2.ok) {
        log("COPIED:", relFrom(nextRoot, baseLayoutManifest), "->", relFrom(nextRoot, destLayout));
        copiedCount++;
      }
    }
  }

  // 2) Include ALL client-reference manifests that ACTUALLY EXIST in required-server-files.json
  const allFiles = walkFiles(serverApp);
  const manifestFiles = allFiles.filter((p) =>
    /client-reference-manifest.*\.js$/.test(p.replace(/\\/g, "/"))
  );

  log("client-reference manifests found:", manifestFiles.length);

  const patched = patchRequiredServerFiles(nextRoot, required, manifestFiles);

  // 3) CRITICAL: Patch NFT traces so Vercel actually bundles these manifests (only adds existing)
  const nftPatched = patchAllNftTraces(serverApp);

  // 3.1) PRUNE stale required-server-files entries (this stops Vercel lstat ENOENT)
  const requiredPrune = pruneRequiredServerFilesMissing(nextRoot, required);

  // 3.2) PRUNE stale manifest refs inside NFT traces (targeted, proof-based)
  const nftPrune = pruneNftTracesMissingManifestRefs(serverApp);

  // 4) Fix Path A: ensure repo-root /server/** exists for any traced "server/..." file
  const aligned = alignRepoRootServerFilesFromRequired(nextRoot, required);

  log("SUMMARY:", {
    copiedCount,
    skippedCount,
    patched,
    nftPatched,
    requiredPrune,
    nftPrune,
    aligned,
  });
}

try {
  log("=== START ===");

  const nextRoot = path.join(process.cwd(), ".next");
  runForRoot(nextRoot);

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