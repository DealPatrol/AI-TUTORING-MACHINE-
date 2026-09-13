import { put } from '@vercel/blob';
import { airtableList, airtableCreateQueue, checkCronAuth, cleanQueueCaption, getTipDayNumber } from './helpers';
import { dailyLesson } from './daily-lessons';
import { renderLessonCard } from './lesson-art';
import { recordPipelineStatus } from './pipeline-status';

export async function generateDailyLesson(request, operation = 'generate') {
  if (!checkCronAuth(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const day = await getTipDayNumber();
    const lesson = dailyLesson(day);
    // Query all matching rows, not an arbitrary first page of the queue.
    const existing = await airtableList('Queue', 'filterByFormula=' + encodeURIComponent(`{Hook}=${JSON.stringify(lesson.hook)}`), { paginate: true });
    const recent = existing.some(r => r.fields.Status === 'Ready' || r.fields.Status === 'Processing' || Date.parse(r.fields['Posted At'] || r.createdTime) > Date.now() - 13 * 86400000);
    if (recent) {
      await recordPipelineStatus(operation, { outcome: 'skipped', details: { reason: 'Lesson already queued or recently published' } });
      return Response.json({ ok: true, skipped: true, message: 'Today’s lesson already queued or recently published' });
    }
    const urls = [];
    for (let i = 0; i < lesson.slides.length; i++) {
      const image = await renderLessonCard({ ...lesson.slides[i], label: `PRACTICAL AI  /  ${i+1} OF ${lesson.slides.length}` });
      const blob = await put(`lessons/${day}-${i+1}.jpg`, image, { access: 'public', contentType: 'image/jpeg' });
      urls.push(blob.url);
    }
    await airtableCreateQueue({ Hook: lesson.hook, Caption: cleanQueueCaption(lesson.caption), Status: 'Ready', Type: 'Carousel', 'Image URL': urls[0], 'Slide URLs': JSON.stringify(urls), 'Day Number': day });
    await recordPipelineStatus(operation, { outcome: 'queued', details: { hook: lesson.hook, type: 'Carousel', mode: 'curated', slides: urls.length } });
    return Response.json({ ok: true, queued: lesson.hook, type: 'Carousel', slides: urls.length, mode: 'curated' });
  } catch (error) {
    await recordPipelineStatus(operation, { outcome: 'failed', error: error.message });
    return Response.json({ error: error.message }, { status: 500 });
  }
}
