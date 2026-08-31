// Follower tracker — snapshots live in Vercel Blob so Airtable does not need a new table.

import { list, put } from "@vercel/blob";
import { getIgAccountInsights, getIgAccountProfile } from "@/lib/helpers";
import {
  utcDateString,
  summarizeGrowth,
  buildGrowthRecommendations,
  pickRecycleCandidate,
  recentPostedHooks,
} from "@/lib/growth-math";

export {
  utcDateString,
  summarizeGrowth,
  buildGrowthRecommendations,
  pickRecycleCandidate,
  recentPostedHooks,
};

export async function collectAccountGrowth({ token, igUserId }) {
  const profile = await getIgAccountProfile(token, igUserId);
  const insights = await getIgAccountInsights(token, igUserId);
  const values = insights.values || {};
  return {
    date: utcDateString(),
    capturedAt: new Date().toISOString(),
    username: profile.username || null,
    followers: Number(profile.followers_count || 0),
    following: Number(profile.follows_count || 0),
    mediaCount: Number(profile.media_count || 0),
    reach: Number(values.reach || 0),
    views: Number(values.views || values.impressions || 0),
    profileViews: Number(values.profile_views || 0),
    accountsEngaged: Number(values.accounts_engaged || 0),
    totalInteractions: Number(values.total_interactions || 0),
    newFollowers: Number(values.follower_count || 0),
  };
}

export async function loadGrowthHistory() {
  try {
    const { blobs } = await list({ prefix: "growth/", limit: 80 });
    const files = (blobs || [])
      .filter((blob) => String(blob.pathname || "").includes("history"))
      .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
    if (!files[0]) return [];
    const res = await fetch(files[0].url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn("Growth history unavailable:", err.message);
    return [];
  }
}

export async function saveGrowthHistory(snapshot) {
  const history = await loadGrowthHistory();
  const next = history.filter((row) => row.date !== snapshot.date);
  next.push(snapshot);
  next.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const trimmed = next.slice(-60);
  await put("growth/history.json", JSON.stringify(trimmed), {
    access: "public",
    contentType: "application/json",
  });
  return trimmed;
}
