// Instagram cards are drawn as glyph outlines from the bundled Inter files.
// Serverless hosts do not ship DejaVu, and asking an image model to letter the
// headline produces the blank bars and black rectangles that were reaching the feed.

import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const opentype = require("opentype.js");

const BACKGROUND = "#101b26";
const ACCENT = "#c8fc60";
const HEADLINE = "#ffffff";
const BODY = "#dae4eb";
const MUTED = "#8c9ca9";

const fontDirectoryCandidates = [
  join(process.cwd(), "lib", "fonts"),
  join(dirname(fileURLToPath(import.meta.url)), "fonts"),
];

function fontFile(filename) {
  const path = fontDirectoryCandidates.map((dir) => join(dir, filename)).find((candidate) => existsSync(candidate));
  if (!path) throw new Error(`Missing font ${filename}`);
  return path;
}

function loadFont(filename) {
  const bytes = readFileSync(fontFile(filename));
  return opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

const regular = loadFont("Inter-Regular.ttf");
const bold = loadFont("Inter-Bold.ttf");

function face(weight) {
  return weight >= 600 ? bold : regular;
}

function glyphAdvance(font, char, size) {
  const glyph = font.charToGlyph(char);
  return ((glyph.advanceWidth || 0) * size) / font.unitsPerEm;
}

export function textWidth(text, size, weight = 400) {
  const font = face(weight);
  let width = 0;
  for (const char of String(text || "")) width += glyphAdvance(font, char, size);
  return width;
}

export function textPath({ text, x, y, size, fill, weight = 400, tracking = 0 }) {
  const value = String(text ?? "");
  if (!value) return "";
  const font = face(weight);
  const commands = [];
  let cursor = x;
  for (const char of value) {
    const glyph = font.charToGlyph(char);
    const data = glyph.getPath(cursor, y, size).toPathData(2);
    if (data) commands.push(data);
    cursor += glyphAdvance(font, char, size) + tracking;
  }
  if (commands.length === 0) return "";
  return `<path fill="${fill}" d="${commands.join(" ")}"/>`;
}

export async function rasterizeSvg(svg) {
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

function wrapToWidth(text, size, weight, maxWidth) {
  const lines = [];
  for (const paragraph of String(text || "").split(/\n+/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (textWidth(next, size, weight) <= maxWidth) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      if (textWidth(word, size, weight) <= maxWidth) {
        line = word;
        continue;
      }
      let chunk = "";
      for (const char of word) {
        const trial = chunk + char;
        if (chunk && textWidth(trial, size, weight) > maxWidth) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk = trial;
        }
      }
      line = chunk;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function fitLines(text, startSize, minSize, weight, maxWidth, maxLines) {
  let size = startSize;
  let lines = wrapToWidth(text, size, weight, maxWidth);
  while (lines.length > maxLines && size > minSize) {
    size -= 2;
    lines = wrapToWidth(text, size, weight, maxWidth);
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const last = lines[maxLines - 1].replace(/…$/, "");
    lines[maxLines - 1] = last.length > 1 ? `${last.slice(0, -1)}…` : "…";
  }
  return { size, lines };
}

export async function renderCaptionSlide({
  headline,
  body = "",
  label = "AI YOU CAN USE",
  footer = "Save this · Comment HOW",
  subfooter = "@getcashwithai",
  width = 1080,
  height = 1350,
}) {
  const title = String(headline || "").replace(/\s+/g, " ").trim();
  if (!title) throw new Error("Slide headline is required");
  const copy = String(body || "").trim();
  const pad = 84;
  const maxWidth = width - pad * 2;
  const story = height >= 1800;
  const top = story ? 300 : 220;
  const footerY = height - (story ? 150 : 108);
  const bottom = footerY - 70;

  let headlineSize = story ? 80 : 64;
  let bodySize = story ? 42 : 36;
  let headLines = [];
  let bodyLines = [];
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const fittedHead = fitLines(title, headlineSize, 40, 700, maxWidth, story ? 5 : 4);
    const fittedBody = fitLines(copy, bodySize, 26, 400, maxWidth, story ? 10 : 9);
    headlineSize = fittedHead.size;
    bodySize = fittedBody.size;
    headLines = fittedHead.lines;
    bodyLines = fittedBody.lines;
    const headStep = Math.round(headlineSize * 1.18);
    const bodyStep = Math.round(bodySize * 1.38);
    const bodyTop = top + headLines.length * headStep + (bodyLines.length ? 78 : 0);
    if (bodyTop + bodyLines.length * bodyStep <= bottom) break;
    if (headlineSize <= 40 && bodySize <= 26) break;
    headlineSize = Math.max(40, headlineSize - 4);
    bodySize = Math.max(26, bodySize - 2);
  }

  const headStep = Math.round(headlineSize * 1.18);
  const bodyStep = Math.round(bodySize * 1.38);
  const bodyTop = top + headLines.length * headStep + (bodyLines.length ? 78 : 0);
  const maxBodyLines = Math.max(0, Math.floor((bottom - bodyTop) / bodyStep));
  if (bodyLines.length > maxBodyLines) {
    bodyLines = bodyLines.slice(0, maxBodyLines);
    if (bodyLines.length > 0) {
      const last = bodyLines[bodyLines.length - 1].replace(/…$/, "");
      bodyLines[bodyLines.length - 1] = last.length > 1 ? `${last.slice(0, -1)}…` : "…";
    }
  }
  const labelSize = textWidth(label, 26, 700) > maxWidth ? 20 : 26;
  const labelTracking = textWidth(label, labelSize, 700) + label.length * 1.4 < maxWidth ? 1.4 : 0;
  const paths = [
    textPath({
      text: label,
      x: pad,
      y: story ? 168 : 112,
      size: labelSize,
      fill: ACCENT,
      weight: 700,
      tracking: labelTracking,
    }),
    ...headLines.map((line, index) =>
      textPath({
        text: line,
        x: pad,
        y: top + index * headStep,
        size: headlineSize,
        fill: HEADLINE,
        weight: 700,
      })
    ),
    ...bodyLines.map((line, index) =>
      textPath({
        text: line,
        x: pad,
        y: bodyTop + index * bodyStep,
        size: bodySize,
        fill: BODY,
        weight: 400,
      })
    ),
    textPath({ text: footer, x: pad, y: footerY, size: story ? 32 : 28, fill: ACCENT, weight: 700 }),
    textPath({ text: subfooter, x: pad, y: height - (story ? 88 : 56), size: 24, fill: MUTED, weight: 400 }),
  ].join("");
  const bar =
    bodyLines.length > 0
      ? `<rect x="${pad}" y="${bodyTop - 46}" width="120" height="6" fill="${ACCENT}"/>`
      : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${BACKGROUND}"/><rect width="${width}" height="${story ? 18 : 14}" fill="${ACCENT}"/>${bar}${paths}</svg>`;
  return rasterizeSvg(svg);
}
