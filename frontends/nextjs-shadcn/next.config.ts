import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: `next build` emits ./out, servable by any nginx — the
  // same hosting story as the default veridocs theme.
  output: "export",
  images: { unoptimized: true },
  // veridocs uses dynamic require() for config loading; load it natively
  // instead of bundling it.
  serverExternalPackages: ["veridocs"],
};

export default nextConfig;
