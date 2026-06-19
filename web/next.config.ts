import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export → web/out/ → served by the Worker's [assets] binding.
  output: "export",
  // SPA fallback is handled by `not_found_handling = "single-page-application"`
  // on the Worker side; trailingSlash here keeps Worker asset routing simple.
  trailingSlash: true,
  // No next/image use, but the optimizer doesn't run on static export anyway.
  images: { unoptimized: true },
};

export default nextConfig;
