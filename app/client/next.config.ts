import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@nrl/types"],

  turbopack: {
    root: path.join(__dirname),
  },

  // ✅ host patterns (NO scheme, NO port)
  allowedDevOrigins: ["192.168.1.7", "localhost", "127.0.0.1"],
};

export default nextConfig;
