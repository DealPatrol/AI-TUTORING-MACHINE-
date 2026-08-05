// DAILY REEL POSTER — one Reel/day + Story + first comment; stores IG Media ID.

import {
  checkCronAuth,
  waitForIgContainer,
  publishIgContainer,
  postIgFirstComment,
  createIgReelContainer,
  listReadyQueue,
  publishIgStory,
  safeAirtableUpdate,
  markQueueFailed,
} from "@/lib/helpers";

export const maxDuration = 180;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let post = null;
  try {
    const queue = await listReadyQueue("Reel");
    if (queue.length === 0) {
      return Response.json({
        ok: true,
        skipped: true,
        message: "No reels ready to post",
      });
    }

    post = queue[0];
    if (!post.fields["Video URL"]) {
      await markQueueFailed(post.id, "Reel missing Video URL");
      return Response.json({ error: `Reel ${post.id} has no Video URL` }, { status: 400 });
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

    await waitForIgContainer(container.id, token, { attempts: 40, delayMs: 4000 });
    const published = await publishIgContainer(container.id, token, igUserId);

    const comment = await postIgFirstComment(
      published.id,
      post.fields["First Comment"] || "",
      token
    );

    const storyImage =
      post.fields["Story Image URL"] ||
      post.fields["Cover URL"] ||
      post.fields["Image URL"];
    const story = storyImage
      ? await publishIgStory({ igUserId, token, imageUrl: storyImage })
      : null;

    await safeAirtableUpdate("Queue", post.id, {
      Status: "Posted",
      "Posted At": new Date().toISOString(),
      "IG Media ID": published.id,
    });

    return Response.json({
      ok: true,
      posted: post.fields.Hook,
      type: "Reel",
      igMediaId: published.id,
      firstCommentId: comment?.id || null,
      storyId: story?.id || null,
    });
  } catch (err) {
    console.error("Post reel cron error:", err);
    if (post?.id) await markQueueFailed(post.id, err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
