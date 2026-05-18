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

  // PDFKit uses fs.readFileSync(__dirname + '/data/Helvetica.afm') at runtime.
  // When webpack bundles pdfkit, __dirname is rewritten to the chunks output
  // directory (.next/server/chunks/) and the AFM files are not copied there,
  // causing ENOENT on Vercel.
  //
  // NOTE: These two keys are nested under `experimental` because this project
  // is on Next 14. (In Next 15+ they are flat top-level keys.)
  experimental: {
    // Prevent webpack from bundling pdfkit so __dirname stays correct at runtime.
    serverComponentsExternalPackages: ['pdfkit'],
    // Vercel's output file tracer cannot statically resolve the dynamic
    // fs.readFileSync(__dirname + '/data/...') calls inside pdfkit.
    // Explicitly include all AFM font metric files and the ICC colour profile
    // so they are present in the serverless deployment bundle.
    outputFileTracingIncludes: {
      '**/*': ['./node_modules/pdfkit/js/data/**/*'],
    },
  },

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