// DAILY REEL POSTER — publishes one Ready Reel per day (Reels tab + feed).

import {
  checkCronAuth,
  airtableUpdate,
  waitForIgContainer,
  publishIgContainer,
  postIgFirstComment,
  createIgReelContainer,
  listReadyQueue,
} from "@/lib/helpers";

export const maxDuration = 180;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const queue = await listReadyQueue("Reel");
    if (queue.length === 0) {
      return Response.json({ ok: true, message: "No reels ready to post" });
    }

    const post = queue[0];
    if (!post.fields["Video URL"]) {
      return Response.json(
        { error: `Reel ${post.id} has no Video URL` },
        { status: 400 }
      );
    }

    const token = process.env.IG_ACCESS_TOKEN;
    const igUserId = process.env.IG_USER_ID;

    const container = await createIgReelContainer({
      igUserId,
      token,
      videoUrl: post.fields["Video URL"],
      caption: post.fields.Caption || "",
      coverUrl: post.fields["Cover URL"] || post.fields["Image URL"] || undefined,
      shareToFeed: true,
    });

    // Reels take longer to process than images
    await waitForIgContainer(container.id, token, { attempts: 40, delayMs: 4000 });
    const published = await publishIgContainer(container.id, token, igUserId);

    const comment = await postIgFirstComment(
      published.id,
      post.fields["First Comment"] || "",
      token
    );

    await airtableUpdate("Queue", post.id, {
      Status: "Posted",
      "Posted At": new Date().toISOString(),
    });

    return Response.json({
      ok: true,
      posted: post.fields.Hook,
      type: "Reel",
      igMediaId: published.id,
      firstCommentId: comment?.id || null,
    });
  } catch (err) {
    console.error("Post reel cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
