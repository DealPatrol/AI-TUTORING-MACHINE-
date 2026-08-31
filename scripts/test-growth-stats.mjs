import assert from "node:assert/strict";
import {
  summarizeGrowth,
  buildGrowthRecommendations,
  pickRecycleCandidate,
  recentPostedHooks,
  utcDateString,
} from "../lib/growth-math.js";
import { PLAYBOOK_RE, pickCommunityReply, looksLikeQuestion } from "../lib/growth.js";

function daysAgo(days, extra = {}) {
  return {
    id: `rec-${days}`,
    fields: {
      Hook: extra.hook || `Old tip ${days}`,
      Caption: extra.caption || "A useful AI tip",
      "Posted At": new Date(Date.now() - days * 86400000).toISOString(),
      "Source URL": extra.source || `https://ig/${days}`,
      Reach: extra.reach ?? 0,
      Saves: extra.saves ?? 0,
      Type: extra.type || "Feed",
    },
  };
}

const history = [
  { date: "2026-08-20", followers: 1000, reach: 400, profileViews: 20, accountsEngaged: 12 },
  { date: "2026-08-27", followers: 1042, reach: 620, profileViews: 35, accountsEngaged: 18 },
];
const posted = [
  { type: "Reel", reach: 900, saves: 8, plays: 1200 },
  { type: "Reel", reach: 700, saves: 3, plays: 800 },
  { type: "Carousel", reach: 300, saves: 12, plays: 0 },
  { type: "Feed", reach: 120, saves: 1, plays: 0 },
];

const summary = summarizeGrowth(history, posted);
assert.equal(summary.latest.followers, 1042);
assert.equal(summary.followerDelta7d, 42);
assert.equal(summary.bestFormat.type, "Reel");
assert.equal(summary.bestFormat.avgReach, 800);

const recs = buildGrowthRecommendations({
  posted,
  summary,
  readyReels: 0,
  readyFeed: 1,
});
assert.ok(recs.some((r) => r.includes("+42 followers")));
assert.ok(recs.some((r) => r.includes("Reels are your top format")));
assert.ok(recs.some((r) => r.includes("No Ready Reel")));

const winner = pickRecycleCandidate(
  [daysAgo(5, { reach: 999, hook: "too new" }), daysAgo(25, { reach: 80, hook: "proven" })],
  { minAgeDays: 21 }
);
assert.equal(winner.fields.Hook, "proven");

const skippedUsed = pickRecycleCandidate(
  [daysAgo(30, { reach: 500, source: "https://ig/used", hook: "used" })],
  { minAgeDays: 21, usedSourceUrls: new Set(["https://ig/used"]) }
);
assert.equal(skippedUsed, null);

const hooks = recentPostedHooks(
  [daysAgo(2, { hook: "fresh" }), daysAgo(20, { hook: "stale" })],
  { withinDays: 7 }
);
assert.deepEqual(hooks, ["fresh"]);

assert.equal(utcDateString(new Date("2026-08-31T12:00:00.000Z")), "2026-08-31");

assert.ok(PLAYBOOK_RE.test("HOW"));
assert.ok(PLAYBOOK_RE.test("tip"));
assert.ok(!PLAYBOOK_RE.test("how do I do this exactly"));
assert.ok(looksLikeQuestion("How do I write better prompts?"));
assert.ok(!looksLikeQuestion("love this"));
assert.equal(pickCommunityReply("  Short useful reply here  "), "Short useful reply here");
assert.ok(pickCommunityReply("").length > 0);

console.log("growth-stats tests passed");
