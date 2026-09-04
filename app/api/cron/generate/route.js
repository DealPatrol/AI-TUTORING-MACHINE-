// Daily generator — creates at least ONE Ready feed graphic.
// Uses Gemini for copy + image (no Claude required). Retries on 429.
// Optional Veo video attached when available. Never requires Sequence/Type fields.

import { put } from "@vercel/blob";
import {
  checkCronAuth,
  airtableCreateQueue,
  generateGeminiImageWithFallback,
  getTipDayNumber,
  claimNextWinner,
  markWinnerUsed,
  releaseWinner,
  rewriteJson,
  generateVeoReelWithFallback,
  tryRefillWinners,
} from "@/lib/helpers";
import {
  feedGrowthPrompt,
  buildEmergencyGrowthContent,
  buildFirstComment,
  storyOverlayPrompt,
  pickEvergreenTopic,
} from "@/lib/growth";
import { recordPipelineStatus } from "@/lib/pipeline-status";

export const maxDuration = 180;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let winner = null;
  try {
    winner = await claimNextWinner();
    if (!winner) {
      await tryRefillWinners();
      winner = await claimNextWinner();
    }

    const dayNumber = await getTipDayNumber();
    const source = winner
      ? (winner.fields.Caption || "").slice(0, 1500)
      : pickEvergreenTopic(dayNumber);

    let copyError = null;
    let content;
    try {
      content = await rewriteJson(feedGrowthPrompt(source, dayNumber), {
        requiredKeys: ["hook", "caption"],
      });
    } catch (error) {
      copyError = `copy: ${error.message}`;
      console.error("AI copy unavailable — using emergency feed copy:", error.message);
      content = buildEmergencyGrowthContent("feed");
    }

    const image = await generateGeminiImageWithFallback(
      `Create a clean modern Instagram graphic, square 1:1.
Soft cream background, bold dark charcoal headline, small friendly robot mascot,
flat design, generous whitespace.
Headline (render exactly): "${content.hook}"
Subtext (render exactly): "${content.subtext || ""}"
Tiny label: "Day ${dayNumber}"`
    );

    const stamp = Date.now();
    const blob = await put(`posts/${stamp}.png`, image.buffer, {
      access: "public",
      contentType: "image/png",
    });

    let storyUrl = null;
    const story = await generateGeminiImageWithFallback(
      storyOverlayPrompt(content.hook, content.storyText, dayNumber),
      { width: 1080, height: 1920 }
    );
    const storyBlob = await put(`stories/feed-${stamp}.png`, story.buffer, {
      access: "public",
      contentType: "image/png",
    });
    storyUrl = storyBlob.url;

    // Optional Veo reel — never block the feed post if this fails
    let videoUrl = null;
    try {
      const video = await generateVeoReelWithFallback(
        `Create an actual live-action vertical 9:16 Instagram video, 8 seconds, about "${content.hook}".
Use three distinct cinematic physical B-roll shots: symbolize the problem with a moving environment, use a self-moving prop or camera move, then show a waist-up human reacting to the useful real-world result.
Frame people only in medium or wide shots with both hands outside the frame. Use environments, silhouettes, reflections and self-moving objects; natural lighting, shallow depth of field, continuous subject and camera motion, quick natural cuts.
Translate every digital concept into a physical visual metaphor. If a device is unavoidable, show only its back or edge with its display fully out of frame, powered off, or heavily defocused.
Absolutely no readable phone, laptop, tablet, television, or monitor display. No app interface, website, browser, ChatGPT window, code, terminal, generated UI, over-the-shoulder screen shot, legible words, letters, numbers, captions, labels, signs, logos, or watermarks.
No close-up or focal shot of hands, fingers, feet, teeth, or other anatomy prone to distortion. Keep all hands and fingers completely outside the frame; nobody may hold, tear, press, type on, point at, or present an object. No morphing anatomy, extra fingers, fused limbs, or body-object blending.
No static graphic, poster, slideshow, cream background, flat illustration, robot mascot, or text-only animation.
One complete energetic teacher voiceover sentence of no more than 15 words, subtle upbeat music, realistic ambient sound.`,
        {
          aspectRatio: "9:16",
          overallBudgetMs: 95000,
        }
      );
      const videoBlob = await put(`reels/${stamp}.mp4`, video.buffer, {
        access: "public",
        contentType: "video/mp4",
      });
      videoUrl = videoBlob.url;
    } catch (err) {
      console.warn("Optional Veo skipped:", err.message);
    }

    await airtableCreateQueue({
      Hook: content.hook,
      Caption: content.caption,
      "Image URL": blob.url,
      Status: "Ready",
      Type: videoUrl ? "Reel" : "Feed",
      "Video URL": videoUrl || undefined,
      "Cover URL": videoUrl ? blob.url : undefined,
      "First Comment": content.firstComment || buildFirstComment(),
      "Story Text": content.storyText || content.hook,
      "Story Image URL": storyUrl || undefined,
      "Source URL": winner?.fields?.["Post URL"] || "",
      "Day Number": dayNumber,
      "Bonus Prompt": content.bonusPrompt || "",
      "Fallback Used": Boolean(copyError || image.fallback || story.fallback),
      "Last Error":
        [copyError, image.error, story.error].filter(Boolean).join(" | ").slice(0, 1000) ||
        undefined,
      Sequence: 1,
    });

    if (winner && !winner._claimedAsUsed) await markWinnerUsed(winner.id);

    await recordPipelineStatus("generate", {
      outcome: "queued",
      details: {
        hook: content.hook,
        type: videoUrl ? "Reel" : "Feed",
        fallbackUsed: Boolean(copyError || image.fallback || story.fallback),
      },
    });
    return Response.json({
      ok: true,
      queued: content.hook,
      type: videoUrl ? "Reel" : "Feed",
      dayNumber,
      videoUrl: videoUrl || null,
    });
  } catch (err) {
    if (winner?.id) await releaseWinner(winner.id);
    console.error("Generate cron error:", err);
    await recordPipelineStatus("generate", { outcome: "failed", error: err.message });
    return Response.json({ error: err.message }, { status: 500 });
  }
}
