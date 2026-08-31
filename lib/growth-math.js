// Pure growth math — no I/O, safe to unit-test.

export function utcDateString(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

function postedReach(row) {
  return Number(row.reach ?? row.fields?.Reach ?? 0);
}

function postedSaves(row) {
  return Number(row.saves ?? row.fields?.Saves ?? 0);
}

function postedPlays(row) {
  return Number(row.plays ?? row.fields?.Plays ?? 0);
}

function postedType(row) {
  return row.type || row.fields?.Type || "Feed";
}

export function summarizeGrowth(history = [], posted = []) {
  const latest = history[history.length - 1] || null;
  const weekAgo = history.length >= 8 ? history[history.length - 8] : history[0] || null;
  const followerDelta7d =
    latest && weekAgo ? Number(latest.followers || 0) - Number(weekAgo.followers || 0) : 0;

  const byType = {};
  for (const row of posted) {
    const type = postedType(row);
    if (!byType[type]) byType[type] = { count: 0, reach: 0, saves: 0, plays: 0 };
    byType[type].count += 1;
    byType[type].reach += postedReach(row);
    byType[type].saves += postedSaves(row);
    byType[type].plays += postedPlays(row);
  }

  const formats = Object.entries(byType)
    .map(([type, stats]) => ({
      type,
      ...stats,
      avgReach: stats.count ? Math.round(stats.reach / stats.count) : 0,
    }))
    .sort((a, b) => b.avgReach - a.avgReach);

  return {
    latest,
    followerDelta7d,
    bestFormat: formats[0] || null,
    formats,
  };
}

export function buildGrowthRecommendations({
  posted = [],
  summary = {},
  readyReels = 0,
  readyFeed = 0,
} = {}) {
  const recs = [];
  const delta = Number(summary.followerDelta7d || 0);
  if (delta > 0) {
    recs.push(`+${delta} followers in 7 days — keep the daily Reel and HOW playbook loop.`);
  } else if (delta < 0) {
    recs.push(`${delta} followers this week — reply to every comment and tighten the follow CTA.`);
  }

  if (summary.bestFormat?.type === "Reel") {
    recs.push(
      `Reels are your top format (avg reach ${summary.bestFormat.avgReach}) — never skip the 18:00 UTC Reel.`
    );
  } else if (summary.bestFormat?.type === "Carousel") {
    recs.push("Carousels win on reach/saves — keep Tue/Thu/Sat swipe posts and the Sunday recap.");
  } else if (summary.bestFormat?.type === "Feed") {
    recs.push("Single images are carrying reach right now — keep a strong hook on every feed graphic.");
  }

  const highSaves = posted.filter((row) => postedSaves(row) >= 5);
  if (highSaves.length) {
    recs.push(`${highSaves.length} recent posts have 5+ saves — recycle those winners after 3 weeks.`);
  }

  if (readyReels === 0) {
    recs.push("No Ready Reel in queue — generate one before 18:00 UTC so discovery does not go dark.");
  }
  if (readyFeed === 0) {
    recs.push("No Ready feed/carousel — generate before the 15:00 UTC slot.");
  }
  if (!summary.latest) {
    recs.push("Pull Insights once to start the follower tracker.");
  }
  if (recs.length === 0) {
    recs.push("Stay consistent: daily Reel, HOW DMs, and comment replies are what compound.");
  }
  return recs.slice(0, 5);
}

export function pickRecycleCandidate(
  posted = [],
  { minAgeDays = 21, usedSourceUrls = new Set() } = {}
) {
  const cutoff = Date.now() - minAgeDays * 86400000;
  const ranked = posted
    .filter((row) => {
      const fields = row.fields || {};
      const postedAt = Date.parse(fields["Posted At"] || row.postedAt || 0);
      const source = String(fields["Source URL"] || row.sourceUrl || "");
      if (!postedAt || postedAt > cutoff) return false;
      if (source && usedSourceUrls.has(source)) return false;
      return postedReach(row) > 0 || Boolean(fields.Caption || row.caption);
    })
    .sort((a, b) => postedReach(b) - postedReach(a));
  return ranked[0] || null;
}

export function recentPostedHooks(posted = [], { withinDays = 7 } = {}) {
  const cutoff = Date.now() - withinDays * 86400000;
  return posted
    .filter((row) => {
      const postedAt = Date.parse(row.fields?.["Posted At"] || row.postedAt || 0);
      return postedAt && postedAt >= cutoff;
    })
    .map((row) => row.fields?.Hook || row.hook)
    .filter(Boolean);
}
