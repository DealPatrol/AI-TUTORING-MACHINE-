/** @type {import("next").NextConfig} */
const { existsSync } = require("node:fs");
const { join } = require("node:path");

// pnpm symlinks node_modules/ffmpeg-static into .pnpm/ and Node resolves the
// real path at runtime. Trace only the real file: Vercel rejects functions that
// contain files inside a symlinked directory.
const ffmpeg = existsSync(join(__dirname, "node_modules", ".pnpm"))
  ? ["./node_modules/.pnpm/ffmpeg-static@*/node_modules/ffmpeg-static/ffmpeg"]
  : ["./node_modules/ffmpeg-static/ffmpeg"];
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
    // Keep ffmpeg-static as a runtime require so its __dirname-based binary path
    // points at node_modules, not .next/server/chunks (spawn ENOENT otherwise).
    serverComponentsExternalPackages: ["ffmpeg-static"],
    // ffmpeg-static and the bundled Inter files are read from disk at runtime.
    // Next cannot discover either through import tracing, so include them in
    // every function that typesets a slide or stitches a Reel.
    outputFileTracingIncludes,
  },
};

module.exports = nextConfig;
