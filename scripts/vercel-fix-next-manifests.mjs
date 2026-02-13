import fs from "fs";
import path from "path";

function ensureFile(filePath, contents) {
  // ✅ ALWAYS create the parent dir (even if it didn't exist)
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  // ✅ ALWAYS ensure the file exists (this is what Next.js is lstat()'ing)
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, contents, "utf8");
    console.log("[vercel-fix] Created:", filePath);
  } else {
    console.log("[vercel-fix] Exists:", filePath);
  }
}

const root = process.cwd();

// ✅ The one Vercel is failing on (MUST exist by the end of the build)
ensureFile(
  path.join(root, ".next", "server", "app", "(public)", "page_client-reference-manifest.js"),
  "module.exports = {};\n"
);

// (Optional) If you ever see the same error for other route groups,
// you can add more ensureFile(...) lines here.