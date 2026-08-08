// SKILL 02 + 03 — THREE-VECTOR SYSTEM (runs daily)
// Takes one winner, generates 3 completely different scripts + 3 unique images
// using Gemini (signal variance) + 1 video using Veo AI. Queues all 3 posts 
// with video for reel posting at 1pm, 3pm, 5pm UTC.

import { put } from "@vercel/blob";
import { checkCronAuth, airtableList, airtableCreate, airtableUpdate } from "@/lib/helpers";
// SKILL 02 + 03 — THE COPYWRITER + THE DESIGNER (runs daily)
// Growth-optimized feed graphic + Story creative + Day N streak.

import { put } from "@vercel/blob";
import {
  checkCronAuth,
  airtableCreateQueue,
  claudeRewrite,
  parseClaudeJson,
  generateGeminiImage,
  getTipDayNumber,
  claimNextWinner,
  markWinnerUsed,
  releaseWinner,
} from "@/lib/helpers";
import { feedGrowthPrompt, buildFirstComment, storyOverlayPrompt } from "@/lib/growth";

export const maxDuration = 120;

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
        message: "No new winners left — research cron will refill Monday",
      });
    }
    const dayNumber = await getTipDayNumber();

    // 2. Generate 3 completely different scripts + images using Gemini
    // Each has unique hook, caption, and visual style for signal variance
    const variations = [];
    for (let seq = 1; seq <= 3; seq++) {
      // Generate unique script/caption for this variation
      const scriptRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You write for @unlocking__ai, a tech education Instagram channel. Based on this winning post: "${winner.fields.Caption || ""}"

Create variation ${seq} of 3. Write a COMPLETELY DIFFERENT hook, angle, and caption that covers a different aspect of the same topic. Each variation must have a unique perspective and teaching angle.

Respond with ONLY valid JSON, no markdown, in this exact shape:
{
  "hook": "short punchy 6-10 word headline for the image",
  "subtext": "one supporting line max 15 words",
  "caption": "full Instagram caption 100-150 words, ends with a question, then 5 hashtags"
}`,
                  },
                ],
              },
            ],
          }),
        }
      );
      if (!scriptRes.ok) throw new Error(`Gemini script failed for variation ${seq}: ${scriptRes.status}`);
      const scriptData = await scriptRes.json();
      const scriptText = scriptData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!scriptText) throw new Error(`Gemini returned no script for variation ${seq}`);
      
      const content = JSON.parse(scriptText.replace(/```json|```/g, "").trim());

      // Generate unique image for this variation (different style/composition)
      const styleGuide = [
        "bold minimalist with large text overlay, cream/black color scheme",
        "photorealistic with people/code, bright colors, dynamic composition",
        "abstract modern design with gradients and geometric shapes",
      ];

      const imgRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Create an Instagram post image (1080x1350px vertical, 9:16 ratio).
Style: ${styleGuide[seq - 1]}
Caption text: "${content.caption.substring(0, 80)}"
Hook/Headline: "${content.hook}"
Make it visually striking, hook viewers instantly, mobile-optimized.`,
                  },
                ],
              },
            ],
          }),
        }
      );
      if (!imgRes.ok) throw new Error(`Gemini image failed for variation ${seq}: ${imgRes.status}`);
      const imgData = await imgRes.json();
      const imagePart = imgData.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (!imagePart) throw new Error(`Gemini returned no image for variation ${seq}`);

      // Upload image to Vercel Blob
      const buffer = Buffer.from(imagePart.inlineData.data, "base64");
      const blob = await put(`posts/${Date.now()}-var${seq}.png`, buffer, {
        access: "public",
        contentType: "image/png",
      });

      variations.push({
        sequence: seq,
        hook: content.hook,
        caption: content.caption,
        imageUrl: blob.url,
        sourceUrl: winner.fields["Post URL"] || "",
      });
    }

    // 3. Generate video using Veo based on the winning post
    let videoUrl = null;
    try {
      // Generate a video prompt from the winner's caption
      const videoPrompt = `Create a short, engaging 6-second video reel for an Instagram post about: "${winner.fields.Caption || "tech education"}". Make it visually dynamic with text overlays and interesting transitions. Professional quality, modern aesthetic.`;

      // Veo is a long-running video-generation model — kick off the operation via predictLongRunning
      const videoModel = "veo-3.0-generate-001";
      const startRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${videoModel}:predictLongRunning?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt: videoPrompt }],
            parameters: { aspectRatio: "9:16" },
          }),
        }
      );

      if (startRes.ok) {
        const startData = await startRes.json();
        let operationName = startData.name;

        // Poll the long-running operation until the video is ready (or we time out)
        let operationDone = false;
        let videoFileUri = null;
        for (let attempt = 0; attempt < 15 && operationName && !operationDone; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 6000));
          const pollRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${process.env.GEMINI_API_KEY}`
          );
          if (!pollRes.ok) continue;
          const pollData = await pollRes.json();
          if (pollData.done) {
            operationDone = true;
            const sample = pollData.response?.generateVideoResponse?.generatedSamples?.[0];
            videoFileUri = sample?.video?.uri || null;
          }
        }

        if (videoFileUri) {
          // Download the generated video (requires the API key) and upload it to Vercel Blob
          const downloadRes = await fetch(
            videoFileUri.includes("key=")
              ? videoFileUri
              : `${videoFileUri}${videoFileUri.includes("?") ? "&" : "?"}key=${process.env.GEMINI_API_KEY}`
          );
          if (downloadRes.ok) {
            const videoBuffer = Buffer.from(await downloadRes.arrayBuffer());
            const videoBlob = await put(`reels/${Date.now()}-reel.mp4`, videoBuffer, {
              access: "public",
              contentType: "video/mp4",
            });
            videoUrl = videoBlob.url;
          }
        }
      }
    } catch (err) {
      console.log("Could not generate video with Veo:", err.message);
    }

    // 4. Queue all 3 variations with sequence order (images + video URLs for reels)
    const queueRecords = [];
    for (const v of variations) {
      const postData = {
        Hook: v.hook,
        Caption: v.caption,
        "Image URL": v.imageUrl,
        Status: "Ready",
        Sequence: v.sequence,
        "Source URL": v.sourceUrl,
      };
      
      // Add video URL if available (for reel posting)
      if (videoUrl) {
        postData["Video URL"] = videoUrl;
      }
      
      queueRecords.push(postData);
    }
    await airtableCreate("Queue", queueRecords);

    // 5. Mark winner as used
    await airtableUpdate("Winners", winner.id, { Status: "Used" });

    return Response.json({
      ok: true,
      message: "Generated 3 variations",
      variations: variations.map((v) => ({ sequence: v.sequence, hook: v.hook })),
    });
    const raw = await claudeRewrite(feedGrowthPrompt(winner.fields.Caption || "", dayNumber));
    const content = parseClaudeJson(raw);
    const stamp = Date.now();

    const { buffer } = await generateGeminiImage(
      `Create a clean, modern Instagram graphic, square 1:1.
Style: soft cream background, bold dark charcoal sans-serif headline,
one small friendly robot mascot illustration, generous whitespace,
subtle blue and green accents. Flat design, no photo.
Tiny top label: "Day ${dayNumber}"
Headline text (render exactly): "${content.hook}"
Smaller subtext below it (render exactly): "${content.subtext || ""}"`
    );

    const blob = await put(`posts/${stamp}.png`, buffer, {
      access: "public",
      contentType: "image/png",
    });

    const story = await generateGeminiImage(
      storyOverlayPrompt(content.hook, content.storyText, dayNumber)
    );
    const storyBlob = await put(`stories/${stamp}.png`, story.buffer, {
      access: "public",
      contentType: "image/png",
    });

    const firstComment =
      content.firstComment ||
      buildFirstComment({ topicTag: content.topicTag });

    await airtableCreateQueue({
      Hook: `Day ${dayNumber}: ${content.hook}`,
      Caption: content.caption,
      "Image URL": blob.url,
      Status: "Ready",
      Type: "Feed",
      "First Comment": firstComment,
      "Story Text": content.storyText || content.hook,
      "Story Image URL": storyBlob.url,
      "Source URL": winner.fields["Post URL"] || "",
      "Day Number": dayNumber,
      "Bonus Prompt": content.bonusPrompt || "",
    });
    if (!winner._claimedAsUsed) await markWinnerUsed(winner.id);

    return Response.json({ ok: true, queued: content.hook, type: "Feed", dayNumber });
  } catch (err) {
    // Always try to put the winner back so a mid-run failure doesn't burn the idea
    if (winner?.id) await releaseWinner(winner.id);
    console.error("Generate cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
