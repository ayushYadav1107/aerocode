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
};

export default nextConfig;
