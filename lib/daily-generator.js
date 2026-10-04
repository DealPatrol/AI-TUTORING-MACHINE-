import { put } from "@vercel/blob";
import { airtableList, airtableCreateQueue, checkCronAuth, cleanQueueCaption, getTipDayNumber } from "./helpers";
import { dailyReelPack, DAILY_REEL_SLOTS } from "./daily-lessons";
import { renderBeatsToReel } from "./text-reel";
import { recordPipelineStatus } from "./pipeline-status";

async function isRecentHook(hook) {
  const existing = await airtableList(
    "Queue",
    "filterByFormula=" + encodeURIComponent(`{Hook}=${JSON.stringify(hook)}`),
    { paginate: true }
  );
  return existing.some(
    (r) =>
      r.fields.Status === "Ready" ||
      r.fields.Status === "Processing" ||
      Date.parse(r.fields["Posted At"] || r.createdTime) > Date.now() - 13 * 86400000
  );
}

export async function generateDailyLesson(request, operation = "generate") {
  if (!checkCronAuth(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const day = await getTipDayNumber();
    const pack = dailyReelPack(day);
    const queued = [];
    const skipped = [];

    for (const lesson of pack) {
      if (await isRecentHook(lesson.hook)) {
        skipped.push(lesson.hook);
        continue;
      }

      const reel = await renderBeatsToReel(lesson.beats, {
        label: `3 WINS A DAY  ·  ${lesson.slotLabel}`,
      });
      const stamp = `${day}-${lesson.slot}-${Date.now()}`;
      const coverBlob = await put(`reels/cover-${stamp}.jpg`, reel.cover, {
        access: "public",
        contentType: "image/jpeg",
      });
      const videoBlob = await put(`reels/text-${stamp}.mp4`, reel.video, {
        access: "public",
        contentType: "video/mp4",
      });
      const storyBlob = await put(`stories/reel-${stamp}.jpg`, reel.cover, {
        access: "public",
        contentType: "image/jpeg",
      });

      await airtableCreateQueue({
        Hook: lesson.hook,
        Caption: cleanQueueCaption(lesson.caption),
        Status: "Ready",
        Type: "Reel",
        "Image URL": coverBlob.url,
        "Cover URL": coverBlob.url,
        "Video URL": videoBlob.url,
        "Story Image URL": storyBlob.url,
        "First Comment": lesson.firstComment,
        "Day Number": day,
        Sequence: lesson.slot,
      });
      queued.push({
        hook: lesson.hook,
        slot: lesson.slot,
        slotLabel: lesson.slotLabel,
        durationSeconds: reel.durationSeconds,
      });
    }

    if (queued.length === 0) {
      await recordPipelineStatus(operation, {
        outcome: "skipped",
        details: { reason: "All three daily Reels already queued or recently published" },
      });
      return Response.json({
        ok: true,
        skipped: true,
        message: "Today’s 3 Reels already queued or recently published",
        skippedHooks: skipped,
      });
    }

    await recordPipelineStatus(operation, {
      outcome: "queued",
      details: { type: "Reel", mode: "text-reel", count: queued.length, hooks: queued.map((q) => q.hook) },
    });
    return Response.json({
      ok: true,
      queued: queued.map((q) => q.hook),
      type: "Reel",
      count: queued.length,
      slots: DAILY_REEL_SLOTS,
      skipped: skipped.length,
      mode: "text-reel",
    });
  } catch (error) {
    console.error(`Daily ${operation} error:`, error);
    await recordPipelineStatus(operation, { outcome: "failed", error: error.message });
    return Response.json({ error: error.message }, { status: 500 });
  }
}
