import type { NextConfig } from "next";
const config: NextConfig = {
  // Isolate custom-flow browser tests from an already running storefront dev server.
  ...(process.env.VERA_CUSTOM_TEST === "1"
    ? { distDir: ".local/custom-next" }
    : {}),
  poweredByHeader: false,
  outputFileTracingExcludes: {
    "*": [
      "./private/**/*",
      "./.local/**/*",
      "./collection/**/*",
      "./tests/**/*",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Serve the original, small catalog assets on Workers. No paid Images binding.
    unoptimized: process.env.VERA_BUILD_TARGET === "cloudflare",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
