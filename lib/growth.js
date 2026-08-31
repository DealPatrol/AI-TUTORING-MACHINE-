// Growth playbook for Instagram reach: hooks, CTAs, hashtags, reel/carousel formulas.
// Goal: maximize follows via Reels reach → profile visits → clear follow reason.

export const BRAND_VOICE = `
You write for an Instagram account that teaches AI tools and concepts to
beginners. Voice: friendly, plain-English, zero jargon, a little playful.
Every post teaches ONE concrete thing the reader can use today.
Growth priority (in order): stop the scroll → earn a comment or save →
get a profile visit → convert the follow with a clear "follow for daily AI tips" promise.
`;

// Mix of niche + mid-size discovery tags. Keep captions clean; put extras in first comment.
export const CORE_HASHTAGS = [
  "#aitips",
  "#chatgpt",
  "#learnai",
  "#artificialintelligence",
  "#productivity",
  "#aihacks",
  "#techforbeginners",
  "#promptengineering",
];

// Phrases people actually search on Instagram / Google → Instagram
export const SEARCH_KEYWORDS = [
  "ChatGPT tips",
  "AI for beginners",
  "how to use ChatGPT",
  "prompt engineering",
  "AI productivity hacks",
  "best ChatGPT prompts",
];

// Evergreen topic bank — used when the Winners table is empty so the daily
// Reel is ALWAYS produced (no more silent "skipped: no winners" days).
export const EVERGREEN_TOPICS = [
  "The one ChatGPT prompt that plans your entire day in 30 seconds",
  "Stop writing paragraphs — this 3-word trick gets better ChatGPT answers",
  "Turn any boring PDF into a 5-bullet summary with one prompt",
  "The 'explain like I'm 12' trick that makes AI finally make sense",
  "How to make ChatGPT sound like you, not like a robot",
  "Ask ChatGPT this before any big decision and thank yourself later",
  "The free AI tool that writes your emails in your own voice",
  "3 ChatGPT prompts that save beginners an hour every single day",
  "The 'act as an expert' trick that instantly upgrades every answer",
  "How to use AI to learn any new skill twice as fast",
  "The prompt that turns messy notes into a clean action plan",
  "Never stare at a blank page again — this AI hook generator fixes it",
];

// Rotate the evergreen topic by day so fallback Reels don't repeat back-to-back.
export function pickEvergreenTopic(dayNumber = 0) {
  const n = Number(dayNumber) || 0;
  const len = EVERGREEN_TOPICS.length;
  const i = ((n % len) + len) % len;
  return EVERGREEN_TOPICS[i];
}

export const GROWTH_CTA_LINES = [
  "Follow for one AI tip every day — you'll actually use these.",
  "Save this, then follow so tomorrow's tip finds you.",
  "Comment HOW and I'll DM you the AI playbook. Follow so you don't miss it.",
  "Share this with someone learning AI — and follow for the next tip tomorrow.",
  "Want tip #2 tomorrow? Hit follow — I post one Reel every day.",
];

export function buildFirstComment({ topicTag = "#aitips", cta } = {}) {
  const line = cta || GROWTH_CTA_LINES[Math.floor(Math.random() * GROWTH_CTA_LINES.length)];
  const tags = [...CORE_HASHTAGS];
  if (topicTag && !tags.includes(topicTag)) tags.unshift(topicTag);
  return `${line}\n\n${tags.slice(0, 8).join(" ")}`;
}

const FOLLOWER_RULES = `
Follower-conversion rules (critical):
- Promise a daily value loop: "Follow for 1 AI tip a day"
- Ask for the single keyword "HOW" when offering the AI playbook
- Put 1-2 searchable phrases naturally in the caption (e.g. "ChatGPT tips", "AI for beginners")
- Never beg. Never say "like for more". Sound like a helpful teacher.
- End screen / last line must make following feel useful, not needy
`;

export function feedGrowthPrompt(sourceCaption, dayNumber) {
  const dayLine = dayNumber ? `This is Day ${dayNumber} of daily AI tips. Mention "Day ${dayNumber}" once in the caption.` : "";
  return `${BRAND_VOICE}
Below is a post that performed well in this niche. Do NOT copy it.
Extract the underlying idea, then write a completely original post on the
same topic, optimized to gain Instagram followers fast.
${dayLine}

Growth rules:
- Hook must create curiosity or a pattern interrupt in under 8 words
- Caption opens with the hook again (first line), then teaches the tip
- Include a searchable phrase naturally (ChatGPT tips / AI for beginners / etc.)
- End with the CTA "Comment HOW and I'll DM you the AI playbook"
- Include a clear follow CTA tied to daily tips
- Include exactly 5 niche hashtags at the end of the caption
- Sound human. No corporate tone.
${FOLLOWER_RULES}

Respond with ONLY valid JSON, no markdown fences:
{
  "hook": "short punchy headline for the image, max 8 words",
  "subtext": "one supporting line for the image, max 15 words",
  "caption": "full Instagram caption, 100-160 words",
  "firstComment": "short CTA + 5-8 hashtags for the first comment",
  "topicTag": "one primary hashtag like #chatgpt",
  "storyText": "max 6 words for a Story sticker / overlay driving profile follows",
  "bonusPrompt": "a compact, genuinely useful 3-step AI playbook to send when someone comments HOW"
}

Source post caption:
"""${sourceCaption || ""}"""`;
}

export function reelGrowthPrompt(sourceCaption, dayNumber) {
  const dayLine = dayNumber
    ? `This is Day ${dayNumber}. Put "Day ${dayNumber}" on the cover and mention it once in the voiceover.`
    : "";
  return `${BRAND_VOICE}
Write an original 16-second Instagram Reel script based on the idea below
(do NOT copy wording). Optimized for Reels discovery AND follows.
${dayLine}

Structure:
1. 0-2s HOOK: pattern interrupt / bold claim — this decides if they watch
2. 2-8s VALUE: explain what AI can do and give one concrete useful step
3. 8-14s PAYOFF: show the result and why it matters
4. 14-16s COMMENT CTA: spoken exactly, "Comment HOW and I'll DM you the AI playbook."

${FOLLOWER_RULES}

Respond with ONLY valid JSON, no markdown fences:
{
  "hook": "max 8 words, on-screen hook",
  "beats": ["on-screen line 1", "on-screen line 2", "on-screen line 3", "Follow for daily AI tips"],
  "voiceoverSegments": [
    "clip 1: one complete energetic hook and useful AI step, 10-15 words",
    "clip 2: one complete payoff sentence, 5-10 words, then exactly: Comment HOW and I'll DM you the AI playbook"
  ],
  "caption": "Instagram caption under 500 chars, searchable phrase + useful takeaway + 'Comment HOW for the playbook' + 5 hashtags",
  "firstComment": "Comment HOW for the AI playbook + 5-8 hashtags",
  "visualScenes": [
    "0-2 seconds: wide or medium live-action B-roll that symbolizes the problem without screens, text, or close-ups of hands",
    "2-5 seconds: a different moving shot using environments, camera motion, or self-moving physical props; keep all hands and fingers out of frame",
    "5-8 seconds: a transition or discovery moment with visible movement; hands remain out of frame",
    "8-11 seconds: a new location or angle showing the useful real-world payoff; no screens or text",
    "11-14 seconds: a stronger result or transformation using environment and camera motion",
    "14-16 seconds: a waist-up human reaction for the comment CTA; hands remain out of frame and no one holds an object"
  ],
  "videoPrompt": "a concise cinematic direction for an actual live-action vertical video with three distinct moving physical B-roll shots, people in medium/wide framing, environments and self-moving props, natural lighting, camera movement, and visual storytelling; keep hands and fingers entirely out of frame and never show anyone holding an object; use physical metaphors for digital concepts; never show readable screens, phones, monitors, apps, websites, code, text, UI, static graphics, posters, slideshows, mascots, flat illustrations, or text-only animation",
  "coverText": "cover frame headline, max 6 words",
  "storyText": "max 6 words for Story overlay",
  "bonusPrompt": "a compact, genuinely useful 3-step AI playbook to send when someone comments HOW"
}

Source idea:
"""${sourceCaption || ""}"""`;
}

export function carouselGrowthPrompt(sourceCaption, dayNumber) {
  const dayLine = dayNumber ? `This is Day ${dayNumber}. Label the cover "Day ${dayNumber}".` : "";
  return `${BRAND_VOICE}
Create an original Instagram carousel that people will SAVE (saves drive reach).
Based on the idea below (do NOT copy). 5–6 slides teaching ONE tip.
${dayLine}

${FOLLOWER_RULES}
- Slide 1 must say SWIPE and create curiosity
- Final slide must say Follow for daily AI tips + Save this

Respond with ONLY valid JSON, no markdown fences:
{
  "hook": "cover slide headline, max 8 words",
  "slides": [
    { "headline": "slide 1 cover hook", "body": "short supporting line + SWIPE" },
    { "headline": "slide 2", "body": "teaching point" },
    { "headline": "slide 3", "body": "teaching point" },
    { "headline": "slide 4", "body": "teaching point / example" },
    { "headline": "slide 5", "body": "mistake to avoid or pro tip" },
    { "headline": "Follow for daily AI tips", "body": "Save this · new tip every day" }
  ],
  "caption": "caption 120-180 words, searchable phrase, question, follow CTA, 5 hashtags",
  "firstComment": "CTA + 5-8 hashtags",
  "storyText": "max 6 words for Story overlay",
  "bonusPrompt": "one concrete ChatGPT/AI prompt (1-2 sentences) for TIP comment replies"
}

Source idea:
"""${sourceCaption || ""}"""`;
}

export function storyOverlayPrompt(hook, storyText, dayNumber) {
  const dayLabel = dayNumber ? `Day ${dayNumber}` : "NEW TIP";
  return `Create a vertical Instagram Story graphic, 9:16 portrait (1080x1920 vibe).
Style: soft cream background, bold dark charcoal sans-serif, small friendly robot mascot,
flat modern design, high contrast, readable on mobile in 1 second.
Big headline (render exactly): "${storyText || hook || "Daily AI tip"}"
Smaller line below (render exactly): "Follow for 1 tip a day"
Tiny top label: "${dayLabel}"`;
}

// Delivers a useful mini-playbook when someone comments HOW.
export const BONUS_PROMPT_FALLBACKS = [
  `1) Define one clear outcome. 2) Give AI the context and constraints. 3) Ask for three options, choose one, then request a step-by-step execution plan.`,
  `1) Paste your rough idea. 2) Ask AI to identify the audience, problem, and desired result. 3) Generate a first draft, critique it, then rewrite only the weakest parts.`,
  `1) Ask AI to explain the task simply. 2) Request a three-step checklist with examples. 3) Run the checklist and ask AI to review your result against it.`,
  `1) Collect three examples you like. 2) Ask AI to extract the common structure—not the wording. 3) Create an original version using that structure and your own voice.`,
];

export function pickBonusPrompt(preferred) {
  if (preferred && String(preferred).trim().length > 20) return String(preferred).trim();
  return BONUS_PROMPT_FALLBACKS[Math.floor(Math.random() * BONUS_PROMPT_FALLBACKS.length)];
}

export function tipReplyMessage(bonusPrompt, dayNumber) {
  const day = dayNumber ? ` (Day ${dayNumber})` : "";
  return `Here's your AI playbook${day} 👇\n\n${bonusPrompt}\n\nFollow for tomorrow's playbook — I post every day.`;
}

// Match short keyword replies, not longer comments that happen to contain the word.
// Keep legacy TIP aliases so older Reels continue delivering their promised bonus.
export const PLAYBOOK_RE = /^\s*(how|tip|tips|prompt|send\s*it|bonus|playbook)\s*[.!?]?\s*$/i;

export function communityReplyPrompt(commentText, hook, dayNumber) {
  const day = dayNumber ? `Day ${dayNumber}` : "today's tip";
  return `You reply to Instagram comments for a beginner AI-tips account.
Post hook: "${hook || "daily AI tip"}" (${day}).
Their comment: """${String(commentText || "").slice(0, 280)}"""

Write ONE public reply, max 18 words.
Rules:
- Warm and specific to what they said
- Do NOT include the full playbook or a long tip
- If they asked how/why, give a 5-word hint and say "Comment HOW for the playbook"
- No hashtags, no links, never needy
Respond with ONLY the reply text.`;
}

export const COMMUNITY_REPLY_FALLBACKS = [
  "Glad this helped — follow for tomorrow's tip.",
  "Yes! Save this and try it today.",
  "Love this. Comment HOW and I'll DM the playbook.",
  "This one compounds if you use it daily.",
];

export function pickCommunityReply(preferred) {
  const text = String(preferred || "")
    .replace(/^["']+|["']+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text && text.split(" ").length <= 22 && text.length <= 160) return text;
  return COMMUNITY_REPLY_FALLBACKS[Math.floor(Math.random() * COMMUNITY_REPLY_FALLBACKS.length)];
}

export function looksLikeQuestion(text) {
  const t = String(text || "");
  return /\?/.test(t) || /^(how|what|why|when|where|can|does|is|do|should)\b/i.test(t.trim());
}

export function recycleGrowthPrompt(sourceCaption, originalHook, dayNumber) {
  const dayLine = dayNumber ? `This is Day ${dayNumber}. Mention it once.` : "";
  return `${BRAND_VOICE}
This idea already grew reach. Write a FRESH angle — do not repeat the old hook.
Original hook: "${originalHook || ""}"
${dayLine}

${FOLLOWER_RULES}

Respond with ONLY valid JSON, no markdown fences:
{
  "hook": "new punchy headline, max 8 words",
  "subtext": "one supporting line, max 15 words",
  "caption": "100-160 words, searchable phrase, Comment HOW CTA, follow CTA, 5 hashtags",
  "firstComment": "CTA + 5-8 hashtags",
  "storyText": "max 6 words",
  "bonusPrompt": "3-step AI playbook for HOW comments"
}

Original performing idea:
"""${sourceCaption || ""}"""`;
}

export function weeklyRecapPrompt(hooks, dayNumber) {
  const list = (hooks || []).slice(0, 6).map((h, i) => `${i + 1}. ${h}`).join("\n");
  return `${BRAND_VOICE}
Build a SAVE-THIS weekly recap carousel from this week's tips.
${dayNumber ? `Label it Day ${dayNumber}.` : ""}
Tips:
${list}

${FOLLOWER_RULES}
- Cover must say SWIPE
- One tip per middle slide
- Final slide: Follow + Save

Respond with ONLY valid JSON, no markdown fences:
{
  "hook": "cover headline, max 8 words",
  "slides": [
    { "headline": "This week's AI tips", "body": "Save this · SWIPE" },
    { "headline": "tip", "body": "one line" },
    { "headline": "tip", "body": "one line" },
    { "headline": "tip", "body": "one line" },
    { "headline": "Follow for daily AI tips", "body": "New Reel every day" }
  ],
  "caption": "120-180 words recap, searchable phrase, HOW CTA, 5 hashtags",
  "firstComment": "CTA + hashtags",
  "storyText": "This week's AI tips",
  "bonusPrompt": "3-step playbook combining the week's theme"
}`;
}

export function boostStoryPrompt(hook, dayNumber) {
  const dayLabel = dayNumber ? `Day ${dayNumber}` : "TODAY";
  return `Create a vertical Instagram Story graphic, 9:16 (1080x1920 vibe).
Style: soft cream background, bold dark charcoal sans-serif, small friendly robot mascot,
flat modern design, high contrast, readable in 1 second.
Big headline (render exactly): "${hook || "Today's AI tip"}"
Smaller line (render exactly): "Comment HOW for the playbook"
Tiny top label: "${dayLabel}"
Tiny bottom label: "Follow for 1 tip a day"`;
}
