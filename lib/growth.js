// Growth playbook for Instagram reach: hooks, CTAs, hashtags, reel/carousel formulas.
// Goal: maximize follows via Reels reach → profile visits → clear follow reason.

export const BRAND_VOICE = `
You write for @unlocking__ai, an Instagram account that helps beginners get
useful results from everyday AI tools. Voice: friendly, plain English, zero
jargon, specific, and a little playful. Never sound like a guru or make a
result seem automatic.
Every post teaches ONE copyable prompt or workflow the viewer can use today.
Write with real-use energy: name the input, give the exact instruction, and
show the kind of output it creates. Make it feel like a screen-recorded
demonstration even when the visuals must use B-roll.
Hooks may be bold, punchy, and all-caps when that improves mobile readability.
Name the actual beginner-friendly tool when it matters (for example ChatGPT,
Claude, or Gemini), but never imply that a tool guarantees money, freedom, a
job, or a business result.
Growth priority: win the first second with a surprising, stealable result →
earn the save by teaching it → offer a genuinely deeper HOW playbook →
give people a specific reason to follow for more useful prompts.
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
  "Make AI interview you with five questions before it writes the first draft",
  "Paste a ChatGPT answer into Claude and use a claim-by-claim fact-check prompt",
  "Turn one rough note into seven specific hooks without changing the core idea",
  "Write a clear email with a three-line prompt: context, goal, and tone",
  "Make AI answer only from pasted notes and label anything the notes do not support",
  "Turn meeting notes into an action list with owner, deadline, and first step",
  "Rewrite a robotic paragraph in your voice using three real writing samples",
  "Compare two choices with weighted criteria you choose before AI gives advice",
  "Turn a job description into five interview questions and strong answer outlines",
  "Ask AI to find the weakest sentence in a draft and rewrite only that sentence",
  "Convert a long document into a five-bullet brief with a quote supporting each bullet",
  "Turn a vague goal into a seven-day plan with one 15-minute action per day",
  "Create three subject lines from one email and explain which reader each suits",
  "Use a teach-back prompt that checks what you understood instead of just summarizing",
  "Use Claude to turn one client brief into a five-prompt project workflow",
  "Ask ChatGPT to work backward from a monthly freelance goal into priced deliverables, without promising the income",
  "Use Gemini to compare source notes and flag claims that need a citation",
];

// Rotate the evergreen topic by day so fallback Reels don't repeat back-to-back.
export function pickEvergreenTopic(dayNumber = 0) {
  const n = Number(dayNumber) || 0;
  const len = EVERGREEN_TOPICS.length;
  const i = ((n % len) + len) % len;
  return EVERGREEN_TOPICS[i];
}

const EMERGENCY_PROMPT =
  'Answer [QUESTION] using only the notes below. After each claim, quote the supporting note. If the notes do not contain the answer, write "Not in the notes" instead of guessing. Notes: [PASTE NOTES]';

// Provider-independent copy keeps the daily queue alive when every text model
// is unavailable. These objects intentionally match the existing generator
// schemas so callers and Airtable consumers need no emergency-only branch.
export function buildEmergencyGrowthContent(format = "feed") {
  const caption =
    `Stop AI from guessing when your notes do not have the answer.\n\n` +
    `Paste your notes into ChatGPT or Claude, then type:\n"${EMERGENCY_PROMPT}"\n\n` +
    `Use it for meeting notes, research, or class notes. Save this prompt. ` +
    `Comment HOW and I'll DM you a filled-in example plus a quick accuracy check.\n\n` +
    `#chatgpt #claudeai #aitips #learnai #productivity`;
  const bonusPrompt =
    `NOTES-ONLY TEMPLATE\nPaste: "${EMERGENCY_PROMPT}"\n` +
    `Example question: "Which launch date did the team approve?" ` +
    `Check: every answer claim must include an exact quote from the notes.`;

  if (format === "reel") {
    return {
      hook: "STOP AI FROM GUESSING",
      beats: [
        "Paste your source notes",
        'Type: "Answer only from these notes"',
        'Missing fact? Say "Not in the notes"',
        "Comment HOW for the checked template",
      ],
      voiceoverSegments: [
        "Paste your notes, then tell ChatGPT to answer only from those notes",
        "Unsupported facts get flagged. Comment HOW and I'll DM you the AI playbook",
      ],
      caption,
      firstComment:
        "Comment HOW for the notes-only template, filled-in example, and accuracy check. #chatgpt #claudeai #aitips #learnai #productivity",
      visualScenes: [
        "0-2 seconds: scattered papers settle into one neat stack in a wide moving shot",
        "2-5 seconds: a spotlight isolates the source stack while the camera moves closer",
        "5-8 seconds: unsupported loose pages slide out of frame without visible hands",
        "8-11 seconds: the verified stack moves into a clearly separated finished area",
        "11-14 seconds: the room brightens around the organized source material",
        "14-16 seconds: a waist-up person reacts with relief, hands outside the frame",
      ],
      videoPrompt:
        "Original live-action vertical B-roll showing scattered source notes becoming an organized, trustworthy answer through movement and light; no screens, text, logos, celebrities, or visible hands.",
      coverText: "STOP AI GUESSING",
      storyText: "Make AI cite your notes",
      bonusPrompt,
    };
  }

  if (format === "carousel") {
    return {
      hook: "STOP AI FROM GUESSING",
      slides: [
        {
          headline: "STOP AI FROM GUESSING",
          body: "5 NOTES-ONLY PROMPTS · SAVE THIS",
        },
        {
          headline: "PROMPT 1",
          body: "Read these notes and list only the facts they explicitly contain: [PASTE NOTES]",
        },
        {
          headline: "PROMPT 2",
          body: "Answer [QUESTION] using only those facts. Do not use outside knowledge.",
        },
        {
          headline: "PROMPT 3",
          body: 'After each claim, quote the exact supporting words from my notes.',
        },
        {
          headline: "PROMPT 4",
          body: 'If a claim is unsupported, replace it with "Not in the notes."',
        },
        {
          headline: "PROMPT 5",
          body: "Check the final answer. Remove every sentence that has no matching quote.",
        },
        {
          headline: "SAVE THESE 5 PROMPTS",
          body: "Comment HOW for the filled-in template",
        },
      ],
      caption,
      firstComment:
        "Comment HOW for the notes-only template, filled-in example, and accuracy check. #chatgpt #claudeai #aitips #learnai #productivity",
      storyText: "Make AI cite your notes",
      bonusPrompt,
    };
  }

  return {
    hook: "STOP AI FROM GUESSING",
    subtext: 'Add: "Answer only from these notes"',
    caption,
    firstComment:
      "Comment HOW for the notes-only template, filled-in example, and accuracy check. #chatgpt #claudeai #aitips #learnai #productivity",
    topicTag: "#chatgpt",
    storyText: "Make AI cite your notes",
    bonusPrompt,
  };
}

export const GROWTH_CTA_LINES = [
  "Save this prompt for the next time you need it.",
  "Comment HOW and I'll DM you the expanded prompt with a filled-in example.",
  "Try this once, then follow for more beginner-friendly prompts worth keeping.",
  "Send this to the person who always starts from a blank page.",
  "Follow for more copy-ready AI workflows like this one.",
];

export function buildFirstComment({ topicTag = "#aitips", cta } = {}) {
  const line = cta || GROWTH_CTA_LINES[Math.floor(Math.random() * GROWTH_CTA_LINES.length)];
  const tags = [...CORE_HASHTAGS];
  if (topicTag && !tags.includes(topicTag)) tags.unshift(topicTag);
  return `${line}\n\n${tags.slice(0, 8).join(" ")}`;
}

const FOLLOWER_RULES = `
Follower-conversion rules (critical):
- The hook leads with a specific outcome, useful contrast, or unexpected
  instruction—not a series label, vague tease, or unsupported time-saving claim
- Name a specific AI tool when the workflow genuinely uses one; never bolt a
  tool name onto a generic claim
- Give away a complete small win in the post; do not hide the useful prompt
  behind the comment CTA
- Ask for the single keyword "HOW" only when offering a deeper companion:
  a reusable template, worked example, verification checklist, or useful variation
- Put 1-2 searchable phrases naturally in the caption (e.g. "ChatGPT tips", "AI for beginners")
- A follow CTA is optional. If used, promise more copy-ready beginner workflows,
  not posting frequency
- Never beg, say "like for more", or use empty phrases such as "game changer",
  "unlock the power", "this changes everything", or "thank me later"
- Never promise guaranteed income or effortless freedom. If money appears,
  show transparent math tied to real deliverables, assumptions, and work
- Make every claim believable and concrete. Sound like a helpful teacher
`;

export function feedGrowthPrompt(sourceCaption, dayNumber) {
  const dayLine = dayNumber
    ? `Optional continuity label: "Day ${dayNumber}" may appear once as tiny metadata. Never put it in the hook, first caption line, or CTA.`
    : "";
  return `${BRAND_VOICE}
Below is a post that performed well in this niche. Do NOT copy it.
Extract the underlying idea, then write a completely original post on the
same topic, optimized to gain Instagram followers fast.
${dayLine}

Growth rules:
- Hook must state a specific, surprising win in under 8 words
- The hook must make sense without "Day N", "AI tip", or missing context
- Prefer a useful contrast or tool-named result over a generic curiosity gap
- Caption opens with the useful outcome, then gives the exact copyable prompt
  or a short workflow with a realistic example input and output
- Include a searchable phrase naturally (ChatGPT tips / AI for beginners / etc.)
- End with the CTA "Comment HOW and I'll DM you the AI playbook"
- Explain what extra value the HOW playbook contains
- A follow CTA, if included, must be tied to more copy-ready workflows
- Include exactly 5 niche hashtags at the end of the caption
- Sound human. No corporate tone.
${FOLLOWER_RULES}

Respond with ONLY valid JSON, no markdown fences:
{
  "hook": "specific stealable outcome for the image, max 8 words; never start with Day",
  "subtext": "the key prompt instruction or concrete proof, max 15 words",
  "caption": "full Instagram caption, 100-160 words",
  "firstComment": "short CTA + 5-8 hashtags for the first comment",
  "topicTag": "one primary hashtag like #chatgpt",
  "storyText": "specific result, max 6 words; no Day label or generic follow request",
  "bonusPrompt": "a compact deeper playbook for HOW comments: include a copy-paste prompt template with placeholders, when to use it, and one filled-in example or verification step"
}

Source post caption:
"""${sourceCaption || ""}"""`;
}

export function reelGrowthPrompt(sourceCaption, dayNumber) {
  const dayLine = dayNumber
    ? `Optional continuity label: "Day ${dayNumber}" may appear only as tiny cover metadata. Never put it in the hook, cover headline, beats, voiceover, or CTA.`
    : "";
  return `${BRAND_VOICE}
Write an original 16-second Instagram Reel script based on the idea below
(do NOT copy wording). Optimized for Reels discovery AND follows.
${dayLine}

Structure:
1. 0-1s HOOK: state the specific result or unexpected instruction immediately
2. 1-8s COPY IT: say what to paste and the exact instruction to give the AI
3. 8-14s PAYOFF: give a realistic example of the output and when to use it
4. 14-16s COMMENT CTA: spoken exactly, "Comment HOW and I'll DM you the AI playbook."

Teaching rules:
- Teach only ONE prompt or workflow. A beginner must be able to try it from
  the voiceover, beats, and caption without receiving the DM
- Use concrete verbs such as paste, ask, replace, compare, or check
- Name the AI tool when the workflow is tool-specific. The opening may use
  bold all-caps language, but the claim must remain concrete and provable
- Write the copy and voiceover like a real tool demonstration: "Paste your
  notes. Then type..." Do not merely describe what AI can do
- Since generated video cannot show screens, put all exact teaching in
  on-screen copy, voiceover, and caption. visualScenes should use moving
  physical metaphors that reinforce the problem and payoff
- The HOW playbook must go beyond the Reel with a copy-paste template,
  a filled-in example, and a check that prevents a common bad result

${FOLLOWER_RULES}

Respond with ONLY valid JSON, no markdown fences:
{
  "hook": "max 8 words, specific on-screen result; never start with Day",
  "beats": ["exact input to paste", "exact instruction to type", "specific example payoff", "Comment HOW for the expanded template"],
  "voiceoverSegments": [
    "clip 1: one complete energetic hook and useful AI step, 10-15 words",
    "clip 2: one complete payoff sentence, 5-10 words, then exactly: Comment HOW and I'll DM you the AI playbook"
  ],
  "caption": "Instagram caption under 500 chars with the copyable prompt or workflow, a realistic use, searchable phrase, what the HOW playbook adds, Comment HOW CTA, and 5 hashtags",
  "firstComment": "Comment HOW with a specific description of the deeper playbook + 5-8 hashtags",
  "visualScenes": [
    "0-2 seconds: wide or medium live-action B-roll that symbolizes the problem without screens, text, or close-ups of hands",
    "2-5 seconds: a different moving shot using environments, camera motion, or self-moving physical props; keep all hands and fingers out of frame",
    "5-8 seconds: a transition or discovery moment with visible movement; hands remain out of frame",
    "8-11 seconds: a new location or angle showing the useful real-world payoff; no screens or text",
    "11-14 seconds: a stronger result or transformation using environment and camera motion",
    "14-16 seconds: a waist-up human reaction for the comment CTA; hands remain out of frame and no one holds an object"
  ],
  "videoPrompt": "a concise cinematic direction for an actual live-action vertical video with three distinct moving physical B-roll shots, people in medium/wide framing, environments and self-moving props, natural lighting, camera movement, and visual storytelling; keep hands and fingers entirely out of frame and never show anyone holding an object; use physical metaphors for digital concepts; never show readable screens, phones, monitors, apps, websites, code, text, UI, static graphics, posters, slideshows, mascots, flat illustrations, or text-only animation",
  "coverText": "specific stealable result, max 6 words; never Day N or a generic AI tip",
  "storyText": "specific result, max 6 words; no generic follow request",
  "bonusPrompt": "a compact deeper playbook for HOW comments with a copy-paste prompt template using placeholders, one filled-in example, and one output-quality check"
}

Source idea:
"""${sourceCaption || ""}"""`;
}

export function carouselGrowthPrompt(sourceCaption, dayNumber) {
  const dayLine = dayNumber
    ? `Optional continuity label: "Day ${dayNumber}" may appear only as tiny metadata. Never use it in the cover headline or slide teaching.`
    : "";
  return `${BRAND_VOICE}
Create an original Instagram carousel that people will SAVE (saves drive reach).
Based on the idea below (do NOT copy). Use 7 slides to teach ONE useful outcome
through a numbered five-prompt sequence.
${dayLine}

${FOLLOWER_RULES}
- Slide 1 is a save-magnet cover: bold, preferably all-caps; use a pattern
  interrupt, simple believable math or before/after contrast when relevant;
  name the specific AI tool; promise "5 PROMPTS"; and say "SAVE THIS"
- Slides 2-6 are numbered PROMPT 1 through PROMPT 5. Together they form a
  practical sequence toward the cover outcome. Each slide includes exact
  copyable wording with placeholders, not a description of a prompt
- If the cover uses money math, state the assumptions and connect each number
  to a real deliverable. Never imply guaranteed earnings or effortless wealth
- Slide 7 asks viewers to save the prompt sequence and may offer more copy-ready workflows
- The HOW bonus must add a reusable template plus an example or quality check;
  it cannot repeat the carousel as generic three-step advice
- Visual direction for every slide: original flat/graphic design, huge
  high-contrast mobile-readable type, black and white with one warm red accent,
  strong hierarchy, and generous spacing. Never request or imitate celebrity
  photos, influencer likenesses, trademarked logos, or another account's design

Respond with ONLY valid JSON, no markdown fences:
{
  "hook": "specific cover result, max 8 words; never start with Day",
  "slides": [
    { "headline": "bold tool-named cover hook", "body": "specific outcome or honest math + 5 PROMPTS + SAVE THIS" },
    { "headline": "PROMPT 1", "body": "first exact copy-paste prompt with placeholders" },
    { "headline": "PROMPT 2", "body": "second exact copy-paste prompt with placeholders" },
    { "headline": "PROMPT 3", "body": "third exact copy-paste prompt with placeholders" },
    { "headline": "PROMPT 4", "body": "fourth exact copy-paste prompt with placeholders" },
    { "headline": "PROMPT 5", "body": "fifth exact copy-paste prompt with placeholders and an output-quality check" },
    { "headline": "SAVE THESE 5 PROMPTS", "body": "Comment HOW for the filled-in template pack" }
  ],
  "caption": "caption 120-180 words, searchable phrase, question, follow CTA, 5 hashtags",
  "firstComment": "CTA + 5-8 hashtags",
  "storyText": "specific result, max 6 words; no generic follow request",
  "bonusPrompt": "copy-paste prompt template with placeholders plus one filled-in example or output-quality check for HOW comment replies"
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
Smaller line below (render exactly): "Open the post · Comment HOW"
Tiny top label: "${dayLabel}"`;
}

// Delivers a useful mini-playbook when someone comments HOW.
export const BONUS_PROMPT_FALLBACKS = [
  `INTERVIEW BEFORE WRITING\nPaste: "I need to create [THING] for [AUDIENCE]. Before writing, ask me five short questions, one at a time, about the goal, reader, must-include details, tone, and constraints. After my fifth answer, draft it using only what I told you."\nExample: replace [THING] with "a welcome email" and [AUDIENCE] with "new clients." Check: delete any detail you did not provide.`,
  `NOTES-ONLY ANSWER\nPaste your notes, then add: "Answer [QUESTION] using only the notes above. After every claim, cite the exact supporting phrase in quotation marks. If the notes do not support something, write 'Not in the notes' instead of guessing."\nUse this for meeting notes, research, or class notes. Check: every claim needs a matching quote.`,
  `ONE NOTE → SEVEN HOOKS\nPaste: "Turn this note into seven hooks for [AUDIENCE]. Each hook must promise one specific result, use plain English, stay under eight words, and take a different angle: mistake, shortcut, contrast, question, checklist, before/after, and surprising instruction. Note: [PASTE NOTE]."\nCheck: remove any hook that promises more than the note proves.`,
  `THREE-LINE EMAIL\nPaste: "Context: [WHAT HAPPENED]. Goal: [WHAT I NEED THE READER TO DO]. Tone: [THREE WORDS]. Write an email under [WORD COUNT] words. Keep every fact exactly as given and end with one clear next step."\nExample tone: "warm, direct, calm." Check: the final sentence should contain only one request.`,
];

export function pickBonusPrompt(preferred) {
  if (preferred && String(preferred).trim().length > 20) return String(preferred).trim();
  return BONUS_PROMPT_FALLBACKS[Math.floor(Math.random() * BONUS_PROMPT_FALLBACKS.length)];
}

export function tipReplyMessage(bonusPrompt, dayNumber) {
  const day = dayNumber ? ` (Day ${dayNumber})` : "";
  return `Here's your AI playbook${day} 👇\n\n${bonusPrompt}\n\nSave it somewhere handy. Follow for more copy-ready AI workflows.`;
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
  "Glad this helped — save the prompt for the next time you need it.",
  "Yes! Try it with one real example today.",
  "Love this. Comment HOW and I'll DM the expanded template.",
  "The output check is what makes this one reliable.",
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
  const dayLine = dayNumber
    ? `Optional continuity label: "Day ${dayNumber}" may appear once as tiny metadata, never in the hook or first caption line.`
    : "";
  return `${BRAND_VOICE}
This idea already grew reach. Write a FRESH angle — do not repeat the old hook.
Original hook: "${originalHook || ""}"
${dayLine}

${FOLLOWER_RULES}

- Find one useful prompt or workflow inside the proven idea and teach it fully
- The new hook must lead with a different specific result or instruction,
  naming the AI tool when relevant
- Include the exact copyable wording and a realistic use case

Respond with ONLY valid JSON, no markdown fences:
{
  "hook": "new specific result, max 8 words; never start with Day",
  "subtext": "key prompt instruction or proof, max 15 words",
  "caption": "100-160 words, searchable phrase, Comment HOW CTA, follow CTA, 5 hashtags",
  "firstComment": "CTA + 5-8 hashtags",
  "storyText": "specific result, max 6 words",
  "bonusPrompt": "deeper copy-paste template with placeholders, example, and output-quality check for HOW comments"
}

Original performing idea:
"""${sourceCaption || ""}"""`;
}

export function weeklyRecapPrompt(hooks, dayNumber) {
  const list = (hooks || []).slice(0, 6).map((h, i) => `${i + 1}. ${h}`).join("\n");
  return `${BRAND_VOICE}
Build a SAVE-THIS weekly recap carousel from this week's tips.
${dayNumber ? `"Day ${dayNumber}" may appear only as tiny metadata, never as the cover headline.` : ""}
Tips:
${list}

${FOLLOWER_RULES}
- Cover uses a bold, specific, tool-named save-magnet promise and says SAVE THIS
- Each middle slide numbers and preserves the exact useful instruction from one tip
- Final slide: Save these prompts + Comment HOW for the reusable templates
- Use original flat graphic design with huge high-contrast type, black and
  white with one warm red accent. No celebrity or influencer likenesses,
  trademarked logos, or copied account branding

Respond with ONLY valid JSON, no markdown fences:
{
  "hook": "cover headline, max 8 words",
  "slides": [
    { "headline": "This week's AI tips", "body": "Save this · SWIPE" },
    { "headline": "tip", "body": "one line" },
    { "headline": "tip", "body": "one line" },
    { "headline": "tip", "body": "one line" },
    { "headline": "Save these prompts", "body": "Comment HOW for the reusable templates" }
  ],
  "caption": "120-180 words recap, searchable phrase, HOW CTA, 5 hashtags",
  "firstComment": "CTA + hashtags",
  "storyText": "This week's AI tips",
  "bonusPrompt": "copy-paste template pack that makes the week's tips reusable, with placeholders and one quality check"
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
Tiny bottom label: "Save the prompt for later"`;
}
