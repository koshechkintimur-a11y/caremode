import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // рабочий корень — папка проекта (иначе Next ищет его по lockfile выше)
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
