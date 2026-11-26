import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,           // 每秒轮询一次文件变化
        aggregateTimeout: 200, // 变化后等 200ms 再触发编译，合并连续保存
      };
    }
    return config;
  },
};

export default nextConfig;
