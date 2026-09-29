// RECAP — Sunday save-magnet carousel from this week's posted tips.

import { put } from "@vercel/blob";
import {
  checkCronAuth,
  airtableCreateQueue,
  rewriteJson,
  getTipDayNumber,
  listPostedQueue,
} from "@/lib/helpers";
import {
  weeklyRecapPrompt,
  buildEmergencyGrowthContent,
  buildFirstComment,
} from "@/lib/growth";
import { renderCaptionSlide } from "@/lib/slide-render";
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
    let content;
    let copyError = null;
    try {
      content = await rewriteJson(weeklyRecapPrompt(hooks, dayNumber), {
        requiredKeys: ["hook", "caption", "slides"],
      });
    } catch (error) {
      copyError = `copy: ${error.message}`;
      console.error("AI copy unavailable — using emergency recap copy:", error.message);
      content = buildEmergencyGrowthContent("carousel");
    }
    const slides = Array.isArray(content.slides) ? content.slides.slice(0, 7) : [];
    if (slides.length < 3) throw new Error("Recap carousel needs at least 3 slides");

    const stamp = Date.now();
    const slideUrls = [];
    const fallbackErrors = copyError ? [copyError] : [];
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const image = await renderCaptionSlide({
        headline: slide.headline || content.hook,
        body: slide.body || "",
        label: i === 0 ? `SWIPE  ·  ${i + 1}/${slides.length}` : `${i + 1} / ${slides.length}`,
        footer: i === slides.length - 1 ? "Save these prompts · Comment HOW" : "Swipe for the next tip",
      });
      const blob = await put(`carousels/recap-${stamp}-${i + 1}.jpg`, image, {
        access: "public",
        contentType: "image/jpeg",
      });
      slideUrls.push(blob.url);
    }

    const story = await renderCaptionSlide({
      headline: content.storyText || content.hook,
      body: "Open the post · Comment HOW",
      label: dayNumber ? `DAY ${dayNumber}` : "THIS WEEK",
      footer: "Follow @unlocking__ai",
      width: 1080,
      height: 1920,
    });
    const storyBlob = await put(`stories/recap-${stamp}.jpg`, story, {
      access: "public",
      contentType: "image/jpeg",
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
      "Fallback Used": fallbackErrors.length > 0,
      "Last Error": fallbackErrors.join(" | ").slice(0, 1000) || undefined,
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
