import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/anonymize',
        destination: 'http://127.0.0.1:5000/anonymize',
      },
      {
        source: '/api/extract-text',
        destination: 'http://127.0.0.1:5000/extract-text',
      },
    ]
  },
};

export default nextConfig;
