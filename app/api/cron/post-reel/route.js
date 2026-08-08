// DAILY REEL POSTER — the single source of truth for the daily video slot.
// Posts a Ready Reel; if none exists (e.g. Veo failed and generate-reel queued
// a Carousel fallback instead), it posts that Carousel so the daily cadence
// never breaks. Also posts a Story + first comment and stores the IG Media ID.

import {
  checkCronAuth,
  waitForIgContainer,
  publishIgContainer,
  postIgFirstComment,
  createIgReelContainer,
  createIgImageContainer,
  createIgCarouselContainer,
  listReadyQueue,
  publishIgStory,
  safeAirtableUpdate,
  markQueueFailed,
} from "@/lib/helpers";

// Carousels build several child containers, so allow the full safe ceiling.
export const maxDuration = 300;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let post = null;
  try {
    // Prefer a real Reel; fall back to a Ready Carousel (the Veo-failure output).
    let queue = await listReadyQueue("Reel");
    let type = "Reel";
    if (queue.length === 0) {
      queue = await listReadyQueue("Carousel");
      type = "Carousel";
    }
    if (queue.length === 0) {
      return Response.json({
        ok: true,
        skipped: true,
        message: "No reels or carousel fallbacks ready to post",
      });
    }

    post = queue[0];
    const retryCount = post.fields["Retry Count"] || 0;
    const token = process.env.IG_ACCESS_TOKEN;
    const igUserId = process.env.IG_USER_ID;

    let container;
    if (type === "Reel") {
      if (!post.fields["Video URL"]) {
        await markQueueFailed(post.id, "Reel missing Video URL", { retryCount });
        return Response.json({ error: `Reel ${post.id} has no Video URL` }, { status: 400 });
      }
      container = await createIgReelContainer({
        igUserId,
        token,
        videoUrl: post.fields["Video URL"],
        caption: post.fields.Caption || "",
        coverUrl: post.fields["Cover URL"] || post.fields["Image URL"] || undefined,
        shareToFeed: true,
      });
      await waitForIgContainer(container.id, token, { attempts: 40, delayMs: 4000 });
    } else {
      // Carousel fallback: build each slide as a child, then a carousel container.
      let slides = [];
      try {
        slides = JSON.parse(post.fields["Slide URLs"] || "[]");
      } catch {
        slides = [];
      }
      if (!Array.isArray(slides) || slides.length < 2) {
        await markQueueFailed(post.id, "Carousel needs Slide URLs JSON with 2+ images", { retryCount });
        return Response.json(
          { error: `Carousel ${post.id} needs Slide URLs JSON with 2+ images` },
          { status: 400 }
        );
      }
      const childIds = [];
      for (const imageUrl of slides) {
        const child = await createIgImageContainer({ igUserId, token, imageUrl, isCarouselItem: true });
        await waitForIgContainer(child.id, token, { attempts: 15, delayMs: 2000 });
        childIds.push(child.id);
      }
      container = await createIgCarouselContainer({
        igUserId,
        token,
        children: childIds,
        caption: post.fields.Caption || "",
      });
      await waitForIgContainer(container.id, token, { attempts: 20, delayMs: 3000 });
    }

    const published = await publishIgContainer(container.id, token, igUserId);

    const comment = await postIgFirstComment(
      published.id,
      post.fields["First Comment"] || "",
      token
    );

    const storyImage =
      post.fields["Story Image URL"] ||
      post.fields["Cover URL"] ||
      (type === "Reel" ? post.fields["Image URL"] : null);
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
      type,
      igMediaId: published.id,
      firstCommentId: comment?.id || null,
      storyId: story?.id || null,
    });
  } catch (err) {
    console.error("Post reel cron error:", err);
    if (post?.id) {
      await markQueueFailed(post.id, err.message, { retryCount: post.fields["Retry Count"] || 0 });
    }
    return Response.json({ error: err.message }, { status: 500 });
  }
}
