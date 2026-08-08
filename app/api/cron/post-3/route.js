// Poster slot #3 — posts next Ready image. Works with or without Sequence field.

import {
  checkCronAuth,
  listReadyBySequence,
  safeAirtableUpdate,
  waitForIgContainer,
  publishIgContainer,
  createIgImageContainer,
  markQueueFailed,
} from "@/lib/helpers";

export const maxDuration = 60;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let post = null;
  try {
    const queue = await listReadyBySequence(3);
    if (queue.length === 0) {
      return Response.json({ ok: true, skipped: true, message: "No Ready posts" });
    }
    post = queue[0];
    if (!post.fields["Image URL"]) {
      await markQueueFailed(post.id, "Missing Image URL", {
        retryCount: post.fields["Retry Count"] || 0,
      });
      return Response.json({ error: "Missing Image URL" }, { status: 400 });
    }

    const token = process.env.IG_ACCESS_TOKEN;
    const igUserId = process.env.IG_USER_ID;
    if (!token || !igUserId) {
      throw new Error("IG_ACCESS_TOKEN or IG_USER_ID missing");
    }

    const container = await createIgImageContainer({
      igUserId,
      token,
      imageUrl: post.fields["Image URL"],
      caption: post.fields.Caption || "",
    });
    await waitForIgContainer(container.id, token, { attempts: 15, delayMs: 2000 });
    const published = await publishIgContainer(container.id, token, igUserId);

    await safeAirtableUpdate("Queue", post.id, {
      Status: "Posted",
      "Posted At": new Date().toISOString(),
      "IG Media ID": published.id,
    });

    return Response.json({
      ok: true,
      posted: post.fields.Hook,
      sequence: 3,
      igMediaId: published.id,
    });
  } catch (err) {
    console.error("Post-3 cron error:", err);
    if (post?.id) {
      await markQueueFailed(post.id, err.message, {
        retryCount: post.fields["Retry Count"] || 0,
      });
    }
    return Response.json({ error: err.message }, { status: 500 });
  }
}
