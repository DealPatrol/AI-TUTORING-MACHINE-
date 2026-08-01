// SKILL 04 — THE POSTER (runs daily)
// Publishes the next Ready Feed or Carousel from Queue, then drops a growth first-comment.

import {
  checkCronAuth,
  airtableUpdate,
  waitForIgContainer,
  publishIgContainer,
  postIgFirstComment,
  createIgImageContainer,
  createIgCarouselContainer,
  listReadyQueue,
} from "@/lib/helpers";

export const maxDuration = 120;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Prefer carousels (high saves), else feed graphics — reels have their own cron
    let queue = await listReadyQueue("Carousel");
    if (queue.length === 0) {
      queue = await listReadyQueue("Feed");
    }
    if (queue.length === 0) {
      return Response.json({ ok: true, message: "Queue is empty for feed/carousel" });
    }

    const post = queue[0];
    const type = post.fields.Type || "Feed";
    const token = process.env.IG_ACCESS_TOKEN;
    const igUserId = process.env.IG_USER_ID;
    let container;

    if (type === "Carousel") {
      let slides = [];
      try {
        slides = JSON.parse(post.fields["Slide URLs"] || "[]");
      } catch {
        slides = [];
      }
      if (!Array.isArray(slides) || slides.length < 2) {
        return Response.json(
          { error: `Carousel ${post.id} needs Slide URLs JSON with 2+ images` },
          { status: 400 }
        );
      }

      const childIds = [];
      for (const imageUrl of slides) {
        const child = await createIgImageContainer({
          igUserId,
          token,
          imageUrl,
          isCarouselItem: true,
        });
        await waitForIgContainer(child.id, token, { attempts: 15, delayMs: 2000 });
        childIds.push(child.id);
      }
      container = await createIgCarouselContainer({
        igUserId,
        token,
        children: childIds,
        caption: post.fields.Caption || "",
      });
    } else {
      if (!post.fields["Image URL"]) {
        return Response.json({ error: `Record ${post.id} has no Image URL, skipping.` }, { status: 400 });
      }
      container = await createIgImageContainer({
        igUserId,
        token,
        imageUrl: post.fields["Image URL"],
        caption: post.fields.Caption || "",
      });
    }

    await waitForIgContainer(container.id, token);
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
      type,
      igMediaId: published.id,
      firstCommentId: comment?.id || null,
    });
  } catch (err) {
    console.error("Post cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
