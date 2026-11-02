import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The embedded Postgres loads its WebAssembly and data files from its own folder at runtime, so it isn't bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
