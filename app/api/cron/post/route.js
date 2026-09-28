// SKILL 04 — THE POSTER (runs daily)
// Publishes the next "Ready" post from the Queue to Instagram using
// the official Instagram API with Instagram Login (no Facebook Page required).
// Publishes Feed/Carousel, first-comment CTA, Story, stores IG Media ID.

import {
  checkCronAuth,
  waitForIgContainer,
  publishIgContainer,
  postIgFirstComment,
  createIgImageContainer,
  createIgCarouselContainer,
  createIgReelContainer,
  extractQueueVideo,
  listReadyQueue,
  publishIgStory,
  safeAirtableUpdate,
  markQueueFailed,
  cleanQueueCaption,
  getIgCredentials,
} from "@/lib/helpers";
import { recordPipelineStatus } from "@/lib/pipeline-status";

export const maxDuration = 300;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let post = null;
  let published = null;
  let publishAttempted = false;
  try {
    let queue = await listReadyQueue("Reel");
    if (queue.length === 0) {
      queue = await listReadyQueue("Carousel");
    }
    if (queue.length === 0) {
      queue = await listReadyQueue("Feed");
    }
    if (queue.length === 0) {
      await recordPipelineStatus("post", {
        outcome: "skipped",
      });
      return Response.json({
        ok: true,
        skipped: true,
        message: "Queue is empty for reel/feed/carousel",
      });
    }

    post = queue[0];
    // Infer type when Airtable has no Type field. Reels win discovery.
    let type = post.fields.Type;
    if (extractQueueVideo(post.fields)) type = "Reel";
    else if (!type) {
      if (post.fields["Slide URLs"]) type = "Carousel";
      else type = "Feed";
    }
    const retryCount = post.fields["Retry Count"] || 0;
    const { token, igUserId } = getIgCredentials();
    let container;
    const videoUrl = extractQueueVideo(post.fields);

    if (type === "Reel") {
      if (!videoUrl) {
        await markQueueFailed(post.id, "Reel missing Video URL", { retryCount });
        return Response.json({ error: `Record ${post.id} has no Video URL, skipping.` }, { status: 400 });
      }
      container = await createIgReelContainer({
        igUserId,
        token,
        videoUrl,
        caption: cleanQueueCaption(post.fields.Caption),
        coverUrl: post.fields["Cover URL"] || post.fields["Image URL"] || undefined,
        shareToFeed: true,
      });
    } else if (type === "Carousel") {
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
        caption: cleanQueueCaption(post.fields.Caption),
      });
    } else {
      if (!post.fields["Image URL"]) {
        await markQueueFailed(post.id, "Missing Image URL", { retryCount });
        return Response.json({ error: `Record ${post.id} has no Image URL, skipping.` }, { status: 400 });
      }
      container = await createIgImageContainer({
        igUserId,
        token,
        imageUrl: post.fields["Image URL"],
        caption: cleanQueueCaption(post.fields.Caption),
      });
    }

    // Reels take longer to process than stills. Fail closed if IG never finishes.
    await waitForIgContainer(container.id, token, {
      attempts: type === "Reel" ? 40 : 15,
      delayMs: type === "Reel" ? 4000 : 2000,
    });

    // 3. Publish it after Instagram finishes processing the container.
    // Persist an uncertainty marker before the external side effect. If the
    // response is lost, leave this row for reconciliation instead of duplicating it.
    await safeAirtableUpdate("Queue", post.id, { "Last Error": "[PUBLISHING] Publication started; reconcile with Instagram before retrying" });
    publishAttempted = true;
    published = await publishIgContainer(container.id, token, igUserId);

    await safeAirtableUpdate("Queue", post.id, {
      Status: "Posted",
      "Posted At": new Date().toISOString(),
      "IG Media ID": published.id,
      "Last Error": "",
    });

    const comment = await postIgFirstComment(
      published.id,
      post.fields["First Comment"] || "",
      token
    );

    const storyImage =
      post.fields["Story Image URL"] ||
      (type === "Carousel" ? null : post.fields["Image URL"]);
    const story = storyImage
      ? await publishIgStory({ igUserId, token, imageUrl: storyImage })
      : null;



    await recordPipelineStatus("post", {
      outcome: "posted",
      details: { hook: post.fields.Hook, type, igMediaId: published.id },
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
    console.error("Post cron error:", err);
    if (post?.id && !publishAttempted) await markQueueFailed(post.id, err.message, { retryCount: post.fields["Retry Count"] || 0 });
    await recordPipelineStatus("post", { outcome: "failed", error: err.message });
    return Response.json({ error: err.message }, { status: 500 });
  }
}
