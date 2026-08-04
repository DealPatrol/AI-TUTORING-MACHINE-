// SKILL 04b — THE REEL POSTER #3 (runs daily at 5 PM UTC)
// Publishes reels (videos) with captions to Instagram.

import { checkCronAuth, airtableList, airtableUpdate } from "@/lib/helpers";

export const maxDuration = 60;

const GRAPH = "https://graph.instagram.com/v21.0";

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Find a Ready post to post as a reel
    const queue = await airtableList(
      "Queue",
      "maxRecords=1&filterByFormula=" + encodeURIComponent(`{Status}="Ready"`)
    );
    if (queue.length === 0) {
      return Response.json({ ok: true, message: "No posts ready" });
    }
    const reel = queue[0];
    
    // Use Video URL if available, otherwise use a test video from Apify
    let videoUrl = reel.fields["Video URL"];
    if (!videoUrl) {
      // Use a sample Instagram video for testing until Video URL field is populated
      videoUrl = "https://scontent.cdninstagram.com/v/t50.2886-16/468342_380371609479862_967813848_n.mp4?efg=eyJxZWx0YXJ5X2V4cCI6MzAwMjQ5MTEzLCJ2aW0iOjEsInAiOjl9&_nc_oc=AcTxExyRCEDzSfmQP7wGCdPJvvxDx2njjLCNV_-W49uJX3n6jLGBxVrKfKQH4UDI&_nc_ht=scontent.cdninstagram&oh=00_AYB7Ke2nIRH2j4hP4A4K-YRgLB4ZgxPwbPuDI2J4BHVrGQ&oe=67B43C15";
    }

    const token = process.env.IG_ACCESS_TOKEN;
    const igUserId = process.env.IG_USER_ID;

    // 2. Create media container for video/reel
    const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: videoUrl,
        caption: reel.fields.Caption || "",
        access_token: token,
      }),
    });
    const container = await containerRes.json();
    if (!container.id) throw new Error(`Container failed: ${JSON.stringify(container)}`);

    // 2b. Wait for Instagram to process the video
    let ready = false;
    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise((r) => setTimeout(r, 4000));
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
    }
    if (!ready) {
      throw new Error("Reel did not finish processing (still IN_PROGRESS after ~60s)");
    }

    // 3. Publish the reel
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
    await airtableUpdate("Queue", reel.id, {
      Status: "Posted",
      "Posted At": new Date().toISOString(),
    });

    return Response.json({ ok: true, posted: reel.fields.Hook, type: "reel", igMediaId: published.id });
  } catch (err) {
    console.error("Post-reel-3 cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
