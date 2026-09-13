import sharp from 'sharp';
const escape = (s) => String(s).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
export function wrapText(text, limit) {
  const words = String(text || '').trim().split(/\s+/).flatMap(w => w.match(new RegExp(`.{1,${limit}}`, 'gu')) || []);
  const lines = []; let line = '';
  for (const word of words) { if ((line + ' ' + word).trim().length > limit) { lines.push(line); line = word; } else line = (line + ' ' + word).trim(); }
  if (line) lines.push(line);
  return lines;
}
export async function renderLessonCard({ headline, body = '', label = 'AI YOU CAN USE', footer = 'Save this • Try it today', width = 1080, height = 1350 }) {
  if (!headline || String(headline).length > 180 || String(body).length > 650) throw new Error('Lesson text missing or too long');
  const head = wrapText(headline, 22); const copy = wrapText(body, 36);
  const headSize = 66; const bodySize = 38;
  const top = height > 1500 ? 310 : 205;
  const bodyTop = top + head.length * 79 + 110;
  if (bodyTop + copy.length * 52 > height - 170) throw new Error('Lesson text overflows card; shorten it before publishing');
  const lines = (items, y, step, size, fill, weight) => items.map((l,i) => `<text x="84" y="${y+i*step}" font-size="${size}" fill="${fill}" font-weight="${weight}">${escape(l)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1080 ${height}"><rect width="1080" height="${height}" fill="#101b26"/><rect x="0" y="0" width="1080" height="14" fill="#c8fc60"/><g font-family="DejaVu Sans, sans-serif"><text x="84" y="104" fill="#c8fc60" font-size="25" letter-spacing="3">${escape(label)}</text>${lines(head,top,79,headSize,'#ffffff',700)}<rect x="84" y="${bodyTop-60}" width="110" height="5" fill="#c8fc60"/>${lines(copy,bodyTop,52,bodySize,'#dae4eb',400)}<text x="84" y="${height-100}" fill="#c8fc60" font-size="27">${escape(footer)}</text><text x="84" y="${height-52}" fill="#8c9ca9" font-size="23">@unlocking__ai</text></g></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}
