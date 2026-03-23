import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development" || process.env.NEXT_PWA_DISABLE === "true",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^\/api\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // Docker 배포용 (NAS standalone 빌드)
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["node-cron"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // node-cron은 Node.js 내장 모듈(node:crypto, path 등)을 사용하므로
      // webpack 번들링에서 제외하고 런타임에서 직접 require되도록 처리
      config.externals.push("node-cron");
    }
    return config;
  },
  images: {
    remotePatterns: [],
  },
};

export default pwaConfig(nextConfig);
