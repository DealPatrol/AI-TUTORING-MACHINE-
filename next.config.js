/** @type {import("next").NextConfig} */
const ffmpeg = ["./node_modules/ffmpeg-static/ffmpeg"];
const fonts = ["./lib/fonts/Inter-Regular.ttf", "./lib/fonts/Inter-Bold.ttf"];
const slideRoutes = [
  "/api/cron/generate",
  "/api/trigger/generate",
  "/api/cron/generate-carousel",
  "/api/trigger/generate-carousel",
  "/api/cron/generate-reel",
  "/api/trigger/generate-reel",
  "/api/cron/recap",
  "/api/trigger/recap",
  "/api/cron/recycle",
  "/api/trigger/recycle",
  "/api/cron/boost",
  "/api/trigger/boost",
];
const videoRoutes = new Set([
  "/api/cron/generate",
  "/api/trigger/generate",
  "/api/cron/generate-reel",
  "/api/trigger/generate-reel",
]);

const outputFileTracingIncludes = {};
for (const route of slideRoutes) {
  outputFileTracingIncludes[route] = videoRoutes.has(route) ? [...ffmpeg, ...fonts] : fonts;
}

const nextConfig = {
  experimental: {
    // ffmpeg-static and the bundled Inter files are read from disk at runtime.
    // Next cannot discover either through import tracing, so include them in
    // every function that typesets a slide or stitches a Reel.
    outputFileTracingIncludes,
  },
};

module.exports = nextConfig;
