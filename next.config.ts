import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Power the header to hide version info
  poweredByHeader: false,
  
  // Output target for Vercel
  output: "standalone",
  
  // React Strict Mode for better error detection
  reactStrictMode: true,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_NAME: "Scanova",
    NEXT_PUBLIC_APP_VERSION: "1.0.0",
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;