// SKILL 02 + 03 — THREE-VECTOR SYSTEM (runs daily)
// Takes one winner, generates 3 completely different scripts + 3 unique images
// using Gemini (signal variance). Queues all 3 posts with sequence order (1,2,3)
// for clustered posting at 12pm, 2pm, 4pm UTC.

import { put } from "@vercel/blob";
import { checkCronAuth, airtableList, airtableCreate, airtableUpdate } from "@/lib/helpers";

export const maxDuration = 120;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Grab the next unused winner
    const winners = await airtableList(
      "Winners",
      "maxRecords=1&filterByFormula=" + encodeURIComponent(`{Status}="New"`)
    );
    if (winners.length === 0) {
      return Response.json({ ok: true, message: "No new winners left — research cron will refill Monday" });
    }
    const winner = winners[0];

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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

    // 3. Queue all 3 variations with sequence order (images)
    for (const v of variations) {
      await airtableCreate("Queue", {
        Hook: v.hook,
        Caption: v.caption,
        "Image URL": v.imageUrl,
        Status: "Ready",
        Sequence: v.sequence,
        "Source URL": v.sourceUrl,
        Type: "image",
      });
    }

    // 4. Queue all 3 variations as reels (same captions, but with video URLs from winner)
    const videoUrl = winner.fields["Video URL"];
    if (videoUrl) {
      for (const v of variations) {
        await airtableCreate("Queue", {
          Hook: v.hook,
          Caption: v.caption,
          "Video URL": videoUrl,
          Status: "Ready",
          Sequence: v.sequence,
          "Source URL": v.sourceUrl,
          Type: "reel",
        });
      }
    }

    // 4. Mark winner as used
    await airtableUpdate("Winners", winner.id, { Status: "Used" });

    return Response.json({
      ok: true,
      message: "Generated 3 variations",
      variations: variations.map((v) => ({ sequence: v.sequence, hook: v.hook })),
    });
  } catch (err) {
    console.error("Generate cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
