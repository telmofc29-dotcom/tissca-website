import fs from "fs/promises";
import path from "path";

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureFile(filePath, contents) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  if (!(await exists(filePath))) {
    await fs.writeFile(filePath, contents, "utf8");
    console.log("[vercel-fix] Created:", filePath);
  } else {
    console.log("[vercel-fix] Exists:", filePath);
  }
}

const root = process.cwd();

// Only run if Next build output exists (prevents creating fake .next in unexpected contexts)
const nextServerAppDir = path.join(root, ".next", "server", "app");
if (!(await exists(nextServerAppDir))) {
  console.log("[vercel-fix] Skipped: .next/server/app not found");
  process.exit(0);
}

// The one Vercel is failing on:
// IMPORTANT: only create this if the route-group folder exists
const publicGroupDir = path.join(nextServerAppDir, "(public)");
if (await exists(publicGroupDir)) {
  await ensureFile(
    path.join(publicGroupDir, "page_client-reference-manifest.js"),
    "module.exports = {};\n"
  );
} else {
  console.log("[vercel-fix] Skipped: .next/server/app/(public) not found");
}

// (Optional) If you ever see the same error for other route groups,
// you can add more ensureFile(...) lines here.