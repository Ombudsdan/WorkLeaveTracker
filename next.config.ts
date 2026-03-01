import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Disable the client-side router cache for statically-rendered routes.
    // Without this, Next.js caches client-component pages for up to 5 minutes,
    // restoring the previous React snapshot on navigation and skipping
    // data-fetching effects — causing the "nothing in network / profile not
    // loaded" bugs when navigating between pages.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

export default nextConfig;
