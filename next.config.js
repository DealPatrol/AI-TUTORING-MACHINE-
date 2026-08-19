/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    // ffmpeg-static resolves its executable path at runtime, so Next.js cannot
    // discover the binary through normal import tracing. Include it explicitly
    // in the generate-reel serverless function bundle.
    outputFileTracingIncludes: {
      "/api/cron/generate-reel": ["./node_modules/ffmpeg-static/ffmpeg"],
      "/api/trigger/generate-reel": ["./node_modules/ffmpeg-static/ffmpeg"],
    },
  },
};

module.exports = nextConfig;
