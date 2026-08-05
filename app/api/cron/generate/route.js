// SKILL 02 + 03 — THE COPYWRITER + THE DESIGNER (runs daily)
// Growth-optimized feed graphic + Story creative + Day N streak.

import { put } from "@vercel/blob";
import {
  checkCronAuth,
  airtableList,
  airtableCreateQueue,
  airtableUpdate,
  claudeRewrite,
  parseClaudeJson,
  generateGeminiImage,
  getTipDayNumber,
} from "@/lib/helpers";
import { feedGrowthPrompt, buildFirstComment, storyOverlayPrompt } from "@/lib/growth";

export const maxDuration = 120;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const winners = await airtableList(
      "Winners",
      "maxRecords=1&filterByFormula=" + encodeURIComponent(`{Status}="New"`)
    );
    if (winners.length === 0) {
      return Response.json({ ok: true, message: "No new winners left — research cron will refill Monday" });
    }
    const winner = winners[0];
    const dayNumber = await getTipDayNumber();

    const raw = await claudeRewrite(feedGrowthPrompt(winner.fields.Caption || "", dayNumber));
    const content = parseClaudeJson(raw);
    const stamp = Date.now();

    const { buffer } = await generateGeminiImage(
      `Create a clean, modern Instagram graphic, square 1:1.
Style: soft cream background, bold dark charcoal sans-serif headline,
one small friendly robot mascot illustration, generous whitespace,
subtle blue and green accents. Flat design, no photo.
Tiny top label: "Day ${dayNumber}"
Headline text (render exactly): "${content.hook}"
Smaller subtext below it (render exactly): "${content.subtext || ""}"`
    );

    const blob = await put(`posts/${stamp}.png`, buffer, {
      access: "public",
      contentType: "image/png",
    });

    const story = await generateGeminiImage(
      storyOverlayPrompt(content.hook, content.storyText, dayNumber)
    );
    const storyBlob = await put(`stories/${stamp}.png`, story.buffer, {
      access: "public",
      contentType: "image/png",
    });

    const firstComment =
      content.firstComment ||
      buildFirstComment({ topicTag: content.topicTag });

    await airtableCreateQueue({
      Hook: `Day ${dayNumber}: ${content.hook}`,
      Caption: content.caption,
      "Image URL": blob.url,
      Status: "Ready",
      Type: "Feed",
      "First Comment": firstComment,
      "Story Text": content.storyText || content.hook,
      "Story Image URL": storyBlob.url,
      "Source URL": winner.fields["Post URL"] || "",
      "Day Number": dayNumber,
      "Bonus Prompt": content.bonusPrompt || "",
    });
    await airtableUpdate("Winners", winner.id, { Status: "Used" });

    return Response.json({ ok: true, queued: content.hook, type: "Feed", dayNumber });
  } catch (err) {
    console.error("Generate cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
