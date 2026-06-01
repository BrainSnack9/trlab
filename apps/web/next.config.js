import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appRoot, '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: workspaceRoot
  },
  async rewrites() {
    const wasUrl = process.env.WAS_URL ?? process.env.NEXT_PUBLIC_WAS_URL ?? 'http://localhost:5174';
    return [
      {
        source: '/api/:path*',
        destination: `${wasUrl}/api/:path*`
      },
      {
        source: '/generated/:path*',
        destination: `${wasUrl}/generated/:path*`
      }
    ];
  }
};

export default nextConfig;
