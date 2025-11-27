import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['ssh2', 'prisma', '@prisma/client'],
};

export default nextConfig;
