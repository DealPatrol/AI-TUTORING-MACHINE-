// ENGAGE — reply to "TIP" comments with a bonus prompt (makes the CTA real → more comments → more reach).

import {
  checkCronAuth,
  airtableList,
  listIgComments,
  replyIgComment,
  safeAirtableUpdate,
} from "@/lib/helpers";
import { pickBonusPrompt, tipReplyMessage } from "@/lib/growth";

export const maxDuration = 60;

const TIP_RE = /\b(tip|tips|prompt|send it|bonus)\b/i;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) {
    return Response.json({ error: "IG_ACCESS_TOKEN missing" }, { status: 400 });
  }

  try {
    let posted = [];
    try {
      posted = await airtableList(
        "Queue",
        "filterByFormula=" +
          encodeURIComponent(`AND({Status}="Posted", {IG Media ID}!="")`) +
          "&maxRecords=8"
      );
    } catch (err) {
      if (String(err.message).includes("UNKNOWN_FIELD_NAME") || String(err.message).includes("Unknown field")) {
        return Response.json({
          ok: false,
          error: "Add Queue fields IG Media ID, Bonus Prompt, Replied Comment IDs (see AIRTABLE_SETUP.md)",
        }, { status: 400 });
      }
      throw err;
    }

    let replied = 0;
    const details = [];

    for (const row of posted) {
      const mediaId = row.fields["IG Media ID"];
      if (!mediaId) continue;

      let already = [];
      try {
        already = JSON.parse(row.fields["Replied Comment IDs"] || "[]");
      } catch {
        already = [];
      }
      const alreadySet = new Set(already);

      const comments = await listIgComments(mediaId, token);
      const bonus = pickBonusPrompt(row.fields["Bonus Prompt"]);
      const message = tipReplyMessage(bonus, row.fields["Day Number"]);

      for (const c of comments) {
        if (!c?.id || alreadySet.has(c.id)) continue;
        if (!TIP_RE.test(c.text || "")) continue;
        try {
          await replyIgComment(c.id, message, token);
          alreadySet.add(c.id);
          replied += 1;
          details.push({ mediaId, commentId: c.id, username: c.username });
        } catch (err) {
          console.warn("TIP reply failed:", err.message);
        }
      }

      await safeAirtableUpdate("Queue", row.id, {
        "Replied Comment IDs": JSON.stringify([...alreadySet]),
      });
    }

    return Response.json({ ok: true, replied, details });
  } catch (err) {
    console.error("Engage cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
