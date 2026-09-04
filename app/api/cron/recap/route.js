// RECAP — Sunday save-magnet carousel from this week's posted tips.

import { put } from "@vercel/blob";
import {
  checkCronAuth,
  airtableCreateQueue,
  rewriteCopy,
  parseClaudeJson,
  generateGeminiImage,
  getTipDayNumber,
  listPostedQueue,
} from "@/lib/helpers";
import { weeklyRecapPrompt, buildFirstComment, storyOverlayPrompt } from "@/lib/growth";
import { recentPostedHooks } from "@/lib/growth-stats";

export const maxDuration = 300;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const posted = await listPostedQueue({ maxRecords: 40 });
    const hooks = recentPostedHooks(posted, { withinDays: 7 });
    if (hooks.length < 3) {
      return Response.json({
        ok: true,
        skipped: true,
        message: `Need 3 posted tips this week to recap (have ${hooks.length})`,
      });
    }

    const dayNumber = await getTipDayNumber();
    const content = parseClaudeJson(await rewriteCopy(weeklyRecapPrompt(hooks, dayNumber)));
    const slides = Array.isArray(content.slides) ? content.slides.slice(0, 7) : [];
    if (slides.length < 3) throw new Error("Recap carousel needs at least 3 slides");

    const stamp = Date.now();
    const slideUrls = [];
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const { buffer } = await generateGeminiImage(
        `Create a clean Instagram carousel slide, square 1:1.
Style: soft cream background, bold dark charcoal sans-serif,
small friendly robot mascot accent, generous whitespace, flat design.
Tiny metadata label: "Day ${dayNumber}". Slide ${i + 1} of ${slides.length}.
Headline (render exactly): "${slide.headline || ""}"
Body text (render exactly): "${slide.body || ""}"
${i === 0 ? 'Top-left small label: "SWIPE →"' : ""}
${i === slides.length - 1 ? 'Bottom label: "Save these prompts · Comment HOW"' : ""}`
      );
      const blob = await put(`carousels/recap-${stamp}-${i + 1}.png`, buffer, {
        access: "public",
        contentType: "image/png",
      });
      slideUrls.push(blob.url);
    }

    const story = await generateGeminiImage(
      storyOverlayPrompt(content.hook, content.storyText, dayNumber)
    );
    const storyBlob = await put(`stories/recap-${stamp}.png`, story.buffer, {
      access: "public",
      contentType: "image/png",
    });

    await airtableCreateQueue({
      Hook: content.hook,
      Caption: content.caption,
      "Image URL": slideUrls[0],
      "Slide URLs": JSON.stringify(slideUrls),
      Status: "Ready",
      Type: "Carousel",
      "First Comment":
        content.firstComment ||
        buildFirstComment({
          cta: "Save this prompt pack. Comment HOW for the reusable templates.",
        }),
      "Story Text": content.storyText || content.hook,
      "Story Image URL": storyBlob.url,
      "Source URL": "recap:weekly",
      "Day Number": dayNumber,
      "Bonus Prompt": content.bonusPrompt || "",
    });

    return Response.json({
      ok: true,
      queued: content.hook,
      type: "Carousel",
      slides: slideUrls.length,
      tipsUsed: hooks.length,
      dayNumber,
    });
  } catch (err) {
    console.error("Recap cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
