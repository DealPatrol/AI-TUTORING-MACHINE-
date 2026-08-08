// Shared helpers for the content machine

const AIRTABLE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;
const GRAPH = "https://graph.instagram.com/v21.0";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Reject cron calls that don't come from Vercel (or you, with the secret)
export function checkCronAuth(request) {
  const auth = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  return (
    auth === `Bearer ${expected}` ||
    cronSecret === expected
  );
}

export function appBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function parseUnknownFieldName(message) {
  const msg = String(message || "");
  // Airtable formats vary: Unknown field name: "Foo" | Unknown field name: Foo
  const match =
    msg.match(/Unknown field name:?\s*"([^"]+)"/i) ||
    msg.match(/Unknown field name:?\s*\\?"([^"\\]+)\\?"/i) ||
    msg.match(/Unknown field name:?\s*([A-Za-z0-9 _/-]+)/i);
  return match?.[1]?.trim() || null;
}

export async function airtableList(table, params = "", { paginate = false, maxRecords = null } = {}) {
  const records = [];
  let offset;
  do {
    const join = params ? `${params}&` : "";
    const page = offset ? `${join}offset=${encodeURIComponent(offset)}` : params;
    const res = await fetch(`${AIRTABLE_URL}/${encodeURIComponent(table)}?${page}`, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    });
    if (!res.ok) throw new Error(`Airtable list failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
    if (!paginate) break;
    if (maxRecords && records.length >= maxRecords) {
      return records.slice(0, maxRecords);
    }
  } while (offset);
  return records;
}

export async function airtableCreate(table, records) {
  // Airtable allows max 10 records per request
  const created = [];
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10).map((fields) => ({ fields }));
    const res = await fetch(`${AIRTABLE_URL}/${encodeURIComponent(table)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: batch }),
    });
    if (!res.ok) throw new Error(`Airtable create failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    created.push(...data.records);
  }
  return created;
}

export async function airtableUpdate(table, recordId, fields) {
  const res = await fetch(`${AIRTABLE_URL}/${encodeURIComponent(table)}/${recordId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Airtable update failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Call Claude to rewrite copy. Docs: https://docs.claude.com/en/api/overview
export async function claudeRewrite(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

// Gemini text rewrite — used when Claude credits are exhausted. Rate limits
// are per model, so rotate through several models before giving up.
const GEMINI_TEXT_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
];

export async function geminiRewrite(prompt, { retries = 2 } = {}) {
  let lastErr;
  for (const model of GEMINI_TEXT_MODELS) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(
          `${GEMINI_BASE}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );
        if (res.status === 429) {
          const detail = (await res.text()).slice(0, 400);
          lastErr = new Error(`Gemini rate limited (429) on ${model}: ${detail}`);
          console.warn(lastErr.message);
          // Daily-quota 429s won't clear with backoff — jump to the next model
          if (/PerDay|daily/i.test(detail)) break;
          await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
          continue;
        }
        if (!res.ok) throw new Error(`Gemini rewrite failed (${model}): ${res.status} ${await res.text()}`);
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error(`Gemini returned no text (${model})`);
        return text;
      } catch (err) {
        lastErr = err;
        if (err.message.includes("429")) continue;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

// Prefer Claude; fall back to Gemini so generate crons keep working without Anthropic credits.
export async function rewriteCopy(prompt) {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await claudeRewrite(prompt);
    } catch (err) {
      console.warn("Claude rewrite failed, falling back to Gemini:", err.message);
    }
  }
  return geminiRewrite(prompt);
}

export function parseClaudeJson(raw) {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Claude returned non-JSON content");
    return JSON.parse(match[0]);
  }
}

export async function generateGeminiImage(promptText, { retries = 3 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const imgRes = await fetch(
        `${GEMINI_BASE}/models/gemini-2.5-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
          }),
        }
      );
      if (imgRes.status === 429) {
        lastErr = new Error(`Gemini image rate limited (429)`);
        await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
        continue;
      }
      if (!imgRes.ok) throw new Error(`Gemini image failed: ${imgRes.status} ${await imgRes.text()}`);
      const imgData = await imgRes.json();
      const imagePart = imgData.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (!imagePart) throw new Error("Gemini returned no image");
      return {
        buffer: Buffer.from(imagePart.inlineData.data, "base64"),
        mimeType: imagePart.inlineData.mimeType || "image/png",
      };
    } catch (err) {
      lastErr = err;
      if (attempt === retries - 1) break;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// Generate a vertical Reel with Veo (Gemini API long-running operation).
// attempts/delayMs are tunable so callers can keep total runtime inside the
// serverless maxDuration limit (default here ~ 18 * 5s = 90s per model).
export async function generateVeoReel(
  prompt,
  { aspectRatio = "9:16", model = "veo-3.1-fast-generate-preview", attempts = 18, delayMs = 5000 } = {}
) {
  const startRes = await fetch(`${GEMINI_BASE}/models/${model}:predictLongRunning`, {
    method: "POST",
    headers: {
      "x-goog-api-key": process.env.GEMINI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { aspectRatio },
    }),
  });
  if (!startRes.ok) throw new Error(`Veo start failed (${model}): ${startRes.status} ${await startRes.text()}`);
  const startData = await startRes.json();
  const operationName = startData.name;
  if (!operationName) throw new Error(`Veo returned no operation: ${JSON.stringify(startData)}`);

  // Poll until done (Veo often takes 30–120s)
  let statusData;
  for (let attempt = 0; attempt < attempts; attempt++) {
    await new Promise((r) => setTimeout(r, delayMs));
    const statusRes = await fetch(`${GEMINI_BASE}/${operationName}`, {
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY },
    });
    if (!statusRes.ok) throw new Error(`Veo poll failed: ${statusRes.status} ${await statusRes.text()}`);
    statusData = await statusRes.json();
    if (statusData.done) break;
  }
  if (!statusData?.done) throw new Error("Veo video did not finish in time");
  if (statusData.error) throw new Error(`Veo error: ${JSON.stringify(statusData.error)}`);

  const sample =
    statusData.response?.generateVideoResponse?.generatedSamples?.[0] ||
    statusData.response?.generatedVideos?.[0] ||
    statusData.response?.generated_videos?.[0];
  const videoUri = sample?.video?.uri || sample?.video?.url || sample?.uri;
  if (!videoUri) {
    throw new Error(`Veo finished but no video URI: ${JSON.stringify(statusData.response || statusData)}`);
  }

  const videoRes = await fetch(videoUri, {
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY },
    redirect: "follow",
  });
  if (!videoRes.ok) throw new Error(`Veo download failed: ${videoRes.status}`);
  const arrayBuffer = await videoRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Try primary + fallback Veo models so a single model outage doesn't kill daily
// Reels. An overall time budget guarantees we never blow past the function's
// maxDuration: we stop starting new model attempts once we're low on time,
// and shrink each model's poll window to whatever budget remains.
export async function generateVeoReelWithFallback(
  prompt,
  { aspectRatio = "9:16", perModelAttempts = 18, delayMs = 5000, overallBudgetMs = 200000 } = {}
) {
  const models = [
    process.env.VEO_MODEL || "veo-3.1-fast-generate-preview",
    "veo-3.1-lite-generate-preview",
    "veo-3.0-fast-generate-001",
  ].filter((m, i, arr) => arr.indexOf(m) === i);

  const errors = [];
  const startedAt = Date.now();

  for (const model of models) {
    const remaining = overallBudgetMs - (Date.now() - startedAt);
    // Need enough time for start + a few polls + download to bother trying.
    if (remaining < 4 * delayMs) {
      console.warn(
        `[v0] Veo time budget nearly spent (${Math.round(remaining / 1000)}s left) — skipping remaining models`
      );
      break;
    }
    // Cap this model's polling to fit the remaining budget.
    const attempts = Math.max(3, Math.min(perModelAttempts, Math.floor((remaining - delayMs) / delayMs)));
    try {
      const buffer = await generateVeoReel(prompt, { aspectRatio, model, attempts, delayMs });
      return { buffer, model };
    } catch (err) {
      console.warn(`[v0] Veo model ${model} failed:`, err.message);
      errors.push(`${model}: ${err.message}`);
    }
  }

  console.error(`[v0] ALL VEO MODELS FAILED — carousel fallback will run. ${errors.join(" | ")}`);
  throw new Error(`All Veo models failed. ${errors.join(" | ")}`);
}

// Best-effort refill of the Winners table by re-running research (pulls the
// latest Apify dataset). Short timeout so it never eats the reel-gen budget;
// callers fall back to an evergreen topic if this doesn't produce a winner.
export async function tryRefillWinners({ timeoutMs = 25000 } = {}) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${appBaseUrl()}/api/cron/research`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch (err) {
    console.warn("[v0] Winner refill failed/timed out:", err.message);
    return false;
  }
}

export async function getTipDayNumber() {
  // Calendar streak: same UTC day always shares one Day N (feed + reel + carousel).
  // Override start with TIP_STREAK_START=YYYY-MM-DD in env.
  try {
    const startStr = process.env.TIP_STREAK_START || "2026-08-01";
    const start = Date.UTC(
      Number(startStr.slice(0, 4)),
      Number(startStr.slice(5, 7)) - 1,
      Number(startStr.slice(8, 10))
    );
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const day = Math.floor((today - start) / 86400000) + 1;
    return day > 0 ? day : 1;
  } catch {
    return 1;
  }
}

export async function claimNextWinner() {
  const winners = await airtableList(
    "Winners",
    "maxRecords=1&filterByFormula=" + encodeURIComponent(`{Status}="New"`)
  );
  if (winners.length === 0) return null;
  const winner = winners[0];
  // Claim immediately so parallel generate jobs don't steal the same winner
  try {
    await airtableUpdate("Winners", winner.id, { Status: "Processing" });
  } catch (err) {
    const msg = String(err.message || "");
    if (msg.includes("INVALID_MULTIPLE_CHOICE_OPTIONS")) {
      // Base missing Processing option — fall back to Used so others won't pick it
      await airtableUpdate("Winners", winner.id, { Status: "Used" });
      winner._claimedAsUsed = true;
    } else {
      throw err;
    }
  }
  return winner;
}

export async function releaseWinner(winnerId) {
  try {
    await airtableUpdate("Winners", winnerId, { Status: "New" });
  } catch (err) {
    console.warn("Could not release winner back to New:", err.message);
  }
}

export async function markWinnerUsed(winnerId) {
  try {
    await airtableUpdate("Winners", winnerId, { Status: "Used" });
  } catch (err) {
    console.warn("Could not mark winner Used:", err.message);
  }
}

export async function safeAirtableUpdate(table, recordId, fields) {
  let attempt = { ...fields };
  const coreKeys = ["Status", "Posted At", "IG Media ID", "Last Error"];
  for (let i = 0; i < 12; i++) {
    try {
      return await airtableUpdate(table, recordId, attempt);
    } catch (err) {
      const msg = String(err.message || "");
      if (msg.includes("INVALID_MULTIPLE_CHOICE_OPTIONS") && attempt.Status === "Failed") {
        // NEVER mislabel a failure as "Posted" (that permanently consumed rows).
        // If the base has no "Failed" Status option, drop the Status write but
        // still persist Retry Count + Last Error, and warn loudly to add it.
        console.warn(
          '[v0] Airtable is missing a "Failed" Status option — add it so exhausted rows stop retrying. Keeping Retry Count / Last Error without changing Status.'
        );
        delete attempt.Status;
        delete attempt["Posted At"];
        continue;
      }
      if (msg.includes("INVALID_MULTIPLE_CHOICE_OPTIONS") && attempt.Status === "Processing") {
        delete attempt.Status;
        continue;
      }
      if (!msg.includes("UNKNOWN_FIELD_NAME")) throw err;
      const unknown = parseUnknownFieldName(msg);
      if (!unknown || !(unknown in attempt)) {
        // Never drop core publish fields silently — retry with only core keys
        const coreOnly = {};
        for (const k of coreKeys) {
          if (k in fields) coreOnly[k] = fields[k];
        }
        if (Object.keys(coreOnly).length && JSON.stringify(coreOnly) !== JSON.stringify(attempt)) {
          attempt = coreOnly;
          continue;
        }
        console.warn("Airtable update skipped:", msg);
        return null;
      }
      if (coreKeys.includes(unknown)) {
        console.warn(`Core field missing in Airtable (${unknown}); continuing without it`);
      }
      delete attempt[unknown];
    }
  }
  return null;
}

export const MAX_QUEUE_RETRIES = 3;

// Mark a Queue row as failed for this attempt. Instead of permanently consuming
// the row, send it BACK to "Ready" so the next poster run retries it, tracking
// a "Retry Count". Only after MAX_QUEUE_RETRIES do we set the terminal "Failed"
// state. Pass the row's current Retry Count so the counter advances correctly.
export async function markQueueFailed(recordId, errorMessage, { retryCount = 0, maxRetries = MAX_QUEUE_RETRIES } = {}) {
  if (!recordId) return;
  const nextCount = Number(retryCount || 0) + 1;
  const exhausted = nextCount >= maxRetries;
  await safeAirtableUpdate("Queue", recordId, {
    Status: exhausted ? "Failed" : "Ready",
    "Retry Count": nextCount,
    "Last Error": `${exhausted ? "[FINAL] " : `[retry ${nextCount}/${maxRetries}] `}${String(
      errorMessage || "Unknown error"
    )}`.slice(0, 1000),
  });
}

export async function waitForIgContainer(containerId, token, { attempts = 30, delayMs = 3000 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const statusRes = await fetch(
      `${GRAPH}/${containerId}?fields=status_code&access_token=${token}`
    );
    const status = await statusRes.json();
    if (status.status_code === "FINISHED") return true;
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(`Container processing failed: ${JSON.stringify(status)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error("Container did not finish processing in time");
}

export async function publishIgContainer(creationId, token, igUserId) {
  const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: token,
    }),
  });
  const published = await publishRes.json();
  if (!published.id) throw new Error(`Publish failed: ${JSON.stringify(published)}`);
  return published;
}

export async function postIgFirstComment(mediaId, message, token) {
  if (!message || !mediaId) return null;
  const res = await fetch(`${GRAPH}/${mediaId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: message.slice(0, 2200),
      access_token: token,
    }),
  });
  const data = await res.json();
  // Don't fail the whole post if commenting is blocked
  if (!res.ok || data.error) {
    console.warn("First comment failed:", data);
    return null;
  }
  return data;
}

export async function listIgComments(mediaId, token) {
  const res = await fetch(
    `${GRAPH}/${mediaId}/comments?fields=id,text,username,timestamp&access_token=${token}`
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    console.warn("List comments failed:", data);
    return [];
  }
  return data.data || [];
}

export async function replyIgComment(commentId, message, token) {
  const res = await fetch(`${GRAPH}/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: message.slice(0, 2200),
      access_token: token,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Reply failed: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function getIgMediaInsights(mediaId, token, metrics = ["reach", "saved", "shares", "likes", "comments"]) {
  const res = await fetch(
    `${GRAPH}/${mediaId}/insights?metric=${metrics.join(",")}&access_token=${token}`
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    // Reels often need plays instead of some feed metrics — caller may retry
    return { error: data.error || data, values: {} };
  }
  const values = {};
  for (const row of data.data || []) {
    values[row.name] = row.values?.[0]?.value ?? 0;
  }
  return { values };
}

export async function createIgImageContainer({ igUserId, token, imageUrl, caption, isCarouselItem = false }) {
  const body = {
    image_url: imageUrl,
    access_token: token,
  };
  if (isCarouselItem) {
    body.is_carousel_item = true;
  } else {
    body.caption = caption || "";
  }
  const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const container = await containerRes.json();
  if (!container.id) throw new Error(`Image container failed: ${JSON.stringify(container)}`);
  return container;
}

export async function createIgReelContainer({ igUserId, token, videoUrl, caption, coverUrl, shareToFeed = true }) {
  const body = {
    media_type: "REELS",
    video_url: videoUrl,
    caption: caption || "",
    share_to_feed: shareToFeed,
    access_token: token,
  };
  if (coverUrl) body.cover_url = coverUrl;
  const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const container = await containerRes.json();
  if (!container.id) throw new Error(`Reel container failed: ${JSON.stringify(container)}`);
  return container;
}

export async function createIgCarouselContainer({ igUserId, token, children, caption }) {
  const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "CAROUSEL",
      children: children.join(","),
      caption: caption || "",
      access_token: token,
    }),
  });
  const container = await containerRes.json();
  if (!container.id) throw new Error(`Carousel container failed: ${JSON.stringify(container)}`);
  return container;
}

export async function createIgStoryContainer({ igUserId, token, imageUrl, videoUrl }) {
  const body = {
    media_type: "STORIES",
    access_token: token,
  };
  if (videoUrl) body.video_url = videoUrl;
  else body.image_url = imageUrl;
  const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const container = await containerRes.json();
  if (!container.id) throw new Error(`Story container failed: ${JSON.stringify(container)}`);
  return container;
}

// Publish a Story from an image (or video). Failures are logged, not thrown — Stories are bonus reach.
export async function publishIgStory({ igUserId, token, imageUrl, videoUrl }) {
  if (!imageUrl && !videoUrl) return null;
  try {
    const container = await createIgStoryContainer({ igUserId, token, imageUrl, videoUrl });
    await waitForIgContainer(container.id, token, { attempts: 20, delayMs: 2000 });
    return await publishIgContainer(container.id, token, igUserId);
  } catch (err) {
    console.warn("Story publish skipped:", err.message);
    return null;
  }
}

export function queueTypeFilter(type) {
  if (type === "Feed") {
    return encodeURIComponent(`AND({Status}="Ready", OR({Type}="Feed", {Type}=BLANK()))`);
  }
  return encodeURIComponent(`AND({Status}="Ready", {Type}="${type}")`);
}

async function listReadyByStatusOnly() {
  return airtableList(
    "Queue",
    "filterByFormula=" + encodeURIComponent(`{Status}="Ready"`),
    { paginate: true }
  );
}

export async function listReadyQueue(type) {
  try {
    return await airtableList("Queue", "maxRecords=1&filterByFormula=" + queueTypeFilter(type));
  } catch (err) {
    const msg = String(err.message || "");
    const missingType =
      msg.includes("Unknown field names") ||
      msg.includes("UNKNOWN_FIELD_NAME") ||
      msg.includes("INVALID_FILTER_BY_FORMULA");
    if (!missingType) throw err;

    // Production bases often lack Type — still post anything Ready so IG doesn't go silent.
    const ready = await listReadyByStatusOnly();
    if (type === "Reel") {
      const withVideo = ready.filter((r) => r.fields["Video URL"]);
      return withVideo.length ? [withVideo[0]] : [];
    }
    if (type === "Carousel") {
      const withSlides = ready.filter((r) => r.fields["Slide URLs"]);
      return withSlides.length ? [withSlides[0]] : [];
    }
    // Feed / default: only take image posts without a video URL so reel cron can take videos
    const feedLike = ready.filter((r) => r.fields["Image URL"] && !r.fields["Video URL"]);
    return feedLike.length ? [feedLike[0]] : [];
  }
}

// Next Ready row for legacy Sequence-based crons (works even if Sequence field is missing)
export async function listReadyBySequence(sequence) {
  try {
    return await airtableList(
      "Queue",
      "maxRecords=1&filterByFormula=" +
        encodeURIComponent(
          `AND({Status}="Ready", {Sequence}=${Number(sequence)}, {Video URL}=BLANK())`
        )
    );
  } catch (err) {
    const msg = String(err.message || "");
    if (
      msg.includes("Unknown field names") ||
      msg.includes("UNKNOWN_FIELD_NAME") ||
      msg.includes("INVALID_FILTER_BY_FORMULA")
    ) {
      try {
        const ready = await airtableList(
          "Queue",
          "filterByFormula=" +
            encodeURIComponent(`AND({Status}="Ready", {Sequence}=${Number(sequence)})`),
          { paginate: true }
        );
        const withoutVideo = ready.filter((r) => !r.fields["Video URL"]);
        return withoutVideo.length ? [withoutVideo[0]] : [];
      } catch (sequenceErr) {
        const sequenceMsg = String(sequenceErr.message || "");
        if (
          !sequenceMsg.includes("Unknown field names") &&
          !sequenceMsg.includes("UNKNOWN_FIELD_NAME") &&
          !sequenceMsg.includes("INVALID_FILTER_BY_FORMULA")
        ) {
          throw sequenceErr;
        }
      }
      const ready = await listReadyByStatusOnly();
      const withImage = ready.filter(
        (r) => r.fields["Image URL"] && !r.fields["Video URL"]
      );
      const record = withImage[Number(sequence) - 1];
      return record ? [record] : [];
    }
    throw err;
  }
}

// Fields that must exist for that content type to be publishable.
// Type itself is optional — post crons infer Reel/Carousel/Feed from Video URL / Slide URLs / Image URL.
const REQUIRED_BY_TYPE = {
  Reel: ["Video URL"],
  Carousel: ["Slide URLs"],
  Feed: ["Image URL"],
};

function isUnknownFieldError(msg) {
  return (
    msg.includes("UNKNOWN_FIELD_NAME") ||
    /Unknown field name/i.test(msg)
  );
}

// Create Queue rows, stripping unknown optional fields until Airtable accepts the row.
export async function airtableCreateQueue(fields) {
  let attempt = { ...fields };
  // Drop undefined values — Airtable rejects them
  for (const key of Object.keys(attempt)) {
    if (attempt[key] === undefined) delete attempt[key];
  }
  const required = REQUIRED_BY_TYPE[fields.Type] || REQUIRED_BY_TYPE.Feed;
  for (let i = 0; i < 12; i++) {
    try {
      return await airtableCreate("Queue", [attempt]);
    } catch (err) {
      const msg = String(err.message || "");
      if (!isUnknownFieldError(msg)) throw err;
      const unknown = parseUnknownFieldName(msg);
      if (!unknown || !(unknown in attempt)) {
        throw new Error(
          `Airtable Queue missing required growth fields for ${fields.Type || "Feed"}. See AIRTABLE_SETUP.md. Original: ${msg}`
        );
      }
      if (required.includes(unknown)) {
        throw new Error(
          `Airtable Queue is missing required field "${unknown}" for ${fields.Type}. Add it before generating ${fields.Type}s. See AIRTABLE_SETUP.md`
        );
      }
      console.warn(`Queue field missing in Airtable, omitting: ${unknown}`);
      delete attempt[unknown];
    }
  }
  throw new Error("Could not create Queue row after stripping unknown fields");
}
