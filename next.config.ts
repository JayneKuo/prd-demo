import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Fix: multiple lockfiles detected — pin tracing root to this project directory
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
