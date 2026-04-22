import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is best for Docker / self-hosted binaries. Azure App
  // Service's Oryx builder runs `npm run start` against the full `.next`
  // build, so we intentionally use Next's default output here.
};

export default nextConfig;
