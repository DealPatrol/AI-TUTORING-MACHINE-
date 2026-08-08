// SKILL 01 — THE RESEARCHER (runs Mondays)
// Pulls Apify scrape, scores for growth potential (comments + video bias), saves winners.

import { checkCronAuth, airtableList, airtableCreate } from "@/lib/helpers";

export const maxDuration = 60;

const MIN_LIKES = 500;
const MAX_WINNERS = 25; // more fuel for feed + reel + carousel cadence

function growthScore(post) {
  const likes = post.likesCount || 0;
  const comments = post.commentsCount || 0;
  const commentRate = likes > 0 ? comments / likes : 0;
  const type = String(post.type || post.productType || "").toLowerCase();
  const isVideo = type.includes("video") || type.includes("reel") || Boolean(post.videoUrl);
  const isCarousel = type.includes("sidecar") || type.includes("carousel");

  // Comments predict shares/saves better than raw likes; video/carousel formats travel farther
  return (
    likes +
    comments * 12 +
    commentRate * 5000 +
    (isVideo ? 800 : 0) +
    (isCarousel ? 400 : 0)
  );
}

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch the most recent successful run of your Apify task
    const taskId = process.env.APIFY_TASK_ID;
    const token = process.env.APIFY_TOKEN;
    const apifyUrl = `https://api.apify.com/v2/actor-tasks/${taskId}/runs?status=SUCCEEDED&desc=1&limit=1&token=${token}`;
    const runsRes = await fetch(apifyUrl);
    if (!runsRes.ok) throw new Error(`Apify fetch failed: ${runsRes.status}`);
    const runsData = await runsRes.json();
    
    if (!runsData.data?.items?.length) {
      return Response.json({ ok: true, message: "No completed runs yet" });
    }
    
    const datasetId = runsData.data.items[0].defaultDatasetId;
    const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.APIFY_TOKEN}`);
    if (!datasetRes.ok) throw new Error(`Dataset fetch failed: ${datasetRes.status}`);
    const posts = await datasetRes.json();
    const apifyUrl = `https://api.apify.com/v2/actor-tasks/${process.env.APIFY_TASK_ID}/runs/last/dataset/items?token=${process.env.APIFY_TOKEN}&status=SUCCEEDED`;
    const res = await fetch(apifyUrl);
    if (!res.ok) throw new Error(`Apify fetch failed: ${res.status}`);
    const posts = await res.json();

    const existing = await airtableList(
      "Winners",
      "fields%5B%5D=" + encodeURIComponent("Post URL"),
      { paginate: true, maxRecords: 1000 }
    );
    const seenUrls = new Set(existing.map((r) => r.fields["Post URL"]));

    const winners = posts
      .filter((p) => (p.likesCount || 0) >= MIN_LIKES)
      .filter((p) => p.url && !seenUrls.has(p.url))
      .map((p) => ({ post: p, score: growthScore(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_WINNERS)
      .map(({ post: p, score }) => ({
        "Post URL": p.url,
        Account: p.ownerUsername || "",
        Caption: (p.caption || "").slice(0, 5000),
        Likes: p.likesCount || 0,
        Comments: p.commentsCount || 0,
        Status: "New",
        "Video URL": p.videoUrl || p.media?.[0]?.url || "", // capture video URL if available
        Format: String(p.type || p.productType || "Image"),
        "Growth Score": Math.round(score),
      }));

    if (winners.length === 0) {
      return Response.json({ ok: true, message: "No new winners this week" });
    }

    // Format / Growth Score are optional Airtable fields — retry without them if missing
    try {
      await airtableCreate("Winners", winners);
    } catch (err) {
      if (!String(err.message).includes("UNKNOWN_FIELD_NAME")) throw err;
      const basic = winners.map((row) => ({
        "Post URL": row["Post URL"],
        Account: row.Account,
        Caption: row.Caption,
        Likes: row.Likes,
        Comments: row.Comments,
        Status: row.Status,
      }));
      await airtableCreate("Winners", basic);
    }

    return Response.json({ ok: true, saved: winners.length });
  } catch (err) {
    console.error("Research cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
