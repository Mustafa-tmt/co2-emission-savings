import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal server bundle for Azure App Service (zip deploy + node server.js)
  output: "standalone",
  serverExternalPackages: ["@react-pdf/renderer", "qrcode"],
  // Avoid /_next/image server-side fetch on App Service (often returns HTML / fails → "not a valid image")
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/favicon.png" }];
  },
};

export default nextConfig;
