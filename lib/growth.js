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
  "Comment TIP and I'll reply with a bonus prompt. Follow so you don't miss it.",
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
- Ask ONE easy comment question (yes/no, 1-word, or "comment TIP")
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
- End with ONE easy comment question — prefer "Comment TIP for a bonus prompt"
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
  "bonusPrompt": "one concrete ChatGPT/AI prompt (1-2 sentences) to send when someone comments TIP"
}

Source post caption:
"""${sourceCaption || ""}"""`;
}

export function reelGrowthPrompt(sourceCaption, dayNumber) {
  const dayLine = dayNumber
    ? `This is Day ${dayNumber}. Put "Day ${dayNumber}" on the cover and mention it once in the voiceover.`
    : "";
  return `${BRAND_VOICE}
Write an original 8-second Instagram Reel script based on the idea below
(do NOT copy wording). Optimized for Reels discovery AND follows.
${dayLine}

Structure:
1. 0-1s HOOK: pattern interrupt / bold claim (spoken + on screen) — this decides if they watch
2. 1-5s VALUE: one concrete tip in simple steps they can use today
3. 5-8s FOLLOW CTA: on-screen "Follow for daily AI tips" + spoken CTA + "Comment TIP"

${FOLLOWER_RULES}

Respond with ONLY valid JSON, no markdown fences:
{
  "hook": "max 8 words, on-screen hook",
  "beats": ["on-screen line 1", "on-screen line 2", "on-screen line 3", "Follow for daily AI tips"],
  "voiceover": "full spoken script for ~8 seconds, energetic teacher voice, ends with follow CTA",
  "caption": "Instagram caption under 400 chars, searchable phrase + question + follow CTA + 5 hashtags",
  "firstComment": "CTA line + 5-8 hashtags",
  "videoPrompt": "detailed Veo prompt describing a vertical 9:16 motion-graphics Reel: soft cream background, bold dark charcoal kinetic typography showing the hook and beats exactly including a final FOLLOW FOR DAILY AI TIPS end card, small friendly robot mascot in the corner, flat modern design, no photoreal people, native voiceover reading the script, subtle upbeat background music, high energy, Instagram Reel style, text must be large and readable on mobile",
  "coverText": "cover frame headline, max 6 words",
  "storyText": "max 6 words for Story overlay",
  "bonusPrompt": "one concrete ChatGPT/AI prompt (1-2 sentences) for TIP comment replies"
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

// Replies when someone comments TIP (engagement → algorithm → follows)
export const BONUS_PROMPT_FALLBACKS = [
  `Try this in ChatGPT: "Act as a productivity coach. Give me a 15-minute plan to finish my most important task today. Ask me 3 clarifying questions first."`,
  `Bonus prompt: "Rewrite this email to be clearer and kinder, keep it under 120 words: [paste email]"`,
  `Bonus prompt: "Explain [topic] like I'm 12, then give me a 3-step checklist to apply it today."`,
  `Bonus prompt: "Turn my rough notes into 5 LinkedIn post hooks. Notes: [paste]"`,
];

export function pickBonusPrompt(preferred) {
  if (preferred && String(preferred).trim().length > 20) return String(preferred).trim();
  return BONUS_PROMPT_FALLBACKS[Math.floor(Math.random() * BONUS_PROMPT_FALLBACKS.length)];
}

export function tipReplyMessage(bonusPrompt, dayNumber) {
  const day = dayNumber ? ` (Day ${dayNumber})` : "";
  return `Here's your bonus prompt${day} 👇\n\n${bonusPrompt}\n\nFollow for tomorrow's tip — I post every day.`;
}
