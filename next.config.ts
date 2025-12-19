import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Only rewrite to local Flask server in development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/anonymize',
          destination: 'http://127.0.0.1:5000/anonymize',
        },
        {
          source: '/api/extract-text',
          destination: 'http://127.0.0.1:5000/extract-text',
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
