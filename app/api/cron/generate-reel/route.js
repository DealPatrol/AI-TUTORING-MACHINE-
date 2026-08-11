// DAILY REEL — script + cover + Veo video (+ model fallback) + Story → Queue
// If all Veo models fail, ships a save-magnet carousel the same day so growth never skips.

import { put } from "@vercel/blob";
import {
  checkCronAuth,
  airtableCreateQueue,
  rewriteCopy,
  parseClaudeJson,
  generateGeminiImage,
  generateVeoReelWithFallback,
  getTipDayNumber,
  claimNextWinner,
  markWinnerUsed,
  releaseWinner,
  tryRefillWinners,
} from "@/lib/helpers";
import { reelGrowthPrompt, buildFirstComment, storyOverlayPrompt, pickEvergreenTopic } from "@/lib/growth";

// 300s is the safe serverless ceiling. Veo generation is internally capped by
// an overall time budget (see generateVeoReelWithFallback) so all model
// attempts + Claude + images + uploads reliably finish within this window.
export const maxDuration = 300;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let winner = null;
  try {
    const dayNumber = await getTipDayNumber();

    // STARVATION GUARD: never skip a day. Try a winner; if the table is empty,
    // attempt a best-effort refill, then fall back to an evergreen topic so a
    // Reel is always produced.
    winner = await claimNextWinner();
    if (!winner) {
      console.warn("[v0] Winners table empty — attempting best-effort refill via research");
      await tryRefillWinners();
      winner = await claimNextWinner();
    }
    const isEvergreen = !winner;
    const sourceCaption = winner ? winner.fields.Caption || "" : pickEvergreenTopic(dayNumber);
    if (isEvergreen) {
      console.warn(`[v0] No winners available — generating evergreen Reel: "${sourceCaption}"`);
    }

    const raw = await rewriteCopy(reelGrowthPrompt(sourceCaption, dayNumber));
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

    const visualScenes = Array.isArray(content.visualScenes) && content.visualScenes.length > 0
      ? content.visualScenes.slice(0, 3).join("\n")
      : content.videoPrompt ||
        `Use wide physical B-roll to symbolize the problem, a moving environment or self-moving prop, then a waist-up human reaction. Keep hands out of frame and show no screen or interface.`;
    const rawVoiceover = String(content.voiceover || content.hook || "")
      .replace(/\bfollow for daily AI tips\b[.!?]*\s*$/i, "")
      .replace(/[.!?]+$/g, "")
      .trim();
    const voiceoverCore = (rawVoiceover || String(content.hook || "").trim())
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 9)
      .join(" ");
    const voiceover = `${voiceoverCore}. Follow for daily AI tips.`;
    const videoPrompt = `Create an ACTUAL live-action vertical 9:16 social video, 8 seconds, not a graphic.
Topic: "${content.hook}"

Three distinct moving shots with fast, natural cuts:
${visualScenes}

Visual requirements:
- Frame people only in medium, waist-up, or wide shots with both hands outside the frame
- Use rooms, environments, camera movement, silhouettes, reflections, or self-moving physical props appropriate to the topic
- Continuous subject movement and noticeable camera movement in every shot
- Cinematic natural lighting, shallow depth of field, crisp realistic detail
- Translate digital concepts into physical visual metaphors and human actions
- If a device is unavoidable, show only its back or edge; its display must be fully out of frame, powered off, heavily defocused, or hidden by glare
- Keep all backgrounds and reflective surfaces free of legible text
- Energetic pacing designed for an Instagram Reel

Strictly forbidden:
- No static poster, title card, slideshow, presentation, or single still image
- No cream-background graphic, flat illustration, robot mascot, or text-only animation
- Absolutely no readable or recognizable phone, laptop, tablet, television, or monitor display
- No app interface, website, browser, ChatGPT window, code editor, terminal, generated UI, keyboard close-up with a visible screen, or over-the-shoulder screen shot
- No legible words, letters, numbers, captions, labels, logos, signs, or watermarks anywhere in the generated video
- Never invent fake screen content; replace all screen-based demonstrations with physical B-roll
- No close-up or focal shot of hands, fingers, feet, teeth, or other anatomy prone to distortion
- Keep every hand and finger completely outside the frame; nobody may hold, tear, press, type on, point at, or present an object
- No morphing anatomy, extra fingers, fused limbs, body-object blending, or changing object shapes

Native energetic teacher voiceover, spoken completely with no cutoff: "${voiceover}"
Subtle upbeat music and realistic ambient sound. End on a satisfying moving result, not an end card.`;

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
        "Source URL": winner?.fields?.["Post URL"] || "",
        "Day Number": dayNumber,
        "Bonus Prompt": content.bonusPrompt || "",
        "Fallback Used": true,
        "Last Error": `Veo failed: ${veoErr.message}`.slice(0, 1000),
      });
      if (winner && !winner._claimedAsUsed) await markWinnerUsed(winner.id);

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
      "Source URL": winner?.fields?.["Post URL"] || "",
      "Day Number": dayNumber,
      "Bonus Prompt": content.bonusPrompt || "",
      "Fallback Used": false,
    });
    if (winner && !winner._claimedAsUsed) await markWinnerUsed(winner.id);

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
