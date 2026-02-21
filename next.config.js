/** @type {import('next').NextConfig} */
const fs = require("fs");
const path = require("path");

function ensureNotFoundManifests() {
  const nextRoot = path.join(process.cwd(), ".next");
  const serverApp = path.join(nextRoot, "server", "app");

  if (!fs.existsSync(serverApp)) return;

  const baseManifest = path.join(serverApp, "page_client-reference-manifest.js");
  if (!fs.existsSync(baseManifest)) return;

  const variants = ["_not-found", "not-found"];

  for (const variant of variants) {
    const dir = path.join(serverApp, variant);
    const file = path.join(dir, "page_client-reference-manifest.js");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(file)) {
      fs.copyFileSync(baseManifest, file);
    }
  }
}

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.plugins.push({
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap("EnsureNotFoundManifests", () => {
          ensureNotFoundManifests();
        });
      },
    });

    return config;
  },
};

module.exports = nextConfig;