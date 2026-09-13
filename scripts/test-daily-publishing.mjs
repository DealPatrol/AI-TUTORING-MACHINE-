import assert from 'node:assert/strict';
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { dailyLesson, DAILY_LESSON_COUNT } from '../lib/daily-lessons.js';
import { renderLessonCard } from '../lib/lesson-art.js';
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
   if(day===0 && slide===lesson.slides[2]) await writeFile('/tmp/lesson-preview.jpg',jpeg);
 }
}
assert.equal(hooks.size, DAILY_LESSON_COUNT);
await assert.rejects(renderLessonCard({headline:'',body:'missing headline'}));
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
