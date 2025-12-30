/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloud Run用の設定
  output: 'standalone',

  // 環境変数
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },

  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // 画像の最適化設定
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },

  // 実験的機能
  experimental: {
    // serverComponentsExternalPackages: ['@prisma/client'],
  },
};

module.exports = nextConfig;
