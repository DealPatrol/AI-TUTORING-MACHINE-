import assert from "node:assert/strict";
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import {
  dailyReelLesson,
  dailyReelPack,
  DAILY_REEL_LESSON_COUNT,
  DAILY_REEL_SLOTS,
} from "../lib/daily-lessons.js";
import { renderReelFrame, renderBeatsToReel, REEL_WIDTH, REEL_HEIGHT } from "../lib/text-reel.js";

const hooks = new Set();
for (let i = 0; i < DAILY_REEL_LESSON_COUNT; i++) {
  const lesson = dailyReelLesson(i);
  assert.ok(lesson.hook.length > 6);
  assert.ok(lesson.caption.length < 2200);
  assert.equal(lesson.beats.length, 5);
  hooks.add(lesson.hook);
  for (let b = 0; b < lesson.beats.length; b++) {
    const jpeg = await renderReelFrame({
      ...lesson.beats[b],
      hook: b === 0,
    });
    const info = await sharp(jpeg).metadata();
    assert.equal(info.format, "jpeg");
    assert.equal(info.width, REEL_WIDTH);
    assert.equal(info.height, REEL_HEIGHT);
    if (b === 0) await assertReadableType(jpeg, lesson.hook);
  }
}
assert.equal(hooks.size, DAILY_REEL_LESSON_COUNT);

const pack = dailyReelPack(1);
assert.equal(pack.length, DAILY_REEL_SLOTS);
assert.deepEqual(pack.map((l) => l.slotLabel), ["8am CT", "noon CT", "7pm CT"]);
assert.notEqual(pack[0].hook, pack[1].hook);

const reel = await renderBeatsToReel(pack[0].beats);
assert.ok(Buffer.isBuffer(reel.video));
assert.ok(reel.video.length > 20000);
assert.equal(reel.video.subarray(4, 8).toString("ascii"), "ftyp");
assert.equal(reel.durationSeconds, 10.5);
await writeFile("/tmp/text-reel-preview.mp4", reel.video);
await writeFile("/tmp/text-reel-cover.jpg", reel.cover);

console.log(
  `text-reel tests passed: ${DAILY_REEL_LESSON_COUNT} unique hooks, ${DAILY_REEL_LESSON_COUNT * 5} frames, one ${reel.video.length}-byte MP4`
);

async function assertReadableType(jpeg, label) {
  const { data, info } = await sharp(jpeg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let light = 0;
  const pixels = info.width * info.height;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 220 && g > 220 && b > 220) light += 1;
  }
  assert.ok(light > 2500 && light < pixels * 0.45, `${label} rendered ${light} light pixels`);
}
