import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal server bundle for Azure App Service (zip deploy + node server.js)
  output: "standalone",
  serverExternalPackages: ["@react-pdf/renderer", "qrcode"],
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/favicon.png" }];
  },
};

export default nextConfig;
