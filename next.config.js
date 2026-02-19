/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // v1.0.2 (FIX: Vercel build ENOENT on traced path .next/server/app/(public)/page_client-reference-manifest.js)
  // Disable output tracing so the build doesn't lstat route-group paths that aren't emitted as folders.
  outputFileTracing: false,

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

module.exports = nextConfig;