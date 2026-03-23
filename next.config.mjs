import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // Docker 배포용 (standalone 빌드)
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["node-cron"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // node-cron, https: Node.js 내장/런타임 제공 — webpack 번들링 제외
      config.externals.push("node-cron");
      config.externals.push("https");
    }
    return config;
  },
  images: {
    remotePatterns: [],
  },
};

// Docker 빌드(NEXT_PWA_DISABLE=true) 시 next-pwa 래퍼 자체를 적용하지 않음
// next-pwa 5.x + Next.js 14 App Router 호환성 이슈로 인해 빌드 실패 방지
const isPWADisabled =
  process.env.NEXT_PWA_DISABLE === "true" ||
  process.env.NODE_ENV === "development";

const pwaConfig = withPWA({
  dest: "public",
  disable: isPWADisabled,
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

export default isPWADisabled ? nextConfig : pwaConfig(nextConfig);
