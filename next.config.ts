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
  // WebContainer runs in the browser and needs cross-origin isolation.
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
            // Must match the `coep` option passed to WebContainer.boot()
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
