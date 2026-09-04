// HEALTH — pipeline fuel + env checks so silent broken days get caught early.

import {
  checkCronAuth,
  airtableList,
  getTipDayNumber,
  getIgCredentials,
  getGeminiApiKey,
  igGraphBase,
} from "@/lib/helpers";
import { loadPipelineStatuses } from "@/lib/pipeline-status";

export const maxDuration = 30;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const warnings = [];
  const ok = [];
  const geminiKey = getGeminiApiKey();
  const geminiKeyMeta = {
    length: geminiKey.length,
    prefix: geminiKey.slice(0, 4),
    looksLikeGoogleApiKey: geminiKey.startsWith("AIza") && geminiKey.length === 39,
  };

  const envChecks = [
    ["AIRTABLE_API_KEY", process.env.AIRTABLE_API_KEY],
    ["AIRTABLE_BASE_ID", process.env.AIRTABLE_BASE_ID],
    ["ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY],
    ["GEMINI_API_KEY", process.env.GEMINI_API_KEY],
    ["IG_ACCESS_TOKEN", process.env.IG_ACCESS_TOKEN],
    ["IG_USER_ID", process.env.IG_USER_ID],
    ["BLOB_READ_WRITE_TOKEN", process.env.BLOB_READ_WRITE_TOKEN],
    ["CRON_SECRET", process.env.CRON_SECRET],
  ];
  for (const [name, val] of envChecks) {
    if (val) ok.push(`${name} set`);
    else warnings.push(`${name} missing`);
  }

  // Live Instagram token check — catches expired/malformed tokens before post time.
  let igAccount = null;
  let igTokenMeta = null;
  try {
    const { token, igUserId } = getIgCredentials();
    // Shape only — never the token itself. IG tokens start with IGQ/IGAA/EAA and are 100+ chars.
    igTokenMeta = { length: token.length, prefix: token.slice(0, 4), igUserIdLength: igUserId.length };
    if (!token || !igUserId) {
      const missing = [!token && "IG_ACCESS_TOKEN", !igUserId && "IG_USER_ID"].filter(Boolean);
      warnings.push(`IG token check skipped: ${missing.join(" and ")} missing`);
    } else {
      // Query the IG account itself — works on both graph.facebook.com (EAA
      // tokens) and graph.instagram.com (IGQ/IGAA tokens).
      const meRes = await fetch(
        `${igGraphBase()}/${igUserId}?fields=username&access_token=${encodeURIComponent(token)}`
      );
      const me = await meRes.json();
      if (me.username) {
        igAccount = me.username;
        ok.push(`IG token valid (@${me.username})`);
      } else {
        warnings.push(`IG token check failed: ${JSON.stringify(me.error || me).slice(0, 300)}`);
      }
    }
  } catch (err) {
    warnings.push(`IG token check failed: ${err.message}`);
  }

  let stats = {
    winnersWaiting: 0,
    readyFeed: 0,
    readyReels: 0,
    readyCarousels: 0,
    readyFallbacks: 0,
    failed: 0,
    lastPostedAt: null,
    hoursSinceLastPost: null,
    tipDay: 1,
  };
  let generationIssues = [];

  try {
    const [winners, ready, failed, posted] = await Promise.all([
      airtableList("Winners", "filterByFormula=" + encodeURIComponent(`{Status}="New"`)),
      airtableList("Queue", "filterByFormula=" + encodeURIComponent(`{Status}="Ready"`)),
      airtableList(
        "Queue",
        "filterByFormula=" + encodeURIComponent(`{Status}="Failed"`) + "&maxRecords=20"
      ).catch(() => []),
      airtableList(
        "Queue",
        "filterByFormula=" + encodeURIComponent(`{Status}="Posted"`) + "&maxRecords=30"
      ).catch(() => []),
    ]);
    const failedPosted = posted.filter((r) => String(r.fields["Posted At"] || "").startsWith("FAILED:"));
    stats.winnersWaiting = winners.length;
    stats.readyFeed = ready.filter((r) => !r.fields.Type || r.fields.Type === "Feed").length;
    stats.readyReels = ready.filter((r) => r.fields.Type === "Reel").length;
    stats.readyCarousels = ready.filter((r) => r.fields.Type === "Carousel").length;
    const readyWithFallbacks = ready.filter(
      (r) => r.fields["Fallback Used"] || r.fields["Last Error"]
    );
    stats.readyFallbacks = readyWithFallbacks.length;
    generationIssues = readyWithFallbacks.slice(0, 5).map((r) => ({
      id: r.id,
      hook: r.fields.Hook || "Untitled",
      type: r.fields.Type || "Feed",
      error: r.fields["Last Error"] || "Provider fallback used",
    }));
    stats.failed = failed.length + failedPosted.length;
    stats.tipDay = await getTipDayNumber();
    const postedTimes = posted
      .map((r) => Date.parse(r.fields["Posted At"] || ""))
      .filter(Number.isFinite);
    if (postedTimes.length) {
      const latestPostedTime = Math.max(...postedTimes);
      stats.lastPostedAt = new Date(latestPostedTime).toISOString();
      stats.hoursSinceLastPost = Math.floor((Date.now() - latestPostedTime) / 3600000);
    }

    if (stats.winnersWaiting < 3) warnings.push(`Low winners fuel (${stats.winnersWaiting}) — research soon`);
    if (stats.readyReels === 0) warnings.push("No Ready Reel — generate-reel before 18:00 UTC");
    if (stats.readyFeed + stats.readyCarousels === 0) {
      warnings.push("No Ready feed/carousel for 15:00 UTC post");
    }
    if (stats.readyFallbacks > 0) {
      warnings.push(`${stats.readyFallbacks} Ready item(s) used a generation fallback`);
    }
    if (stats.failed > 0) warnings.push(`${stats.failed} Failed queue rows need attention`);
  } catch (err) {
    warnings.push(`Airtable health check failed: ${err.message}`);
  }

  const pipelineStatuses = await loadPipelineStatuses();
  for (const status of Object.values(pipelineStatuses)) {
    if (status.error) {
      warnings.push(
        `Last ${status.operation} ${status.outcome} at ${status.recordedAt}: ${status.error}`
      );
    }
  }

  return Response.json({
    ok: warnings.length === 0,
    tipDay: stats.tipDay,
    igAccount,
    igTokenMeta,
    geminiKeyMeta,
    stats,
    generationIssues,
    pipelineStatuses,
    warnings,
    ready: ok,
  });
}
