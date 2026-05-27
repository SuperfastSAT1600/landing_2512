import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/coaches/[slug]': ['./src/data/**/*'],
    '/practice/june-2026': ['./master_sat_ontology_v3.jsonl'],
    '/api/practice/june-2026': ['./master_sat_ontology_v3.jsonl'],
  },
  async redirects() {
    return [
      { source: '/admin/naver', destination: '/admin/traffic', permanent: false },
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
