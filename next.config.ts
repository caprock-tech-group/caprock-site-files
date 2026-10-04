import type { NextConfig } from 'next';
const config: NextConfig = {
  serverExternalPackages: ['@netlify/database', '@netlify/blobs', 'pg'],
};
export default config;
