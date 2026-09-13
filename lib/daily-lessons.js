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
export function dailyLesson(day) {
  const index = ((Number(day) || 0) % lessons.length + lessons.length) % lessons.length;
  const [hook, example, prompt, check] = lessons[index];
  return { hook, caption: `${hook}\n\nExample: ${example}.\n\nPaste your own source material into ChatGPT, Claude or Gemini, then try:\n\n“${prompt}”\n\nBefore using the result: ${check}\n\nSave this for your next task. Follow @unlocking__ai for practical AI lessons.\n\n#aitips #chatgpt #learnai`, slides: [
    { headline: hook, body: `A practical AI workflow.\nExample: ${example}.` },
    { headline: 'Start with your material', body: `Use your own draft, notes or brief. Remove customer details and anything confidential before sharing it.` },
    { headline: 'Copy this instruction', body: prompt },
    { headline: 'Check the result', body: check },
    { headline: 'Make it work for you', body: 'Try it on one small task first. Save the useful version, change what did not work, and keep the final decision yours.' },
  ]};
}
export const DAILY_LESSON_COUNT = lessons.length;
