import type { NextConfig } from "next";

/** `next build` → dist (export estático). `next dev` → .next (caché aparte). */
const isStaticExportBuild = process.argv.includes("build");

const nextConfig: NextConfig = {
  output: "export",
  distDir: isStaticExportBuild ? "dist" : ".next",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
