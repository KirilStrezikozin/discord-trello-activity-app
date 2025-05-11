import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  /* Configure zlib-sync (dependency of discord.js) which uses `.node` files. */
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  webpack: (config, _options) => {
    config.module.rules.push({
      test: /\.node/,
      use: 'node-loader'
    })

    return config
  },
};

export default nextConfig;