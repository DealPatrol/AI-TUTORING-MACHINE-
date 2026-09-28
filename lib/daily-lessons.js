// Original, curated demonstrations: no invented news, earnings claims or paid model dependency.
const lessons = [
  ['Get a useful first draft', 'Write a short customer follow-up', 'Write a friendly follow-up asking whether the customer has questions about my estimate. Keep it under 80 words. Do not invent a discount or deadline.', 'Check that the customer name, price and next step match your actual estimate.'],
  ['Turn notes into next steps', 'Organize a small project', 'Extract each action from these notes. Return a table with task, owner and deadline. Use “not specified” when an owner or date is missing.', 'Compare every task against the notes. Ask a person to fill in the missing owners.'],
  ['Make the vague parts obvious', 'Improve a service description', 'Read my draft. Identify three phrases that are vague. For each, ask one question that would make it specific. Do not rewrite until I answer.', 'Specific means a real deliverable, audience or example—not a stronger adjective.'],
  ['Compare without guessing', 'Choose between two quotes', 'Compare these quotes using only the listed details. Show total price, included work, exclusions and unanswered questions. Do not choose a winner yet.', 'Check the totals yourself. Missing information is not the same as an excluded service.'],
  ['Keep your own writing voice', 'Rewrite a social caption', 'Study my three writing samples. List three style traits. Rewrite the draft using those traits, keeping every factual claim unchanged.', 'Read it aloud. Remove any phrase you would never say to a customer.'],
  ['Turn one idea into five hooks', 'Plan an educational post', 'Write five opening lines for this lesson. Each must name a concrete problem and stay under 12 words. No exaggerated results or invented statistics.', 'Choose the hook the lesson actually answers. Do not promise more than you demonstrate.'],
  ['Check what the source says', 'Summarize a document', 'Summarize my notes in five bullets. After each bullet, quote the exact supporting words. Mark anything unsupported as “not in the notes”.', 'Find each quote in the original. AI can still misquote or miss important context.'],
  ['Make a realistic short plan', 'Break down a busy week', 'Break this goal into five tasks of about 20 minutes each. List the input needed for each task. Flag anything that cannot reasonably fit.', 'Adjust the time estimates to your experience. A plan is a starting point, not a guarantee.'],
  ['Find the missing question', 'Prepare a customer intake', 'Based on this project brief, ask the five most important unanswered questions before suggesting a solution. Explain why each answer matters.', 'Delete questions already answered in the brief. Keep the questions your customer can answer.'],
  ['Practice before the real call', 'Rehearse an estimate discussion', 'Role-play a customer asking about this estimate. Ask one question at a time. After I answer, suggest one clearer phrase without inventing facts.', 'Use only your actual services and prices. Never promise work you cannot deliver.'],
  ['Shorten without losing meaning', 'Clean up a long email', 'Cut this email to 100 words. Preserve every date, amount, request and condition. Then list anything you removed so I can check it.', 'Compare the original and rewrite side by side before sending.'],
  ['Teach it back to learn it', 'Study a difficult concept', 'Explain this concept using my notes in plain English. Then ask me one question. Wait for my answer before giving feedback.', 'Verify the explanation against your course material; fluency does not prove accuracy.'],
  ['Turn complaints into fixes', 'Review customer feedback', 'Group these anonymized comments by problem. Quote one example per group. Suggest one small test for each; do not invent the number of affected customers.', 'Remove private information before pasting. Read the negative comments in context.'],
  ['Build a reusable checklist', 'Prepare a repeatable job', 'Turn my process notes into a checklist in execution order. Separate required steps from optional ones. Flag missing safety or quality checks as questions.', 'Have an experienced person review it before using it for real work.'],
];

function captionFor(hook, example, prompt, check) {
  return `${hook}\n\nExample: ${example}.\n\nPaste your own source material into ChatGPT, Claude or Gemini, then try:\n\n“${prompt}”\n\nBefore using the result: ${check}\n\nFollow @unlocking__ai for 3 stealable AI wins a day.\n\n#chatgpt #aitips #learnai #promptengineering #aihacks`;
}

export function dailyLesson(day) {
  const index = ((Number(day) || 0) % lessons.length + lessons.length) % lessons.length;
  const [hook, example, prompt, check] = lessons[index];
  return {
    hook,
    caption: captionFor(hook, example, prompt, check),
    slides: [
      { headline: hook, body: `A practical AI workflow.\nExample: ${example}.` },
      { headline: 'Start with your material', body: `Use your own draft, notes or brief. Remove customer details and anything confidential before sharing it.` },
      { headline: 'Copy this instruction', body: prompt },
      { headline: 'Check the result', body: check },
      { headline: 'Make it work for you', body: 'Try it on one small task first. Save the useful version, change what did not work, and keep the final decision yours.' },
    ],
  };
}

// Punchy text-Reel bank. 3 per day. Instagram distributes Reels, not carousels.
const reelLessons = [
  ['STOP WRITING EMAILS BLANK', 'Customer follow-up', 'Write a [KIND] email. Context: [WHO / WHY]. Ask for [ONE ACTION]. Match this tone: [PASTE 3 SENTENCES]. Do not invent discounts or deadlines.', 'Check names, prices, and the ask against your real notes.', ['STOP WRITING EMAILS BLANK', 'PASTE THIS 3-LINE PROMPT', 'ADD 3 SENTENCES YOU SENT', 'YOU GET AN EMAIL YOU WOULD SEND', 'FOLLOW FOR 3 WINS A DAY']],
  ['YOUR AI IS GUESSING', 'Notes-only answers', 'Answer [QUESTION] using only the notes below. Quote the supporting line after each claim. If it is missing, write “Not in the notes”. Notes: [PASTE]', 'Find every quote in the original notes.', ['YOUR AI IS GUESSING', 'TELL IT: NOTES ONLY', 'MISSING FACT? SAY SO', 'STOP THE MADE-UP DETAILS', 'FOLLOW FOR 3 WINS A DAY']],
  ['THIS MAKES AI SOUND LIKE YOU', 'Voice match', 'Study these 3 samples. List 3 style traits. Rewrite the draft using those traits. Keep every fact unchanged. Samples: [PASTE]', 'Read it aloud. Cut any phrase you would never say.', ['THIS MAKES AI SOUND LIKE YOU', 'PASTE 3 THINGS YOU WROTE', 'ASK FOR 3 STYLE TRAITS', 'REWRITE. KEEP THE FACTS.', 'FOLLOW FOR 3 WINS A DAY']],
  ['STOP ASKING IT TO “MAKE THIS BETTER”', 'Specific rewrite', 'Rewrite this for [AUDIENCE]. Keep it under [N] words. Preserve every date, amount, and name. Then list what you changed. Draft: [PASTE]', 'Compare the two versions side by side.', ['STOP ASKING “MAKE THIS BETTER”', 'NAME THE AUDIENCE', 'SET A WORD LIMIT', 'MAKE IT LIST EVERY CHANGE', 'FOLLOW FOR 3 WINS A DAY']],
  ['ONE PROMPT. FIVE HOOKS.', 'Post openers', 'Write 5 opening lines for this lesson. Each names a concrete problem and stays under 12 words. No fake stats. Lesson: [PASTE]', 'Pick the hook the lesson actually answers.', ['ONE PROMPT. FIVE HOOKS.', 'NAME THE REAL PROBLEM', '12 WORDS MAX', 'NO FAKE NUMBERS', 'FOLLOW FOR 3 WINS A DAY']],
  ['TURN A MESSY NOTE INTO TASKS', 'Action list', 'Extract each action from these notes. Table: task, owner, deadline. Use “not specified” when missing. Notes: [PASTE]', 'A person fills missing owners. Do not invent them.', ['TURN A MESSY NOTE INTO TASKS', 'ASK FOR A 3-COLUMN TABLE', 'OWNER + DEADLINE', 'BLANK BEATS A GUESS', 'FOLLOW FOR 3 WINS A DAY']],
  ['CUT THE FLUFF. KEEP THE DEAL.', 'Short email', 'Cut this email to 100 words. Preserve every date, amount, request, and condition. Then list what you removed. Email: [PASTE]', 'Check the original before you hit send.', ['CUT THE FLUFF. KEEP THE DEAL.', '100 WORDS. THAT IS THE RULE.', 'KEEP DATES AND MONEY', 'LIST WHAT GOT CUT', 'FOLLOW FOR 3 WINS A DAY']],
  ['MAKE VAGUE COPY CONFESS', 'Service page', 'Read my draft. Identify 3 vague phrases. Ask one question for each that would make it specific. Do not rewrite yet. Draft: [PASTE]', 'Specific means a deliverable, not a stronger adjective.', ['MAKE VAGUE COPY CONFESS', 'DO NOT REWRITE YET', 'CIRCLE 3 FUZZY PHRASES', 'ASK 1 QUESTION EACH', 'FOLLOW FOR 3 WINS A DAY']],
  ['COMPARE OFFERS WITHOUT THE SPIN', 'Two quotes', 'Compare these quotes using only listed details. Show price, included work, exclusions, and unanswered questions. Do not pick a winner. [PASTE]', 'Check the totals yourself.', ['COMPARE OFFERS WITHOUT THE SPIN', 'NO WINNER YET', 'PRICE. SCOPE. GAPS.', 'MISSING IS NOT EXCLUDED', 'FOLLOW FOR 3 WINS A DAY']],
  ['PLAN A WEEK YOU CAN FINISH', '20-minute tasks', 'Break this goal into 5 tasks of about 20 minutes. List the input for each. Flag what cannot fit. Goal: [PASTE]', 'Adjust times to your real pace.', ['PLAN A WEEK YOU CAN FINISH', 'FIVE 20-MINUTE TASKS', 'NAME THE INPUT', 'FLAG WHAT WILL NOT FIT', 'FOLLOW FOR 3 WINS A DAY']],
  ['ASK THE QUESTION YOU SKIPPED', 'Client intake', 'Based on this brief, ask the 5 most important unanswered questions before suggesting a solution. Brief: [PASTE]', 'Delete questions the brief already answered.', ['ASK THE QUESTION YOU SKIPPED', 'NO SOLUTION YET', '5 UNANSWERED QUESTIONS', 'ONLY WHAT THEY CAN ANSWER', 'FOLLOW FOR 3 WINS A DAY']],
  ['REHEARSE THE AWKWARD CALL', 'Estimate talk', 'Role-play a customer asking about this estimate. One question at a time. After I answer, suggest one clearer phrase. Do not invent prices. [PASTE]', 'Use only your real services and prices.', ['REHEARSE THE AWKWARD CALL', 'ONE QUESTION AT A TIME', 'NO FAKE PRICES', 'KEEP YOUR REAL OFFER', 'FOLLOW FOR 3 WINS A DAY']],
  ['TEACH IT BACK OR YOU DO NOT KNOW IT', 'Study loop', 'Explain this using only my notes. Then ask me one question. Wait before feedback. Notes: [PASTE]', 'Check the explanation against the source.', ['TEACH IT BACK OR YOU DO NOT KNOW IT', 'EXPLAIN FROM YOUR NOTES', 'ONE QUESTION. THEN WAIT.', 'FLUENT IS NOT CORRECT', 'FOLLOW FOR 3 WINS A DAY']],
  ['TURN COMPLAINTS INTO ONE TEST', 'Feedback', 'Group these comments by problem. Quote one example each. Suggest one small test. Do not invent how many people said it. [PASTE]', 'Strip private details first.', ['TURN COMPLAINTS INTO ONE TEST', 'GROUP BY PROBLEM', 'ONE QUOTE EACH', 'ONE SMALL TEST. NOT A SPEECH.', 'FOLLOW FOR 3 WINS A DAY']],
  ['MAKE A CHECKLIST YOU CAN HAND OFF', 'Repeatable job', 'Turn these notes into a checklist in order. Separate required vs optional. Flag missing quality checks as questions. [PASTE]', 'Have an experienced person review it.', ['MAKE A CHECKLIST YOU CAN HAND OFF', 'REQUIRED VS OPTIONAL', 'KEEP THE REAL ORDER', 'MISSING STEPS STAY QUESTIONS', 'FOLLOW FOR 3 WINS A DAY']],
  ['STOP THE ROBOT OPENING LINE', 'First sentence', 'Rewrite only the first sentence. Name the reader’s problem in under 10 words. No “I hope this email finds you”. Draft: [PASTE]', 'If you would not say it out loud, cut it.', ['STOP THE ROBOT OPENING LINE', 'REWRITE ONLY LINE 1', 'NAME THEIR PROBLEM', '10 WORDS. NO “I HOPE”', 'FOLLOW FOR 3 WINS A DAY']],
  ['MAKE CHATGPT SHOW ITS WORK', 'Claim check', 'List every factual claim in this draft. Mark each Supported / Unsupported. Quote the source or write “not in the notes”. Draft + notes: [PASTE]', 'Unsupported claims get deleted or sourced.', ['MAKE CHATGPT SHOW ITS WORK', 'LIST EVERY CLAIM', 'SUPPORTED OR NOT', 'DELETE THE UNSOURCED ONES', 'FOLLOW FOR 3 WINS A DAY']],
  ['TURN ONE BRIEF INTO A SEQUENCE', '5-prompt workflow', 'Turn this brief into 5 prompts I can run in order. Each prompt has an input, instruction, and done-check. Brief: [PASTE]', 'Run them one at a time. Do not skip the check.', ['TURN ONE BRIEF INTO A SEQUENCE', 'FIVE PROMPTS. IN ORDER.', 'INPUT. INSTRUCTION. CHECK.', 'DO NOT SKIP A STEP', 'FOLLOW FOR 3 WINS A DAY']],
  ['MAKE A SUBJECT LINE PEOPLE OPEN', '3 subject lines', 'Write 3 subject lines from this email. Each names a concrete next step. No clickbait. Email: [PASTE]', 'Pick the one that matches the real ask.', ['MAKE A SUBJECT LINE PEOPLE OPEN', '3 OPTIONS. ONE ASK EACH.', 'NO CLICKBAIT', 'MATCH THE REAL NEXT STEP', 'FOLLOW FOR 3 WINS A DAY']],
  ['KILL THE GENERIC CTA', 'Button copy', 'Rewrite this call to action 5 ways. Each names the exact next action and what they get. No “learn more”. CTA: [PASTE]', 'Use the version that matches the page.', ['KILL THE GENERIC CTA', 'NO “LEARN MORE”', 'NAME THE NEXT ACTION', 'NAME WHAT THEY GET', 'FOLLOW FOR 3 WINS A DAY']],
  ['MAKE AI INTERVIEW YOU FIRST', 'Better first draft', 'Before you write, ask me 5 questions that would change the draft. Wait for answers. Then write. Topic: [PASTE]', 'If a question is already answered, skip it.', ['MAKE AI INTERVIEW YOU FIRST', '5 QUESTIONS. THEN WRITE.', 'WAIT FOR YOUR ANSWERS', 'BETTER INPUT. BETTER DRAFT.', 'FOLLOW FOR 3 WINS A DAY']],
  ['FIND THE WEAKEST SENTENCE', 'Line edit', 'Find the weakest sentence in this draft. Explain why in one line. Rewrite only that sentence. Draft: [PASTE]', 'Keep every fact the same.', ['FIND THE WEAKEST SENTENCE', 'ONE SENTENCE ONLY', 'SAY WHY IT IS WEAK', 'REWRITE JUST THAT LINE', 'FOLLOW FOR 3 WINS A DAY']],
  ['TURN A PDF BRAIN-DUMP INTO 5 BULLETS', 'Brief', 'Summarize my notes in 5 bullets. After each, quote the supporting words. Mark gaps as “not in the notes”. [PASTE]', 'Find each quote in the source.', ['TURN A DUMP INTO 5 BULLETS', 'ONE QUOTE PER BULLET', 'GAPS STAY GAPS', 'NO SMOOTHING OVER HOLES', 'FOLLOW FOR 3 WINS A DAY']],
  ['PRICE THE WORK WITHOUT FANTASY', 'Deliverables', 'From this offer, list 3 deliverables, what is not included, and 3 questions to ask before quoting. Do not invent a price. [PASTE]', 'You set the price. AI does not.', ['PRICE THE WORK WITHOUT FANTASY', '3 DELIVERABLES', 'WHAT IS NOT INCLUDED', 'YOU SET THE PRICE', 'FOLLOW FOR 3 WINS A DAY']],
  ['MAKE A DECISION GRID', 'Two choices', 'Compare A vs B using only my criteria. Score each 1-5 with a one-line reason. Do not pick unless I ask. Criteria: [PASTE]', 'Change a weight and see if the scores move.', ['MAKE A DECISION GRID', 'YOUR CRITERIA. NOT ITS.', 'SCORE 1 TO 5', 'NO WINNER UNTIL YOU ASK', 'FOLLOW FOR 3 WINS A DAY']],
  ['WRITE THE FOLLOW-UP YOU KEEP AVOIDING', 'Nudge', 'Write a 60-word follow-up. Reference the last real next step. Ask one question. No guilt. No fake urgency. Notes: [PASTE]', 'Use the real date and the real ask.', ['WRITE THE FOLLOW-UP YOU AVOID', '60 WORDS', 'ONE REAL QUESTION', 'NO FAKE URGENCY', 'FOLLOW FOR 3 WINS A DAY']],
  ['TURN A JOB POST INTO PRACTICE', 'Interview prep', 'From this job post, write 5 interview questions and a 4-bullet outline for each. Use only the post. [PASTE]', 'Practice out loud. Do not memorize a script.', ['TURN A JOB POST INTO PRACTICE', '5 QUESTIONS FROM THE POST', '4-BULLET ANSWERS', 'NO INVENTED EXPERIENCE', 'FOLLOW FOR 3 WINS A DAY']],
  ['MAKE A MEETING USEFUL IN 10 MINUTES', 'Notes to owners', 'From these notes: decisions, open questions, and next actions with owners. Use “unassigned” if missing. [PASTE]', 'Send it only after you assign real names.', ['MAKE A MEETING USEFUL FAST', 'DECISIONS. QUESTIONS. ACTIONS.', 'OWNERS OR “UNASSIGNED”', 'DO NOT INVENT NAMES', 'FOLLOW FOR 3 WINS A DAY']],
  ['STOP PASTING PRIVATE STUFF', 'Redact first', 'Rewrite these notes with names, emails, phones, and prices replaced by labels like [CLIENT] and [AMOUNT]. Keep the meaning. [PASTE]', 'Check nothing identifiable remains.', ['STOP PASTING PRIVATE STUFF', 'REDACT FIRST', 'SWAP NAMES AND PRICES', 'THEN YOU CAN ASK AI', 'FOLLOW FOR 3 WINS A DAY']],
  ['GET THREE OPTIONS. PICK ONE.', 'Drafts', 'Give me 3 versions: shorter, more direct, and warmer. Keep every fact. Then tell me the tradeoff of each. Draft: [PASTE]', 'You pick. Do not average them together.', ['GET THREE OPTIONS. PICK ONE.', 'SHORTER. DIRECT. WARMER.', 'SAME FACTS', 'YOU CHOOSE. DO NOT BLEND.', 'FOLLOW FOR 3 WINS A DAY']],
];

function reelBeats(headlines, prompt, check) {
  return [
    { headline: headlines[0], body: 'Steal this. Use it on one real task today.' },
    { headline: headlines[1], body: prompt },
    { headline: headlines[2], body: 'Use your own notes, draft, or brief. Redact private details first.' },
    { headline: headlines[3], body: check },
    { headline: headlines[4], body: 'New Reel 8am · noon · 7pm CT' },
  ];
}

export function dailyReelLesson(index) {
  const i = ((Number(index) || 0) % reelLessons.length + reelLessons.length) % reelLessons.length;
  const [hook, example, prompt, check, headlines] = reelLessons[i];
  return {
    hook,
    example,
    prompt,
    check,
    caption: captionFor(hook, example, prompt, check),
    firstComment: 'Comment HOW and I will DM the filled-in version. Follow for 3 stealable prompts a day. #chatgpt #aitips #learnai #aihacks #promptengineering',
    beats: reelBeats(headlines, prompt, check),
    slides: [
      { headline: hook, body: `Example: ${example}.` },
      { headline: 'Copy this instruction', body: prompt },
      { headline: 'Check the result', body: check },
      { headline: 'Follow for 3 wins a day', body: 'Morning, noon, and night. New prompt every slot.' },
    ],
  };
}

export function dailyReelPack(day) {
  const base = ((Number(day) || 1) - 1) * 3;
  return [0, 1, 2].map((slot) => ({
    ...dailyReelLesson(base + slot),
    slot: slot + 1,
    slotLabel: ['8am CT', 'noon CT', '7pm CT'][slot],
  }));
}

export const DAILY_LESSON_COUNT = lessons.length;
export const DAILY_REEL_LESSON_COUNT = reelLessons.length;
export const DAILY_REEL_SLOTS = 3;
