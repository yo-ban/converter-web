/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  serverExternalPackages: ['@napi-rs/canvas'],
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    
    // Handle native modules
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@napi-rs/canvas': false,
      };
    }
    
    return config;
  },
}

export default nextConfig;