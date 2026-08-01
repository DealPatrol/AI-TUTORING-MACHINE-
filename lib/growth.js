// Growth playbook for Instagram reach: hooks, CTAs, hashtags, reel/carousel formulas.

export const BRAND_VOICE = `
You write for an Instagram account that teaches AI tools and concepts to
beginners. Voice: friendly, plain-English, zero jargon, a little playful.
Every post teaches ONE concrete thing the reader can use today.
Growth priority: stop the scroll, earn a save or comment, then a follow.
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

export const GROWTH_CTA_LINES = [
  "Follow for one AI tip every day.",
  "Save this so you can try it later.",
  "Share this with someone learning AI.",
  "Comment TIP and I'll reply with a bonus prompt.",
];

export function buildFirstComment({ topicTag = "#aitips", cta } = {}) {
  const line = cta || GROWTH_CTA_LINES[Math.floor(Math.random() * GROWTH_CTA_LINES.length)];
  const tags = [...CORE_HASHTAGS];
  if (topicTag && !tags.includes(topicTag)) tags.unshift(topicTag);
  return `${line}\n\n${tags.slice(0, 8).join(" ")}`;
}

export function feedGrowthPrompt(sourceCaption) {
  return `${BRAND_VOICE}
Below is a post that performed well in this niche. Do NOT copy it.
Extract the underlying idea, then write a completely original post on the
same topic, optimized for Instagram growth.

Growth rules:
- Hook must create curiosity or a pattern interrupt in under 8 words
- Caption opens with the hook again (first line), then teaches the tip
- End with ONE question that is easy to answer in a comment
- Include a soft follow CTA ("Follow for daily AI tips")
- Include exactly 5 niche hashtags at the end of the caption
- Sound human. No corporate tone. No "In this post I'll..."

Respond with ONLY valid JSON, no markdown fences:
{
  "hook": "short punchy headline for the image, max 8 words",
  "subtext": "one supporting line for the image, max 15 words",
  "caption": "full Instagram caption, 100-160 words",
  "firstComment": "short CTA + 5-8 hashtags for the first comment",
  "topicTag": "one primary hashtag like #chatgpt"
}

Source post caption:
"""${sourceCaption || ""}"""`;
}

export function reelGrowthPrompt(sourceCaption) {
  return `${BRAND_VOICE}
Write an original 8-second Instagram Reel script based on the idea below
(do NOT copy wording). Optimized for Reels discovery and follows.

Structure:
1. 0-1s HOOK: pattern interrupt / bold claim (spoken + on screen)
2. 1-6s VALUE: one concrete tip in simple steps
3. 6-8s CTA: ask for follow or comment

Respond with ONLY valid JSON, no markdown fences:
{
  "hook": "max 8 words, on-screen hook",
  "beats": ["on-screen line 1", "on-screen line 2", "on-screen line 3"],
  "voiceover": "full spoken script for ~8 seconds, energetic teacher voice",
  "caption": "Instagram caption under 400 chars, ends with a question + 5 hashtags",
  "firstComment": "CTA line + 5-8 hashtags",
  "videoPrompt": "detailed Veo prompt describing a vertical 9:16 motion-graphics Reel: soft cream background, bold dark charcoal kinetic typography showing the hook and beats exactly, small friendly robot mascot in the corner, flat modern design, no photoreal people, native voiceover reading the script, subtle upbeat background music, high energy, Instagram Reel style",
  "coverText": "cover frame headline, max 6 words"
}

Source idea:
"""${sourceCaption || ""}"""`;
}

export function carouselGrowthPrompt(sourceCaption) {
  return `${BRAND_VOICE}
Create an original Instagram carousel that people will SAVE.
Based on the idea below (do NOT copy). 5 slides teaching ONE tip.

Respond with ONLY valid JSON, no markdown fences:
{
  "hook": "cover slide headline, max 8 words",
  "slides": [
    { "headline": "slide 1 cover hook", "body": "short supporting line" },
    { "headline": "slide 2", "body": "teaching point" },
    { "headline": "slide 3", "body": "teaching point" },
    { "headline": "slide 4", "body": "teaching point / example" },
    { "headline": "slide 5 CTA", "body": "Follow for daily AI tips + save this" }
  ],
  "caption": "caption 120-180 words, ask a question, soft follow CTA, 5 hashtags",
  "firstComment": "CTA + 5-8 hashtags"
}

Source idea:
"""${sourceCaption || ""}"""`;
}
