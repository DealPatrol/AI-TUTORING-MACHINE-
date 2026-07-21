// SKILL 02 + 03 — THE COPYWRITER + THE DESIGNER (runs daily)
// Takes one winner, rewrites it in your brand voice, generates the image,
// and adds a ready-to-publish post to the Queue table.

import { put } from "@vercel/blob";
import { checkCronAuth, airtableList, airtableCreate, airtableUpdate, claudeRewrite } from "@/lib/helpers";

export const maxDuration = 120;

const BRAND_VOICE = `
You write for an Instagram account that teaches AI tools and concepts to
beginners. Voice: friendly, plain-English, zero jargon, a little playful.
Every post teaches ONE concrete thing the reader can use today.
`;

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

    // 2. THE COPYWRITER — same idea, new words, sounds human
    const raw = await claudeRewrite(`${BRAND_VOICE}
Below is a post that performed well in this niche. Do NOT copy it.
Extract the underlying idea, then write a completely original post on the
same topic, in the voice above.

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{
  "hook": "short punchy headline for the image, max 8 words",
  "subtext": "one supporting line for the image, max 15 words",
  "caption": "the full Instagram caption, 100-150 words, ends with a question to drive comments, then 5 relevant hashtags"
}

Source post caption:
"""${winner.fields.Caption || ""}"""`);

    const content = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // 3. THE DESIGNER — turn the copy into an image (Gemini / "Nano Banana")
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
                  text: `Create a clean, modern Instagram graphic, square 1:1.
Style: soft cream background, bold dark charcoal sans-serif headline,
one small friendly robot mascot illustration, generous whitespace,
subtle blue and green accents. Flat design, no photo.
Headline text (render exactly): "${content.hook}"
Smaller subtext below it (render exactly): "${content.subtext}"`,
                },
              ],
            },
          ],
        }),
      }
    );
    if (!imgRes.ok) throw new Error(`Gemini image failed: ${imgRes.status} ${await imgRes.text()}`);
    const imgData = await imgRes.json();
    const imagePart = imgData.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!imagePart) throw new Error("Gemini returned no image");

    // 4. Upload the image somewhere public (Instagram needs a public URL)
    const buffer = Buffer.from(imagePart.inlineData.data, "base64");
    const blob = await put(`posts/${Date.now()}.png`, buffer, {
      access: "public",
      contentType: "image/png",
    });

    // 5. Queue it and mark the winner as used
    await airtableCreate("Queue", [
      {
        Hook: content.hook,
        Caption: content.caption,
        "Image URL": blob.url,
        Status: "Ready",
        "Source URL": winner.fields["Post URL"] || "",
      },
    ]);
    await airtableUpdate("Winners", winner.id, { Status: "Used" });

    return Response.json({ ok: true, queued: content.hook });
  } catch (err) {
    console.error("Generate cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
