import assert from "node:assert/strict";
import {
  GEMINI_TEXT_MODELS,
  createFallbackImage,
  generateGeminiImage,
  generateGeminiImageWithFallback,
  likeIgComment,
  rewriteJson,
} from "../lib/helpers.js";
import { buildEmergencyGrowthContent } from "../lib/growth.js";

process.env.GEMINI_API_KEY = "test-key";
process.env.GEMINI_TEXT_MODELS = "gemini-3.5-flash-lite";
process.env.GEMINI_IMAGE_MODELS = "gemini-3.1-flash-image";
delete process.env.ANTHROPIC_API_KEY;

assert(!GEMINI_TEXT_MODELS.some((model) => model.startsWith("gemini-2.0")));
assert.equal(GEMINI_TEXT_MODELS[0], "gemini-3.5-flash-lite");

const fallback = createFallbackImage({ width: 64, height: 80 });
assert.equal(fallback.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
assert.equal(fallback.readUInt32BE(16), 64);
assert.equal(fallback.readUInt32BE(20), 80);

let imageCalls = 0;
global.fetch = async () => {
  imageCalls += 1;
  return new Response(
    JSON.stringify({ error: { message: "PerDay image quota exhausted" } }),
    { status: 429 }
  );
};
await assert.rejects(
  generateGeminiImage("image", { retries: 3 }),
  /Gemini image failed .*429/
);
assert.equal(imageCalls, 1, "daily quota failures must skip pointless retries");

const fallbackResult = await generateGeminiImageWithFallback("image", {
  retries: 1,
  width: 32,
  height: 48,
});
assert.equal(fallbackResult.fallback, true);
assert.equal(fallbackResult.mimeType, "image/png");
assert.equal(fallbackResult.buffer.readUInt32BE(16), 32);
assert.equal(fallbackResult.buffer.readUInt32BE(20), 48);

const expected = {
  hook: "Specific hook",
  subtext: "Useful detail",
  caption: "Caption",
  firstComment: "Comment",
  topicTag: "#aitips",
  storyText: "Try this",
  bonusPrompt: "A complete reusable prompt template",
};
let textCalls = 0;
global.fetch = async (_url, init) => {
  textCalls += 1;
  const request = JSON.parse(init.body);
  assert.equal(request.generationConfig.responseMimeType, "application/json");
  const text =
    textCalls === 1
      ? '{"hook":"Specific hook","caption":"bad "quote""}'
      : JSON.stringify(expected);
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
    { status: 200 }
  );
};
assert.deepEqual(await rewriteJson("Return the existing schema", { attempts: 2 }), expected);
assert.equal(textCalls, 2, "invalid JSON must trigger one bounded regeneration");

textCalls = 0;
global.fetch = async (url, init) => {
  textCalls += 1;
  const text =
    textCalls === 1
      ? JSON.stringify({ hook: "Missing caption" })
      : JSON.stringify(expected);
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status: 200 }
  );
};
assert.deepEqual(
  await rewriteJson("Return required keys", {
    attempts: 2,
    requiredKeys: ["hook", "caption"],
  }),
  expected
);
assert.equal(textCalls, 2, "missing schema keys must trigger one bounded regeneration");

for (const format of ["feed", "reel", "carousel"]) {
  const emergency = buildEmergencyGrowthContent(format);
  assert.ok(emergency.hook);
  assert.ok(emergency.caption);
  assert.ok(emergency.bonusPrompt);
}
assert.equal(buildEmergencyGrowthContent("carousel").slides.length, 7);
assert.equal(buildEmergencyGrowthContent("reel").voiceoverSegments.length, 2);

let likeRequest;
global.fetch = async (url, init) => {
  likeRequest = { url: String(url), body: JSON.parse(init.body) };
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
process.env.IG_ACCESS_TOKEN = "IGQ-test-token";
await likeIgComment({
  igUserId: "ig-user-123",
  commentId: "comment-456",
  token: "IGQ-test-token",
});
assert.match(likeRequest.url, /\/ig-user-123\/likes$/);
assert.equal(likeRequest.body.comment_id, "comment-456");

console.log("generation resilience tests passed");
