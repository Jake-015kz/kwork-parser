import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["grammy", "@neondatabase/serverless"],
};

export default nextConfig;
