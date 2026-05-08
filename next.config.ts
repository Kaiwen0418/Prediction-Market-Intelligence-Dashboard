import type { NextConfig } from "next";

const isStaticExport = process.env.STATIC_EXPORT === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isStaticExport
    ? {
        assetPrefix: basePath || undefined,
        basePath: basePath || undefined,
        images: {
          unoptimized: true
        },
        output: "export",
        trailingSlash: true
      }
    : {})
};

export default nextConfig;
