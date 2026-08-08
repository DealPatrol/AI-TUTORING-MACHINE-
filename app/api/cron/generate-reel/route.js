// DAILY REEL — script + cover + Veo video (+ model fallback) + Story → Queue
// If all Veo models fail, ships a save-magnet carousel the same day so growth never skips.

import { put } from "@vercel/blob";
import {
  checkCronAuth,
  airtableCreateQueue,
  claudeRewrite,
  parseClaudeJson,
  generateGeminiImage,
  generateVeoReelWithFallback,
  getTipDayNumber,
  claimNextWinner,
  markWinnerUsed,
  releaseWinner,
} from "@/lib/helpers";
import { reelGrowthPrompt, buildFirstComment, storyOverlayPrompt } from "@/lib/growth";

export const maxDuration = 300;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let winner = null;
  try {
    winner = await claimNextWinner();
    if (!winner) {
      return Response.json({
        ok: true,
        skipped: true,
        message: "No new winners left for reels",
      });
    }
    const dayNumber = await getTipDayNumber();

    const raw = await claudeRewrite(reelGrowthPrompt(winner.fields.Caption || "", dayNumber));
    const content = parseClaudeJson(raw);
    const stamp = Date.now();

    const cover = await generateGeminiImage(
      `Create a vertical Instagram Reel cover, 9:16 portrait.
Style: soft cream background, bold dark charcoal sans-serif headline,
small friendly robot mascot, flat modern design, no photo, high contrast.
Big headline text (render exactly): "${content.coverText || content.hook}"
Tiny label at top: "Day ${dayNumber}"
Tiny label at bottom: "Follow for daily AI tips"`
    );
    const coverBlob = await put(`reels/cover-${stamp}.png`, cover.buffer, {
      access: "public",
      contentType: "image/png",
    });

    const story = await generateGeminiImage(
      storyOverlayPrompt(content.hook, content.storyText || content.coverText, dayNumber)
    );
    const storyBlob = await put(`stories/reel-${stamp}.png`, story.buffer, {
      access: "public",
      contentType: "image/png",
    });

    const videoPrompt =
      content.videoPrompt ||
      `Vertical 9:16 Instagram Reel, 8 seconds. Soft cream background, bold dark charcoal kinetic typography.
On-screen text in order: "Day ${dayNumber}", "${content.hook}", then ${(content.beats || []).map((b) => `"${b}"`).join(", ")}, then "Follow for daily AI tips".
Small friendly robot mascot reacts in the corner. Flat modern motion graphics, no photoreal people.
Clear energetic teacher voiceover: "${content.voiceover || content.hook}". Subtle upbeat music. Large readable mobile text.`;

    const firstComment =
      content.firstComment ||
      buildFirstComment({
        cta: `Day ${dayNumber} — Comment TIP for a bonus prompt. Follow for tomorrow's Reel.`,
      });

    let videoUrl = null;
    let veoModel = null;

    try {
      const veo = await generateVeoReelWithFallback(videoPrompt, { aspectRatio: "9:16" });
      const videoBlob = await put(`reels/video-${stamp}.mp4`, veo.buffer, {
        access: "public",
        contentType: "video/mp4",
      });
      videoUrl = videoBlob.url;
      veoModel = veo.model;
    } catch (veoErr) {
      console.error("Veo failed — queueing carousel fallback:", veoErr.message);

      const beats = [
        content.hook,
        ...(Array.isArray(content.beats) ? content.beats : []),
        "Follow for daily AI tips",
      ].slice(0, 6);
      const slideUrls = [coverBlob.url];
      for (let i = 0; i < beats.length; i++) {
        const { buffer } = await generateGeminiImage(
          `Create a clean Instagram carousel slide, square 1:1.
Style: soft cream background, bold dark charcoal sans-serif, small robot mascot, flat design.
Day ${dayNumber}. Slide ${i + 1}.
Headline (render exactly): "${String(beats[i]).slice(0, 80)}"`
        );
        const blob = await put(`reels/fallback-${stamp}-${i + 1}.png`, buffer, {
          access: "public",
          contentType: "image/png",
        });
        slideUrls.push(blob.url);
      }

      await airtableCreateQueue({
        Hook: `Day ${dayNumber}: ${content.hook}`,
        Caption: content.caption,
        "Image URL": slideUrls[0],
        "Slide URLs": JSON.stringify(slideUrls),
        "Cover URL": coverBlob.url,
        Status: "Ready",
        Type: "Carousel",
        "First Comment": firstComment,
        "Story Text": content.storyText || content.coverText || content.hook,
        "Story Image URL": storyBlob.url,
        "Source URL": winner.fields["Post URL"] || "",
        "Day Number": dayNumber,
        "Bonus Prompt": content.bonusPrompt || "",
        "Fallback Used": true,
        "Last Error": `Veo failed: ${veoErr.message}`.slice(0, 1000),
      });
      if (!winner._claimedAsUsed) await markWinnerUsed(winner.id);

      return Response.json({
        ok: true,
        queued: content.hook,
        type: "Carousel",
        fallback: true,
        dayNumber,
        reason: veoErr.message,
      });
    }

    await airtableCreateQueue({
      Hook: `Day ${dayNumber}: ${content.hook}`,
      Caption: content.caption,
      "Image URL": coverBlob.url,
      "Cover URL": coverBlob.url,
      "Video URL": videoUrl,
      Status: "Ready",
      Type: "Reel",
      "First Comment": firstComment,
      "Story Text": content.storyText || content.coverText || content.hook,
      "Story Image URL": storyBlob.url,
      "Source URL": winner.fields["Post URL"] || "",
      "Day Number": dayNumber,
      "Bonus Prompt": content.bonusPrompt || "",
      "Fallback Used": false,
    });
    if (!winner._claimedAsUsed) await markWinnerUsed(winner.id);

    return Response.json({
      ok: true,
      queued: content.hook,
      type: "Reel",
      videoUrl,
      veoModel,
      dayNumber,
    });
  } catch (err) {
    if (winner?.id) await releaseWinner(winner.id);
    console.error("Generate reel cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
