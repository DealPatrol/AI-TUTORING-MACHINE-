// RECYCLE — turn proven posts back into fresh queue items after 3 weeks.
// Winning ideas already found an audience; a new hook lets them find another.

import { put } from "@vercel/blob";
import {
  checkCronAuth,
  airtableCreateQueue,
  getTipDayNumber,
  rewriteJson,
  listPostedQueue,
  airtableList,
} from "@/lib/helpers";
import {
  recycleGrowthPrompt,
  buildEmergencyGrowthContent,
  buildFirstComment,
} from "@/lib/growth";
import { renderCaptionSlide } from "@/lib/slide-render";
import { pickRecycleCandidate } from "@/lib/growth-stats";

export const maxDuration = 180;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [posted, ready] = await Promise.all([
      listPostedQueue({ maxRecords: 80 }),
      airtableList("Queue", "filterByFormula=" + encodeURIComponent(`{Status}="Ready"`)).catch(() => []),
    ]);

    const usedSourceUrls = new Set(
      [...posted, ...ready]
        .map((row) => String(row.fields?.["Source URL"] || ""))
        .filter((url) => url.startsWith("recycle:"))
    );
    const originalUsed = new Set(
      ready.map((row) => String(row.fields?.["Source URL"] || "")).filter(Boolean)
    );

    const candidate =
      pickRecycleCandidate(posted, { minAgeDays: 21, usedSourceUrls: new Set([...usedSourceUrls, ...originalUsed]) }) ||
      pickRecycleCandidate(posted, { minAgeDays: 14, usedSourceUrls: new Set([...usedSourceUrls, ...originalUsed]) });

    if (!candidate) {
      return Response.json({
        ok: true,
        skipped: true,
        message: "No proven posts old enough to recycle yet",
      });
    }

    const dayNumber = await getTipDayNumber();
    const source = (candidate.fields.Caption || candidate.fields.Hook || "").slice(0, 1500);
    let content;
    let copyError = null;
    try {
      content = await rewriteJson(
        recycleGrowthPrompt(source, candidate.fields.Hook, dayNumber),
        { requiredKeys: ["hook", "caption"] }
      );
    } catch (error) {
      copyError = `copy: ${error.message}`;
      console.error("AI copy unavailable — using emergency recycle copy:", error.message);
      content = buildEmergencyGrowthContent("feed");
    }

    const stamp = Date.now();
    const image = await renderCaptionSlide({
      headline: content.hook,
      body: content.subtext || "",
      label: dayNumber ? `DAY ${dayNumber}` : "AI YOU CAN USE",
    });
    const blob = await put(`posts/recycle-${stamp}.jpg`, image, {
      access: "public",
      contentType: "image/jpeg",
    });

    const story = await renderCaptionSlide({
      headline: content.storyText || content.hook,
      body: "Open the post · Comment HOW",
      label: dayNumber ? `DAY ${dayNumber}` : "NEW TIP",
      footer: "Follow @unlocking__ai",
      width: 1080,
      height: 1920,
    });
    const storyBlob = await put(`stories/recycle-${stamp}.jpg`, story, {
      access: "public",
      contentType: "image/jpeg",
    });

    const sourceUrl = `recycle:${candidate.id}`;
    await airtableCreateQueue({
      Hook: content.hook,
      Caption: content.caption,
      "Image URL": blob.url,
      Status: "Ready",
      Type: "Feed",
      "First Comment": content.firstComment || buildFirstComment(),
      "Story Text": content.storyText || content.hook,
      "Story Image URL": storyBlob.url,
      "Source URL": sourceUrl,
      "Day Number": dayNumber,
      "Bonus Prompt": content.bonusPrompt || "",
      "Fallback Used": Boolean(copyError),
      "Last Error": copyError ? copyError.slice(0, 1000) : undefined,
    });

    return Response.json({
      ok: true,
      queued: content.hook,
      recycledFrom: candidate.fields.Hook || candidate.id,
      originalReach: candidate.fields.Reach || 0,
      dayNumber,
    });
  } catch (err) {
    console.error("Recycle cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
