import { NextResponse } from "next/server";
import { airtableList, getTipDayNumber, appBaseUrl } from "@/lib/helpers";
import { loadGrowthHistory, summarizeGrowth, buildGrowthRecommendations } from "@/lib/growth-stats";
import { loadPipelineStatuses } from "@/lib/pipeline-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const tipDay = await getTipDayNumber();
  const warnings = [];
  let queue = [];
  let winners = [];
  let posted = [];
  let failed = [];

  try {
    [queue, winners, posted, failed] = await Promise.all([
      airtableList("Queue", "filterByFormula=" + encodeURIComponent(`{Status}="Ready"`)),
      airtableList("Winners", "filterByFormula=" + encodeURIComponent(`{Status}="New"`)),
      airtableList(
        "Queue",
        "filterByFormula=" + encodeURIComponent(`{Status}="Posted"`) + "&maxRecords=12"
      ),
      airtableList(
        "Queue",
        "filterByFormula=" + encodeURIComponent(`{Status}="Failed"`) + "&maxRecords=10"
      ).catch(() => []),
    ]);
  } catch (error) {
    console.error("Dashboard Airtable error:", error);
    warnings.push("Could not load Airtable data. Check credentials in Vercel project settings.");
  }

  const readyReels = queue.filter((r) => r.fields.Type === "Reel").length;
  const readyFeed = queue.filter((r) => !r.fields.Type || r.fields.Type === "Feed").length;
  const readyCarousels = queue.filter((r) => r.fields.Type === "Carousel").length;
  const generationIssues = queue
    .filter((r) => r.fields["Fallback Used"] || r.fields["Last Error"])
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      hook: r.fields.Hook || "Untitled",
      type: r.fields.Type || "Feed",
      error: r.fields["Last Error"] || "Provider fallback used",
    }));

  if (winners.length < 3) warnings.push(`Low winners (${winners.length}) — run research`);
  if (readyReels === 0) warnings.push("No Ready Reel for today's 18:00 UTC post");
  if (readyFeed + readyCarousels === 0) warnings.push("No Ready feed/carousel for 15:00 UTC");
  if (generationIssues.length) warnings.push(`${generationIssues.length} Ready item(s) used a generation fallback`);
  if (failed.length) warnings.push(`${failed.length} failed queue item(s)`);

  const topPosted = [...posted]
    .map((r) => ({
      id: r.id,
      hook: r.fields.Hook,
      type: r.fields.Type || "Feed",
      postedAt: r.fields["Posted At"],
      reach: r.fields.Reach || 0,
      saves: r.fields.Saves || 0,
      plays: r.fields.Plays || 0,
      igMediaId: r.fields["IG Media ID"],
      dayNumber: r.fields["Day Number"],
    }))
    .sort((a, b) => (b.reach || 0) - (a.reach || 0));

  const history = await loadGrowthHistory();
  const pipelineStatuses = await loadPipelineStatuses();
  for (const status of Object.values(pipelineStatuses)) {
    if (status.error) {
      warnings.push(
        `Last ${status.operation} ${status.outcome} at ${status.recordedAt}: ${status.error}`
      );
    }
  }
  const summary = summarizeGrowth(history, topPosted);
  const recommendations = buildGrowthRecommendations({
    posted: topPosted,
    summary,
    readyReels,
    readyFeed: readyFeed + readyCarousels,
  });

  return NextResponse.json({
    tipDay,
    warnings,
    queue: queue.map((r) => ({
      id: r.id,
      sequence: r.fields.Sequence,
      hook: r.fields.Hook,
      caption: r.fields.Caption,
      imageUrl: r.fields["Image URL"],
      videoUrl: r.fields["Video URL"],
      storyImageUrl: r.fields["Story Image URL"],
      firstComment: r.fields["First Comment"],
      type: r.fields.Type || "Feed",
      status: r.fields.Status,
      dayNumber: r.fields["Day Number"],
      fallbackUsed: r.fields["Fallback Used"],
      sourceUrl: r.fields["Source URL"],
    })),
    winners: winners.map((r) => ({
      id: r.id,
      url: r.fields["Post URL"],
      account: r.fields.Account,
      caption: r.fields.Caption?.slice(0, 200),
      likes: r.fields.Likes,
      comments: r.fields.Comments,
      status: r.fields.Status,
      format: r.fields.Format,
      growthScore: r.fields["Growth Score"],
    })),
    posted: topPosted,
    failed: failed.map((r) => ({
      id: r.id,
      hook: r.fields.Hook,
      type: r.fields.Type || "Feed",
      error: r.fields["Last Error"],
    })),
    generationIssues,
    pipelineStatuses,
    stats: {
      readyFeed,
      readyReels,
      readyCarousels,
      winnersWaiting: winners.length,
      failed: failed.length,
      readyFallbacks: generationIssues.length,
      lastPostedAt: latestPostedTime == null ? null : new Date(latestPostedTime).toISOString(),
      hoursSinceLastPost,
      tipDay,
    },
    growth: {
      history,
      latest: summary.latest,
      followerDelta7d: summary.followerDelta7d,
      bestFormat: summary.bestFormat,
      formats: summary.formats,
      recommendations,
    },
    scheduleHint:
      "Reel 18:00 · engage 19:00/21:00 · boost Story 20:00 · insights 22:00 · recap Sundays · recycle Mondays",
    appUrl: appBaseUrl(),
  });
}
