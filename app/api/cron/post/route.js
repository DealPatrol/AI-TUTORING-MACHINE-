// SKILL 04 — THE POSTER (runs daily)
// Publishes the next "Ready" post from the Queue to Instagram using
// the official Instagram API with Instagram Login (no Facebook Page required).

import { checkCronAuth, airtableList, airtableUpdate } from "@/lib/helpers";

export const maxDuration = 60;

// Instagram Login (creator/business) tokens authenticate against
// graph.instagram.com, NOT graph.facebook.com. The content-publishing
// endpoints (/media and /media_publish) are the same on this host.
const GRAPH = "https://graph.instagram.com/v21.0";

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Next post in the queue
    const queue = await airtableList(
      "Queue",
      "maxRecords=1&filterByFormula=" + encodeURIComponent(`{Status}="Ready"`)
    );
    if (queue.length === 0) {
      return Response.json({ ok: true, message: "Queue is empty" });
    }
    const post = queue[0];
    if (!post.fields["Image URL"]) {
      return Response.json({ error: `Record ${post.id} has no Image URL, skipping.` }, { status: 400 });
    }
    const token = process.env.IG_ACCESS_TOKEN;
    const igUserId = process.env.IG_USER_ID;

    // 2. Create a media container
    const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: post.fields["Image URL"],
        caption: post.fields.Caption || "",
        access_token: token,
      }),
    });
    const container = await containerRes.json();
    if (!container.id) throw new Error(`Container failed: ${JSON.stringify(container)}`);

    // 2b. Wait for Instagram to finish processing the media before publishing.
    // Instagram downloads/processes the image asynchronously; publishing too
    // early fails with code 9007 "media is not ready for publishing".
    let ready = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((r) => setTimeout(r, 3000)); // wait 3s between checks
      const statusRes = await fetch(
        `${GRAPH}/${container.id}?fields=status_code,status&access_token=${token}`
      );
      const status = await statusRes.json();
      if (status.status_code === "FINISHED") {
        ready = true;
        break;
      }
      if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
        throw new Error(`Media processing ${status.status_code}: ${JSON.stringify(status)}`);
      }
      // otherwise IN_PROGRESS — keep polling
    }
    if (!ready) {
      throw new Error("Media did not finish processing in time (still IN_PROGRESS after ~30s)");
    }

    // 3. Publish it
    const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: token,
      }),
    });
    const published = await publishRes.json();
    if (!published.id) throw new Error(`Publish failed: ${JSON.stringify(published)}`);

    // 4. Mark it posted
    await airtableUpdate("Queue", post.id, {
      Status: "Posted",
      "Posted At": new Date().toISOString(),
    });

    return Response.json({ ok: true, posted: post.fields.Hook, igMediaId: published.id });
  } catch (err) {
    console.error("Post cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
