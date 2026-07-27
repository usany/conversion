import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['playwright', 'playwright-core'],
  // TypeScript 7 dropped the compiler API Next reads directly; the CLI path is the
  // only one that accepts it. Remove if the project moves back to TypeScript 6.
  experimental: { useTypeScriptCli: true },
};

export default nextConfig;
