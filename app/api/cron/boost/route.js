// BOOST — a same-day follow-up Story that sends people back to comment HOW / follow.

import { put } from "@vercel/blob";
import {
  checkCronAuth,
  getIgCredentials,
  listPostedQueue,
  publishIgStory,
  safeAirtableUpdate,
} from "@/lib/helpers";
import { renderCaptionSlide } from "@/lib/slide-render";

export const maxDuration = 120;

const BOOST_WINDOW_MS = 10 * 60 * 60 * 1000;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token, igUserId } = getIgCredentials();
  if (!token || !igUserId) {
    return Response.json({ error: "IG_ACCESS_TOKEN or IG_USER_ID missing" }, { status: 400 });
  }

  try {
    const posted = await listPostedQueue({ maxRecords: 20 });
    const cutoff = Date.now() - BOOST_WINDOW_MS;
    const targets = posted.filter((row) => {
      const postedAt = Date.parse(row.fields["Posted At"] || 0);
      if (!postedAt || postedAt < cutoff) return false;
      if (row.fields["Boosted At"]) return false;
      return Boolean(row.fields["IG Media ID"]);
    });

    if (targets.length === 0) {
      return Response.json({
        ok: true,
        skipped: true,
        message: "No recent posts waiting for a boost Story",
      });
    }

    const boosted = [];
    for (const row of targets.slice(0, 3)) {
      let imageUrl = row.fields["Story Image URL"];
      if (!imageUrl) {
        const graphic = await renderCaptionSlide({
          headline: row.fields.Hook || "Today's AI tip",
          body: "Comment HOW for the playbook",
          label: row.fields["Day Number"] ? `DAY ${row.fields["Day Number"]}` : "TODAY",
          footer: "Save the prompt for later",
          width: 1080,
          height: 1920,
        });
        const blob = await put(`stories/boost-${Date.now()}-${row.id}.jpg`, graphic, {
          access: "public",
          contentType: "image/jpeg",
        });
        imageUrl = blob.url;
      }

      const story = await publishIgStory({ igUserId, token, imageUrl });
      if (!story?.id) continue;

      await safeAirtableUpdate("Queue", row.id, {
        "Boosted At": new Date().toISOString(),
        "Story Image URL": imageUrl,
      });
      boosted.push({ id: row.id, hook: row.fields.Hook, storyId: story.id });
    }

    return Response.json({
      ok: true,
      boosted: boosted.length,
      posts: boosted,
    });
  } catch (err) {
    console.error("Boost cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
