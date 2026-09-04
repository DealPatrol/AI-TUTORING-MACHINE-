// CAROUSEL — save-magnet multi-slide posts (stronger than single images for growth).

import { put } from "@vercel/blob";
import {
  checkCronAuth,
  airtableCreateQueue,
  rewriteJson,
  generateGeminiImageWithFallback,
  getTipDayNumber,
  claimNextWinner,
  markWinnerUsed,
  releaseWinner,
  tryRefillWinners,
} from "@/lib/helpers";
import {
  carouselGrowthPrompt,
  buildEmergencyGrowthContent,
  buildFirstComment,
  storyOverlayPrompt,
  pickEvergreenTopic,
} from "@/lib/growth";
import { recordPipelineStatus } from "@/lib/pipeline-status";

export const maxDuration = 300;

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
    const source = winner ? winner.fields.Caption || "" : pickEvergreenTopic(dayNumber);

    let content;
    let copyError = null;
    try {
      content = await rewriteJson(carouselGrowthPrompt(source, dayNumber), {
        requiredKeys: ["hook", "caption", "slides"],
      });
    } catch (error) {
      copyError = `copy: ${error.message}`;
      console.error("AI copy unavailable — using emergency carousel copy:", error.message);
      content = buildEmergencyGrowthContent("carousel");
    }
    const slides = Array.isArray(content.slides) ? content.slides.slice(0, 7) : [];
    if (slides.length < 3) throw new Error("Carousel needs at least 3 slides");

    const stamp = Date.now();
    const slideUrls = [];
    const fallbackErrors = copyError ? [copyError] : [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const image = await generateGeminiImageWithFallback(
        `Create a clean Instagram carousel slide, square 1:1.
Style: original flat graphic design, huge bold sans-serif type, black and white
with one warm red accent, strong hierarchy, high contrast, and generous spacing.
Use simple original geometric accents only. No photos, people, celebrity or
influencer likenesses, trademarked logos, brand mashups, or copied social
account styling.
Tiny metadata label: "Day ${dayNumber}". Slide ${i + 1} of ${slides.length}.
Headline (render exactly): "${slide.headline || ""}"
Body text (render exactly): "${slide.body || ""}"
${i === 0 ? 'Top-left small label: "SWIPE →"' : ""}
${i === slides.length - 1 ? 'Bottom label: "Save this prompt · Comment HOW"' : ""}`
      );
      if (image.error) fallbackErrors.push(`slide ${i + 1}: ${image.error}`);
      const blob = await put(`carousels/${stamp}-${i + 1}.png`, image.buffer, {
        access: "public",
        contentType: "image/png",
      });
      slideUrls.push(blob.url);
    }

    const story = await generateGeminiImageWithFallback(
      storyOverlayPrompt(content.hook, content.storyText, dayNumber),
      { width: 1080, height: 1920 }
    );
    if (story.error) fallbackErrors.push(`story: ${story.error}`);
    const storyBlob = await put(`stories/carousel-${stamp}.png`, story.buffer, {
      access: "public",
      contentType: "image/png",
    });

    const firstComment =
      content.firstComment ||
      buildFirstComment({
        cta: "Save this prompt. Comment HOW for the reusable template and filled-in example.",
      });

    await airtableCreateQueue({
      Hook: content.hook,
      Caption: content.caption,
      "Image URL": slideUrls[0],
      "Slide URLs": JSON.stringify(slideUrls),
      Status: "Ready",
      Type: "Carousel",
      "First Comment": firstComment,
      "Story Text": content.storyText || content.hook,
      "Story Image URL": storyBlob.url,
      "Source URL": winner?.fields?.["Post URL"] || "",
      "Day Number": dayNumber,
      "Bonus Prompt": content.bonusPrompt || "",
      "Fallback Used": fallbackErrors.length > 0,
      "Last Error": fallbackErrors.join(" | ").slice(0, 1000) || undefined,
    });
    if (winner && !winner._claimedAsUsed) await markWinnerUsed(winner.id);

    await recordPipelineStatus("generate-carousel", {
      outcome: "queued",
      details: {
        hook: content.hook,
        type: "Carousel",
        fallbackUsed: fallbackErrors.length > 0,
      },
    });
    return Response.json({
      ok: true,
      queued: content.hook,
      type: "Carousel",
      slides: slideUrls.length,
      dayNumber,
    });
  } catch (err) {
    if (winner?.id) await releaseWinner(winner.id);
    console.error("Generate carousel cron error:", err);
    await recordPipelineStatus("generate-carousel", {
      outcome: "failed",
      error: err.message,
    });
    return Response.json({ error: err.message }, { status: 500 });
  }
}
