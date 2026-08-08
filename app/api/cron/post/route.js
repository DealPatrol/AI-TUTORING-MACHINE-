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
  listReadyQueue,
  publishIgStory,
  safeAirtableUpdate,
  markQueueFailed,
  cleanQueueCaption,
  getIgCredentials,
} from "@/lib/helpers";

// Instagram Login (creator/business) tokens authenticate against
// graph.instagram.com, NOT graph.facebook.com. The content-publishing
// endpoints (/media and /media_publish) are the same on this host.
const GRAPH = "https://graph.instagram.com/v21.0";
export const maxDuration = 120;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let post = null;
  try {
    let queue = await listReadyQueue("Carousel");
    if (queue.length === 0) {
      queue = await listReadyQueue("Feed");
    }
    if (queue.length === 0) {
      return Response.json({
        ok: true,
        skipped: true,
        message: "Queue is empty for feed/carousel",
      });
    }

    post = queue[0];
    // Infer type when Airtable has no Type field
    let type = post.fields.Type;
    if (!type) {
      if (post.fields["Slide URLs"]) type = "Carousel";
      else type = "Feed";
    }
    const retryCount = post.fields["Retry Count"] || 0;
    const { token, igUserId } = getIgCredentials();
    let container;

    if (type === "Carousel") {
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

    // 3. Publish it after Instagram finishes processing the container.
    const published = await publishIgContainer(container.id, token, igUserId);

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
    console.error("Post cron error:", err);
    if (post?.id) await markQueueFailed(post.id, err.message, { retryCount: post.fields["Retry Count"] || 0 });
    return Response.json({ error: err.message }, { status: 500 });
  }
}
