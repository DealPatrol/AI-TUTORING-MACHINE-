// RECYCLE — turn proven posts back into fresh queue items after 3 weeks.
// Winning ideas already found an audience; a new hook lets them find another.

import { put } from "@vercel/blob";
import {
  checkCronAuth,
  airtableCreateQueue,
  generateGeminiImage,
  getTipDayNumber,
  parseClaudeJson,
  rewriteCopy,
  listPostedQueue,
  airtableList,
} from "@/lib/helpers";
import { recycleGrowthPrompt, buildFirstComment, storyOverlayPrompt } from "@/lib/growth";
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
    const content = parseClaudeJson(
      await rewriteCopy(recycleGrowthPrompt(source, candidate.fields.Hook, dayNumber))
    );

    const stamp = Date.now();
    const image = await generateGeminiImage(
      `Create a clean modern Instagram graphic, square 1:1.
Soft cream background, bold dark charcoal headline, small friendly robot mascot,
flat design, generous whitespace.
Headline (render exactly): "${content.hook}"
Subtext (render exactly): "${content.subtext || ""}"
Tiny label: "Day ${dayNumber}"`
    );
    const blob = await put(`posts/recycle-${stamp}.png`, image.buffer, {
      access: "public",
      contentType: "image/png",
    });

    const story = await generateGeminiImage(
      storyOverlayPrompt(content.hook, content.storyText, dayNumber)
    );
    const storyBlob = await put(`stories/recycle-${stamp}.png`, story.buffer, {
      access: "public",
      contentType: "image/png",
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
