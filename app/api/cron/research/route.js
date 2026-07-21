// SKILL 01 — THE RESEARCHER (runs Mondays)
// Pulls the latest Apify Instagram scrape and saves the winners to Airtable.

import { checkCronAuth, airtableList, airtableCreate } from "@/lib/helpers";

export const maxDuration = 60;

const MIN_LIKES = 500; // a post needs at least this many likes to count as a "winner"
const MAX_WINNERS = 15; // save at most this many per week

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch the most recent successful run of your Apify task
    const apifyUrl = `https://api.apify.com/v2/actor-tasks/${process.env.APIFY_TASK_ID}/runs/last/dataset/items?token=${process.env.APIFY_TOKEN}&status=SUCCEEDED`;
    const res = await fetch(apifyUrl);
    if (!res.ok) throw new Error(`Apify fetch failed: ${res.status}`);
    const posts = await res.json();

    // Don't save posts we've already seen
    const existing = await airtableList("Winners", "fields%5B%5D=Post+URL&maxRecords=500");
    const seenUrls = new Set(existing.map((r) => r.fields["Post URL"]));

    const winners = posts
      .filter((p) => (p.likesCount || 0) >= MIN_LIKES)
      .filter((p) => p.url && !seenUrls.has(p.url))
      .sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
      .slice(0, MAX_WINNERS)
      .map((p) => ({
        "Post URL": p.url,
        Account: p.ownerUsername || "",
        Caption: (p.caption || "").slice(0, 5000),
        Likes: p.likesCount || 0,
        Comments: p.commentsCount || 0,
        Status: "New",
      }));

    if (winners.length === 0) {
      return Response.json({ ok: true, message: "No new winners this week" });
    }

    await airtableCreate("Winners", winners);
    return Response.json({ ok: true, saved: winners.length });
  } catch (err) {
    console.error("Research cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
