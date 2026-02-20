/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // IMPORTANT:
  // Do NOT disable output file tracing on Vercel.
  // Vercel relies on tracing to include Next.js server/app artifacts in the runtime bundle.
  // outputFileTracing: false,

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