// Shared helpers for the content machine

const AIRTABLE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;
const GRAPH = "https://graph.instagram.com/v21.0";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Reject cron calls that don't come from Vercel (or you, with the secret)
export function checkCronAuth(request) {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export function appBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function airtableList(table, params = "") {
  const res = await fetch(`${AIRTABLE_URL}/${encodeURIComponent(table)}?${params}`, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
  });
  if (!res.ok) throw new Error(`Airtable list failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.records || [];
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

export async function generateGeminiImage(promptText) {
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
  if (!imgRes.ok) throw new Error(`Gemini image failed: ${imgRes.status} ${await imgRes.text()}`);
  const imgData = await imgRes.json();
  const imagePart = imgData.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!imagePart) throw new Error("Gemini returned no image");
  return {
    buffer: Buffer.from(imagePart.inlineData.data, "base64"),
    mimeType: imagePart.inlineData.mimeType || "image/png",
  };
}

// Generate a vertical Reel with Veo (Gemini API long-running operation)
export async function generateVeoReel(prompt, { aspectRatio = "9:16", model = "veo-3.1-fast-generate-preview" } = {}) {
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
  if (!startRes.ok) throw new Error(`Veo start failed: ${startRes.status} ${await startRes.text()}`);
  const startData = await startRes.json();
  const operationName = startData.name;
  if (!operationName) throw new Error(`Veo returned no operation: ${JSON.stringify(startData)}`);

  // Poll until done (Veo often takes 30–120s)
  let statusData;
  for (let attempt = 0; attempt < 36; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));
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

export function queueTypeFilter(type) {
  if (type === "Feed") {
    return encodeURIComponent(`AND({Status}="Ready", OR({Type}="Feed", {Type}=BLANK()))`);
  }
  return encodeURIComponent(`AND({Status}="Ready", {Type}="${type}")`);
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
    // Older bases without Type: Feed falls back to any Ready row; Reel/Carousel return empty
    if (type === "Feed") {
      return airtableList(
        "Queue",
        "maxRecords=1&filterByFormula=" + encodeURIComponent(`{Status}="Ready"`)
      );
    }
    return [];
  }
}

// Create Queue rows. Feed can degrade if growth fields are missing; Reel/Carousel cannot.
export async function airtableCreateQueue(fields) {
  const optionalForFeed = ["Type", "Video URL", "Cover URL", "First Comment", "Slide URLs"];
  try {
    return await airtableCreate("Queue", [fields]);
  } catch (err) {
    const msg = String(err.message || "");
    if (!msg.includes("UNKNOWN_FIELD_NAME")) throw err;
    if (fields.Type && fields.Type !== "Feed") {
      throw new Error(
        `Airtable Queue is missing growth fields required for ${fields.Type}. Add: Type, Video URL, Cover URL, First Comment, Slide URLs. See AIRTABLE_SETUP.md`
      );
    }
    const stripped = { ...fields };
    for (const key of optionalForFeed) delete stripped[key];
    console.warn(
      "Queue missing optional growth fields — created Feed with core fields only. Add Type/Video URL/Cover URL/First Comment/Slide URLs in Airtable."
    );
    return airtableCreate("Queue", [stripped]);
  }
}
