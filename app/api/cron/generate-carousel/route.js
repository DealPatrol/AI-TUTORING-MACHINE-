// CAROUSEL — save-magnet multi-slide posts (stronger than single images for growth).

import { put } from "@vercel/blob";
import {
  checkCronAuth,
  airtableCreateQueue,
  rewriteCopy,
  parseClaudeJson,
  generateGeminiImage,
  getTipDayNumber,
  claimNextWinner,
  markWinnerUsed,
  releaseWinner,
} from "@/lib/helpers";
import { carouselGrowthPrompt, buildFirstComment, storyOverlayPrompt } from "@/lib/growth";

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
        message: "No new winners left for carousels",
      });
    }
    const dayNumber = await getTipDayNumber();

    const raw = await rewriteCopy(carouselGrowthPrompt(winner.fields.Caption || "", dayNumber));
    const content = parseClaudeJson(raw);
    const slides = Array.isArray(content.slides) ? content.slides.slice(0, 7) : [];
    if (slides.length < 3) throw new Error("Carousel needs at least 3 slides");

    const stamp = Date.now();
    const slideUrls = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const { buffer } = await generateGeminiImage(
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
      const blob = await put(`carousels/${stamp}-${i + 1}.png`, buffer, {
        access: "public",
        contentType: "image/png",
      });
      slideUrls.push(blob.url);
    }

    const story = await generateGeminiImage(
      storyOverlayPrompt(content.hook, content.storyText, dayNumber)
    );
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
      "Source URL": winner.fields["Post URL"] || "",
      "Day Number": dayNumber,
      "Bonus Prompt": content.bonusPrompt || "",
    });
    if (!winner._claimedAsUsed) await markWinnerUsed(winner.id);

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
    return Response.json({ error: err.message }, { status: 500 });
  }
}
