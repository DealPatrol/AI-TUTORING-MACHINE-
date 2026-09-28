// Text-on-screen Reels: 9:16 frames + FFmpeg. No Veo, no image-model credits.
// This is the format Instagram actually distributes to non-followers.

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { wrapText } from "./lesson-art.js";
import { stitchVideoBuffers } from "./helpers.js";

const escape = (s) =>
  String(s).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));

export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;
export const BEAT_SECONDS = 2.1;

export async function renderReelFrame({
  headline,
  body = "",
  label = "3 AI WINS A DAY",
  footer = "Follow @unlocking__ai",
  hook = false,
}) {
  if (!headline || String(headline).length > 140 || String(body).length > 280) {
    throw new Error("Reel text missing or too long");
  }
  const head = wrapText(headline, hook ? 12 : 16);
  const copy = wrapText(body, 24);
  const headSize = hook ? 92 : 72;
  const headStep = hook ? 108 : 86;
  const top = hook ? 520 : 380;
  const bodyTop = top + head.length * headStep + 90;
  if (bodyTop + copy.length * 56 > REEL_HEIGHT - 220) {
    throw new Error("Reel text overflows frame; shorten it before publishing");
  }
  const textLines = (items, y, step, size, fill, weight) =>
    items
      .map((line, i) => `<text x="72" y="${y + i * step}" font-size="${size}" fill="${fill}" font-weight="${weight}">${escape(line)}</text>`)
      .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${REEL_WIDTH}" height="${REEL_HEIGHT}" viewBox="0 0 ${REEL_WIDTH} ${REEL_HEIGHT}">
<rect width="${REEL_WIDTH}" height="${REEL_HEIGHT}" fill="#101b26"/>
<rect x="0" y="0" width="${REEL_WIDTH}" height="18" fill="#c8fc60"/>
<g font-family="DejaVu Sans, sans-serif">
<text x="72" y="160" fill="#c8fc60" font-size="28" letter-spacing="4">${escape(label)}</text>
${textLines(head, top, headStep, headSize, "#ffffff", 700)}
<rect x="72" y="${bodyTop - 70}" width="140" height="6" fill="#c8fc60"/>
${textLines(copy, bodyTop, 56, 40, "#dae4eb", 400)}
<text x="72" y="${REEL_HEIGHT - 140}" fill="#c8fc60" font-size="30">${escape(footer)}</text>
<text x="72" y="${REEL_HEIGHT - 86}" fill="#8c9ca9" font-size="24">Save this · Comment HOW</text>
</g>
</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

async function imageToClip(jpegBuffer, seconds = BEAT_SECONDS) {
  if (!ffmpegPath) throw new Error("FFmpeg binary is unavailable");
  const workDir = await mkdtemp(join(tmpdir(), "text-reel-"));
  const inputPath = join(workDir, "slide.jpg");
  const outputPath = join(workDir, "clip.mp4");
  await writeFile(inputPath, jpegBuffer);
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(ffmpegPath, [
        "-y",
        "-loop",
        "1",
        "-t",
        String(seconds),
        "-i",
        inputPath,
        "-f",
        "lavfi",
        "-t",
        String(seconds),
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-vf",
        `scale=${REEL_WIDTH}:${REEL_HEIGHT},fps=30`,
        "-c:v",
        "libx264",
        "-tune",
        "stillimage",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        "-movflags",
        "+faststart",
        outputPath,
      ]);
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error("FFmpeg image-to-clip timed out"));
      }, 30000);
      child.stderr.on("data", (chunk) => {
        stderr = `${stderr}${chunk}`.slice(-3000);
      });
      child.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg image-to-clip failed (${code}): ${stderr}`));
      });
    });
    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function renderBeatsToReel(beats, { label = "3 AI WINS A DAY" } = {}) {
  const frames = [];
  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    frames.push(
      await renderReelFrame({
        headline: beat.headline,
        body: beat.body,
        label: `${label}  ·  ${i + 1}/${beats.length}`,
        footer: i === beats.length - 1 ? "Follow for the next one" : "Watch to the end",
        hook: i === 0,
      })
    );
  }
  const clips = [];
  for (const frame of frames) {
    clips.push(await imageToClip(frame));
  }
  return {
    cover: frames[0],
    frames,
    video: await stitchVideoBuffers(clips),
    durationSeconds: Number((beats.length * BEAT_SECONDS).toFixed(1)),
  };
}
