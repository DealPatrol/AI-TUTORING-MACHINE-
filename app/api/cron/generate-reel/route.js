// DAILY REEL — script + cover + Veo video + Story creative → Queue (Type=Reel)
// Reels are the fastest organic growth format on Instagram.

import { put } from "@vercel/blob";
import {
  checkCronAuth,
  airtableList,
  airtableCreateQueue,
  airtableUpdate,
  claudeRewrite,
  parseClaudeJson,
  generateGeminiImage,
  generateVeoReel,
} from "@/lib/helpers";
import { reelGrowthPrompt, buildFirstComment, storyOverlayPrompt } from "@/lib/growth";

export const maxDuration = 300;

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
      return Response.json({ ok: true, message: "No new winners left for reels" });
    }
    const winner = winners[0];

    const raw = await claudeRewrite(reelGrowthPrompt(winner.fields.Caption || ""));
    const content = parseClaudeJson(raw);

    const stamp = Date.now();

    // Cover frame for the Reels tab (and feed preview)
    const cover = await generateGeminiImage(
      `Create a vertical Instagram Reel cover, 9:16 portrait.
Style: soft cream background, bold dark charcoal sans-serif headline,
small friendly robot mascot, flat modern design, no photo, high contrast.
Big headline text (render exactly): "${content.coverText || content.hook}"
Tiny label at bottom: "Follow for daily AI tips"`
    );
    const coverBlob = await put(`reels/cover-${stamp}.png`, cover.buffer, {
      access: "public",
      contentType: "image/png",
    });

    const story = await generateGeminiImage(
      storyOverlayPrompt(content.hook, content.storyText || content.coverText)
    );
    const storyBlob = await put(`stories/reel-${stamp}.png`, story.buffer, {
      access: "public",
      contentType: "image/png",
    });

    const videoPrompt =
      content.videoPrompt ||
      `Vertical 9:16 Instagram Reel, 8 seconds. Soft cream background, bold dark charcoal kinetic typography.
On-screen text in order: "${content.hook}", then ${(content.beats || []).map((b) => `"${b}"`).join(", ")}, then "Follow for daily AI tips".
Small friendly robot mascot reacts in the corner. Flat modern motion graphics, no photoreal people.
Clear energetic teacher voiceover: "${content.voiceover || content.hook}". Subtle upbeat music. Large readable mobile text.`;

    const videoBuffer = await generateVeoReel(videoPrompt, {
      aspectRatio: "9:16",
      model: process.env.VEO_MODEL || "veo-3.1-fast-generate-preview",
    });

    const videoBlob = await put(`reels/video-${stamp}.mp4`, videoBuffer, {
      access: "public",
      contentType: "video/mp4",
    });

    const firstComment =
      content.firstComment ||
      buildFirstComment({ cta: "Want tomorrow's Reel? Follow — I post one AI tip every day." });

    await airtableCreateQueue({
      Hook: content.hook,
      Caption: content.caption,
      "Image URL": coverBlob.url,
      "Cover URL": coverBlob.url,
      "Video URL": videoBlob.url,
      Status: "Ready",
      Type: "Reel",
      "First Comment": firstComment,
      "Story Text": content.storyText || content.coverText || content.hook,
      "Story Image URL": storyBlob.url,
      "Source URL": winner.fields["Post URL"] || "",
    });
    await airtableUpdate("Winners", winner.id, { Status: "Used" });

    return Response.json({
      ok: true,
      queued: content.hook,
      type: "Reel",
      videoUrl: videoBlob.url,
    });
  } catch (err) {
    console.error("Generate reel cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
