import type { NextConfig } from "next";
import { WEBCONTAINER_COEP } from "./features/webContainers/coep";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers(){
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: WEBCONTAINER_COEP,
          }
        ]
      }
    ]
  },
  /* config options here */
  reactCompiler: true,
  // app/api/template/[id]/route.ts reads this directory with a runtime-built
  // fs path, not a static import, so Vercel's file tracer can't see it and
  // would otherwise ship the function without the starter templates.
  outputFileTracingIncludes: {
    "/api/template/[id]": ["./Aerocode-starters/**/*"],
  },
};

export default nextConfig;
