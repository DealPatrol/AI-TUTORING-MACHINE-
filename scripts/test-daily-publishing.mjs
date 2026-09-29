import assert from 'node:assert/strict';
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { dailyLesson, DAILY_LESSON_COUNT } from '../lib/daily-lessons.js';
import { renderLessonCard } from '../lib/lesson-art.js';
import { renderCaptionSlide } from '../lib/slide-render.js';
import { encodeQueueMetadata, hydrateQueueRecord, stripQueueMetadata } from '../lib/queue-metadata.js';
import { airtableCreateQueue, airtableList, safeAirtableUpdate, listReadyQueue, cleanQueueCaption, checkCronAuth } from '../lib/helpers.js';
const metadata = { Type: 'Carousel', 'Slide URLs': JSON.stringify(['https://example.org/1.jpg','https://example.org/2.jpg']) };
const caption = encodeQueueMetadata('A useful lesson', metadata);
assert.equal(stripQueueMetadata(caption), 'A useful lesson');
assert.equal(cleanQueueCaption(caption), 'A useful lesson');
assert.equal(hydrateQueueRecord({ fields: { Caption: caption } }).fields.Type, 'Carousel');
assert.equal(stripQueueMetadata(encodeQueueMetadata(caption, metadata)), 'A useful lesson');
const hooks = new Set();
for (let day = 0; day < DAILY_LESSON_COUNT; day++) {
 const lesson = dailyLesson(day); hooks.add(lesson.hook);
 assert.ok(lesson.caption.length < 2200);
 for (const slide of lesson.slides) {
   const jpeg = await renderLessonCard(slide);
   const info = await sharp(jpeg).metadata();
   assert.equal(info.format, 'jpeg'); assert.equal(info.width, 1080); assert.equal(info.height, 1350);
   await assertReadableType(jpeg, slide.headline);
   if(day===0 && slide===lesson.slides[0]) await writeFile('/tmp/lesson-preview.jpg',jpeg);
 }
}
const emergency = await renderCaptionSlide({
  headline: 'STOP AI FROM GUESSING',
  body: 'Add: "Answer only from these notes"',
  label: 'DAY 12',
  footer: 'Save this · Comment HOW',
});
await assertReadableType(emergency, 'emergency feed');
await writeFile('/tmp/emergency-feed.jpg', emergency);
const story = await renderCaptionSlide({
  headline: 'Make AI cite your notes',
  body: 'Open the post · Comment HOW',
  label: 'DAY 12',
  width: 1080,
  height: 1920,
});
const storyInfo = await sharp(story).metadata();
assert.equal(storyInfo.width, 1080);
assert.equal(storyInfo.height, 1920);
await assertReadableType(story, 'story');
await writeFile('/tmp/story-preview.jpg', story);
assert.equal(hooks.size, DAILY_LESSON_COUNT);
await assert.rejects(renderLessonCard({headline:'',body:'missing headline'}));
await assert.rejects(renderCaptionSlide({ headline: '   ', body: 'no title' }));

async function assertReadableType(jpeg, label) {
  const { data, info } = await sharp(jpeg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let light = 0;
  let accent = 0;
  const pixels = info.width * info.height;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 220 && g > 220 && b > 220) light += 1;
    if (g > 180 && r > 140 && b < 150 && g > r) accent += 1;
  }
  assert.ok(light > 2500 && light < pixels * 0.35, `${label} rendered ${light} light pixels`);
  assert.ok(accent > 400, `${label} rendered ${accent} accent pixels`);
}
// Simulate the deployed minimal Airtable base: only core fields exist.
let row; let writes=0;
const allowed = new Set(['Hook','Caption','Status','Image URL','Posted At']);
global.fetch = async (url, init={}) => {
 if(!init.method) return Response.json({records:row?[row]:[]});
 const body=JSON.parse(init.body); const fields=body.records?.[0]?.fields || body.fields;
 const unknown=Object.keys(fields).find(k=>!allowed.has(k));
 if(unknown) return Response.json({error:{type:'UNKNOWN_FIELD_NAME',message:`Unknown field name: "${unknown}"`}},{status:422});
 writes++; row={id:'recTest',createdTime:'2026-09-13T00:00:00Z',fields:{...row?.fields,...fields}};
 return Response.json(body.records ? {records:[row]} : row);
};
await airtableCreateQueue({Hook:'Test',Caption:'Useful instruction',Status:'Ready','Image URL':'https://example.org/1.jpg',...metadata});
assert.equal(writes,1);
assert.equal((await listReadyQueue('Carousel')).length,1);
assert.equal((await listReadyQueue('Feed')).length,0);
await safeAirtableUpdate('Queue','recTest',{'Last Error':'[PUBLISHING] uncertain'});
assert.equal((await listReadyQueue('Carousel')).length,0);
await safeAirtableUpdate('Queue','recTest',{Status:'Posted','Posted At':new Date().toISOString(),'IG Media ID':'media123','Last Error':''});
const [loaded]=await airtableList('Queue');
assert.equal(loaded.fields['IG Media ID'],'media123');
assert.equal(loaded.fields['Last Error'],'');
assert.equal(loaded.fields['Slide URLs'],metadata['Slide URLs']);
delete process.env.CRON_SECRET;
assert.equal(checkCronAuth(new Request('https://test',{headers:{authorization:'Bearer undefined'}})),false);
console.log('Daily publishing tests passed: 70 rendered slides, minimal schema roundtrip, retry state and auth');
