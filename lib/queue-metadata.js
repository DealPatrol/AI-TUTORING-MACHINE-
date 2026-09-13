// Preserve optional fields on older Airtable bases. Never send this envelope to Instagram.
const MARKER = /\n?\[QUEUE_META:([A-Za-z0-9+/=]+)\]/g;
export function stripQueueMetadata(caption = '') {
  return String(caption).replace(MARKER, '').trim();
}
export function encodeQueueMetadata(caption, metadata) {
  return `${stripQueueMetadata(caption)}\n[QUEUE_META:${Buffer.from(JSON.stringify(metadata)).toString('base64')}]`;
}
export function hydrateQueueRecord(record) {
  const fields = { ...record.fields };
  for (const match of String(fields.Caption || '').matchAll(MARKER)) {
    try {
      const metadata = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
      for (const key of ['Type', 'Slide URLs', 'Video URL', 'Cover URL', 'Story Image URL', 'First Comment', 'Bonus Prompt', 'Day Number', 'IG Media ID', 'Last Error', 'Retry Count', 'Reach', 'Saves', 'Shares', 'Likes', 'Comments', 'Plays']) {
        if (fields[key] == null && metadata[key] != null) fields[key] = metadata[key];
      }
    } catch { /* malformed legacy metadata is ignored */ }
  }
  return { ...record, fields };
}
