// DAILY REEL — script + cover + Veo video (+ model fallback) + Story → Queue
// If all Veo models fail, ships a save-magnet carousel the same day so growth never skips.

import { put } from "@vercel/blob";
import {
  checkCronAuth,
  airtableCreateQueue,
  rewriteJson,
  generateGeminiImageWithFallback,
  generateVeoReelWithFallback,
  stitchVideoBuffers,
  getTipDayNumber,
  claimNextWinner,
  markWinnerUsed,
  releaseWinner,
  tryRefillWinners,
} from "@/lib/helpers";
import {
  reelGrowthPrompt,
  buildEmergencyGrowthContent,
  buildFirstComment,
  storyOverlayPrompt,
  pickEvergreenTopic,
} from "@/lib/growth";
import { recordPipelineStatus } from "@/lib/pipeline-status";

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

    let content;
    let copyError = null;
    try {
      content = await rewriteJson(reelGrowthPrompt(sourceCaption, dayNumber), {
        requiredKeys: ["hook", "caption", "beats", "voiceoverSegments"],
      });
    } catch (error) {
      copyError = `copy: ${error.message}`;
      console.error("AI copy unavailable — using emergency Reel copy:", error.message);
      content = buildEmergencyGrowthContent("reel");
    }
    const stamp = Date.now();
    const fallbackErrors = copyError ? [copyError] : [];

    const cover = await generateGeminiImageWithFallback(
      `Create a vertical Instagram Reel cover, 9:16 portrait.
Style: original flat graphic design, huge bold sans-serif headline, black and
white with one warm red accent, strong hierarchy, generous spacing, high
contrast, readable on mobile in one second. No photo, celebrity or influencer
likeness, trademarked logo, brand mashup, or copied social account styling.
Big headline text (render exactly): "${content.coverText || content.hook}"
Tiny label at top: "Day ${dayNumber}"
Tiny label at bottom: "Copy it · save it · use it"`,
      { width: 1080, height: 1350 }
    );
    if (cover.error) fallbackErrors.push(`cover: ${cover.error}`);
    const coverBlob = await put(`reels/cover-${stamp}.png`, cover.buffer, {
      access: "public",
      contentType: "image/png",
    });

    const story = await generateGeminiImageWithFallback(
      storyOverlayPrompt(content.hook, content.storyText || content.coverText, dayNumber),
      { width: 1080, height: 1920 }
    );
    if (story.error) fallbackErrors.push(`story: ${story.error}`);
    const storyBlob = await put(`stories/reel-${stamp}.png`, story.buffer, {
      access: "public",
      contentType: "image/png",
    });

    const scenes = Array.isArray(content.visualScenes) ? content.visualScenes.filter(Boolean) : [];
    const fallbackScenes = [
      "A moving wide shot that physically symbolizes the problem",
      "A cinematic environment changing as the AI idea is introduced",
      "A discovery moment using light, camera movement, or a self-moving prop",
      "A new location showing the useful real-world payoff",
      "A stronger result or transformation using environment and camera motion",
      "A waist-up human reaction with hands outside the frame",
    ];
    while (scenes.length < 6) scenes.push(fallbackScenes[scenes.length]);

    const normalizeVoiceover = (value, maxWords) =>
      String(value || "")
        .replace(/[.!?]+$/g, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, maxWords)
        .join(" ");
    const generatedVoiceovers = Array.isArray(content.voiceoverSegments)
      ? content.voiceoverSegments
      : [content.voiceover || content.hook, ""];
    const voiceoverOne =
      normalizeVoiceover(generatedVoiceovers[0] || content.hook, 15) || String(content.hook);
    const payoff = normalizeVoiceover(
      String(generatedVoiceovers[1] || "").replace(/\bcomment\s+how\b[\s\S]*$/i, ""),
      5
    );
    const voiceoverTwo = `${payoff ? `${payoff}. ` : ""}Comment HOW and I'll DM you the AI playbook.`;

    const sharedVisualRules = `Visual requirements:
- Frame people only in medium, waist-up, or wide shots with both hands outside the frame
- Use rooms, environments, camera movement, silhouettes, reflections, or self-moving physical props appropriate to the topic
- Continuous subject movement and noticeable camera movement in every shot
- Cinematic natural lighting, shallow depth of field, crisp realistic detail
- Translate digital concepts into physical visual metaphors and human actions
- Use original anonymous casting; never depict or resemble a celebrity, public
  figure, influencer, mascot, or trademarked character
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
- No morphing anatomy, extra fingers, fused limbs, body-object blending, or changing object shapes`;

    const buildClipPrompt = ({ clipNumber, clipScenes, voiceover, ending }) =>
      `Create clip ${clipNumber} of a continuous ACTUAL live-action vertical 9:16 social video.
This clip is exactly 8 seconds and must feel like part of a polished 16-second Instagram Reel, not a graphic.
Topic: "${content.hook}"

Three distinct moving shots with fast, natural cuts:
${clipScenes.join("\n")}

${sharedVisualRules}

Continuity: consistent cinematic color grade and creator-Reel style across both clips.
Native energetic teacher voiceover, spoken completely with no cutoff: "${voiceover}"
Subtle upbeat music and realistic ambient sound. ${ending}`;

    const clipPrompts = [
      buildClipPrompt({
        clipNumber: 1,
        clipScenes: scenes.slice(0, 3),
        voiceover: voiceoverOne,
        ending: "End mid-action so clip 2 can continue naturally. Do not include the comment CTA yet.",
      }),
      buildClipPrompt({
        clipNumber: 2,
        clipScenes: scenes.slice(3, 6),
        voiceover: voiceoverTwo,
        ending:
          "Deliver the complete comment CTA clearly, then end on a satisfying moving human reaction—not a title card.",
      }),
    ];

    const firstComment =
      content.firstComment ||
      buildFirstComment({
        cta: "Comment HOW and I'll DM you the expanded prompt with a filled-in example.",
      });

    let videoUrl = null;
    let veoModel = null;

    try {
      // Generate both 8-second segments concurrently, reserving enough of the
      // 300-second ceiling for stitching, uploading, and queueing the result.
      const clips = await Promise.all(
        clipPrompts.map((prompt) =>
          generateVeoReelWithFallback(prompt, {
            aspectRatio: "9:16",
            overallBudgetMs: 150000,
          })
        )
      );
      const stitchedVideo = await stitchVideoBuffers(clips.map((clip) => clip.buffer));
      const videoBlob = await put(`reels/video-${stamp}.mp4`, stitchedVideo, {
        access: "public",
        contentType: "video/mp4",
      });
      videoUrl = videoBlob.url;
      veoModel = [...new Set(clips.map((clip) => clip.model))].join(",");
    } catch (veoErr) {
      console.error("Veo failed — queueing carousel fallback:", veoErr.message);

      const beats = [
        content.hook,
        ...(Array.isArray(content.beats) ? content.beats : []),
      ].slice(0, 6);
      const slideUrls = [coverBlob.url];
      for (let i = 0; i < beats.length; i++) {
        const image = await generateGeminiImageWithFallback(
          `Create a clean Instagram carousel slide, square 1:1.
Style: original flat graphic design, huge bold sans-serif type, black and white
with one warm red accent, strong hierarchy, high contrast, and generous spacing.
No photos, people, celebrity or influencer likenesses, trademarked logos,
brand mashups, or copied social account styling.
Tiny metadata label: "Day ${dayNumber}". Slide ${i + 1}.
Headline (render exactly): "${String(beats[i]).slice(0, 80)}"`
        );
        if (image.error) fallbackErrors.push(`fallback slide ${i + 1}: ${image.error}`);
        const blob = await put(`reels/fallback-${stamp}-${i + 1}.png`, image.buffer, {
          access: "public",
          contentType: "image/png",
        });
        slideUrls.push(blob.url);
      }

      await airtableCreateQueue({
        Hook: content.hook,
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
        "Last Error": [`Veo failed: ${veoErr.message}`, ...fallbackErrors].join(" | ").slice(0, 1000),
      });
      if (winner && !winner._claimedAsUsed) await markWinnerUsed(winner.id);

      await recordPipelineStatus("generate-reel", {
        outcome: "queued-fallback",
        error: veoErr.message,
        details: { hook: content.hook, type: "Carousel", fallbackUsed: true },
      });
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
      Hook: content.hook,
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
      "Fallback Used": fallbackErrors.length > 0,
      "Last Error": fallbackErrors.join(" | ").slice(0, 1000) || undefined,
    });
    if (winner && !winner._claimedAsUsed) await markWinnerUsed(winner.id);

    await recordPipelineStatus("generate-reel", {
      outcome: "queued",
      details: {
        hook: content.hook,
        type: "Reel",
        fallbackUsed: fallbackErrors.length > 0,
        veoModel,
      },
    });
    return Response.json({
      ok: true,
      queued: content.hook,
      type: "Reel",
      videoUrl,
      veoModel,
      durationSeconds: 16,
      dayNumber,
    });
  } catch (err) {
    if (winner?.id) await releaseWinner(winner.id);
    console.error("Generate reel cron error:", err);
    await recordPipelineStatus("generate-reel", { outcome: "failed", error: err.message });
    return Response.json({ error: err.message }, { status: 500 });
  }
}
