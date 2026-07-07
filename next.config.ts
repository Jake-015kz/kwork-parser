import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["grammy", "openai", "@neondatabase/serverless"],
};

export default nextConfig;
