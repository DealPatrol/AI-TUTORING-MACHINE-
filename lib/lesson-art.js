import { rasterizeSvg, textPath } from "./slide-render.js";

export function wrapText(text, limit) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .flatMap((word) => word.match(new RegExp(`.{1,${limit}}`, "gu")) || []);
  const lines = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > limit) {
      lines.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderLessonCard({
  headline,
  body = "",
  label = "AI YOU CAN USE",
  footer = "Save this • Try it today",
  width = 1080,
  height = 1350,
}) {
  if (!headline || String(headline).length > 180 || String(body).length > 650) {
    throw new Error("Lesson text missing or too long");
  }
  const head = wrapText(headline, 22);
  const copy = wrapText(body, 36);
  const headSize = 66;
  const bodySize = 38;
  const top = height > 1500 ? 310 : 205;
  const bodyTop = top + head.length * 79 + 110;
  if (bodyTop + copy.length * 52 > height - 170) {
    throw new Error("Lesson text overflows card; shorten it before publishing");
  }
  const lines = (items, y, step, size, fill, weight) =>
    items.map((line, index) => textPath({ text: line, x: 84, y: y + index * step, size, fill, weight })).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#101b26"/><rect x="0" y="0" width="${width}" height="14" fill="#c8fc60"/>${textPath({ text: label, x: 84, y: 104, size: 25, fill: "#c8fc60", weight: 700, tracking: 2 })}${lines(head, top, 79, headSize, "#ffffff", 700)}<rect x="84" y="${bodyTop - 60}" width="110" height="5" fill="#c8fc60"/>${lines(copy, bodyTop, 52, bodySize, "#dae4eb", 400)}${textPath({ text: footer, x: 84, y: height - 100, size: 27, fill: "#c8fc60", weight: 700 })}${textPath({ text: "@unlocking__ai", x: 84, y: height - 52, size: 23, fill: "#8c9ca9", weight: 400 })}</svg>`;
  return rasterizeSvg(svg);
}
