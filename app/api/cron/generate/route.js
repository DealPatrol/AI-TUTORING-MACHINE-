// Daily generator — creates at least ONE Ready feed graphic.
// Uses Gemini for copy + image (no Claude required). Retries on 429.
// Optional Veo video attached when available. Never requires Sequence/Type fields.

import { put } from "@vercel/blob";
import {
  checkCronAuth,
  airtableCreateQueue,
  generateGeminiImage,
  getTipDayNumber,
  claimNextWinner,
  markWinnerUsed,
  releaseWinner,
  parseClaudeJson,
  rewriteCopy,
  getGeminiApiKey,
} from "@/lib/helpers";
import { buildFirstComment } from "@/lib/growth";

export const maxDuration = 180;

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
        message: "No new winners left — research cron will refill",
      });
    }

    const dayNumber = await getTipDayNumber();
    const source = (winner.fields.Caption || "").slice(0, 1500);

    const content = parseClaudeJson(
      await rewriteCopy(
        `You write for @unlocking__ai, a beginner-friendly AI tips Instagram.
Based on this winning idea (do NOT copy wording):
"""${source}"""

Write ONE original post. Respond with ONLY valid JSON:
{
  "hook": "max 8 word punchy headline",
  "subtext": "max 15 word supporting line",
  "caption": "100-150 word Instagram caption ending with a question and 5 hashtags",
  "firstComment": "short CTA + hashtags"
}`
      )
    );

    let imageBuffer;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const img = await generateGeminiImage(
          `Create a clean modern Instagram graphic, square 1:1.
Soft cream background, bold dark charcoal headline, small friendly robot mascot,
flat design, generous whitespace.
Headline (render exactly): "${content.hook}"
Subtext (render exactly): "${content.subtext || ""}"
Tiny label: "Day ${dayNumber}"`
        );
        imageBuffer = img.buffer;
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }

    const stamp = Date.now();
    const blob = await put(`posts/${stamp}.png`, imageBuffer, {
      access: "public",
      contentType: "image/png",
    });

    // Optional Veo reel — never block the feed post if this fails
    let videoUrl = null;
    try {
      const startRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": getGeminiApiKey(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            instances: [
              {
                prompt: `Create an actual live-action vertical 9:16 Instagram video, 8 seconds, about "${content.hook}".
Use three distinct cinematic shots: a creator encounters the problem, uses the AI tip with natural hand and device movement, then reacts to the useful real-world result.
Real people, hands, objects, natural lighting, shallow depth of field, continuous subject and camera motion, quick natural cuts, energetic creator B-roll.
No static graphic, poster, slideshow, cream background, flat illustration, robot mascot, text-only animation, logos, or watermarks.
Energetic teacher voiceover explaining the tip, subtle upbeat music, realistic ambient sound.`,
              },
            ],
            parameters: { aspectRatio: "9:16" },
          }),
        }
      );
      if (startRes.ok) {
        const startData = await startRes.json();
        const op = startData.name;
        for (let i = 0; i < 18 && op; i++) {
          await new Promise((r) => setTimeout(r, 5000));
          const poll = await fetch(`https://generativelanguage.googleapis.com/v1beta/${op}`, {
            headers: { "x-goog-api-key": getGeminiApiKey() },
          });
          if (!poll.ok) continue;
          const data = await poll.json();
          if (!data.done) continue;
          const uri =
            data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
          if (!uri) break;
          const dl = await fetch(uri, {
            headers: { "x-goog-api-key": getGeminiApiKey() },
            redirect: "follow",
          });
          if (!dl.ok) break;
          const videoBlob = await put(`reels/${stamp}.mp4`, Buffer.from(await dl.arrayBuffer()), {
            access: "public",
            contentType: "video/mp4",
          });
          videoUrl = videoBlob.url;
          break;
        }
      }
    } catch (err) {
      console.warn("Optional Veo skipped:", err.message);
    }

    await airtableCreateQueue({
      Hook: `Day ${dayNumber}: ${content.hook}`,
      Caption: content.caption,
      "Image URL": blob.url,
      Status: "Ready",
      Type: videoUrl ? "Reel" : "Feed",
      "Video URL": videoUrl || undefined,
      "Cover URL": videoUrl ? blob.url : undefined,
      "First Comment": content.firstComment || buildFirstComment(),
      "Source URL": winner.fields["Post URL"] || "",
      "Day Number": dayNumber,
      Sequence: 1,
    });

    if (!winner._claimedAsUsed) await markWinnerUsed(winner.id);

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
    return Response.json({ error: err.message }, { status: 500 });
  }
}
