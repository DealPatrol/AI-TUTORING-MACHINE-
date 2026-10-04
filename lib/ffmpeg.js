import { existsSync } from "node:fs";
import { join } from "node:path";
import bundledFfmpegPath from "ffmpeg-static";

// ffmpeg-static computes its binary path from __dirname. If webpack ever bundles
// it, __dirname becomes .next/server/chunks and spawn fails with ENOENT, so
// next.config.js keeps it external and this falls back to the traced binary.
export function resolveFfmpegPath() {
  const candidates = [
    bundledFfmpegPath,
    join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) || null;
}
