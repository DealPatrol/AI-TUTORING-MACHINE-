// INSIGHTS — pull reach/saves/plays for recent posts so the dashboard shows what grows followers.

import {
  checkCronAuth,
  airtableList,
  getIgMediaInsights,
  safeAirtableUpdate,
  getIgCredentials,
} from "@/lib/helpers";

export const maxDuration = 60;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = getIgCredentials();
  if (!token) {
    return Response.json({ error: "IG_ACCESS_TOKEN missing" }, { status: 400 });
  }

  try {
    const posted = await airtableList(
      "Queue",
      "filterByFormula=" +
        encodeURIComponent(`AND({Status}="Posted", {IG Media ID}!="")`) +
        "&maxRecords=12&sort%5B0%5D%5Bfield%5D=Posted+At&sort%5B0%5D%5Bdirection%5D=desc"
    );

    const updated = [];
    for (const row of posted) {
      const mediaId = row.fields["IG Media ID"];
      const type = row.fields.Type || "Feed";

      const metrics =
        type === "Reel"
          ? ["reach", "saved", "shares", "likes", "comments", "plays"]
          : ["reach", "saved", "shares", "likes", "comments"];

      let result = await getIgMediaInsights(mediaId, token, metrics);
      if (result.error && type === "Reel") {
        result = await getIgMediaInsights(mediaId, token, ["reach", "saved", "plays"]);
      }
      if (result.error) {
        console.warn("Insights skip", mediaId, result.error);
        continue;
      }

      const v = result.values || {};
      await safeAirtableUpdate("Queue", row.id, {
        Reach: Number(v.reach || 0),
        Saves: Number(v.saved || 0),
        Shares: Number(v.shares || 0),
        Plays: Number(v.plays || 0),
      });
      updated.push({
        id: row.id,
        hook: row.fields.Hook,
        reach: v.reach || 0,
        saves: v.saved || 0,
        plays: v.plays || 0,
      });
    }

    updated.sort((a, b) => (b.reach || 0) - (a.reach || 0));
    return Response.json({ ok: true, updated: updated.length, top: updated.slice(0, 5) });
  } catch (err) {
    console.error("Insights cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
