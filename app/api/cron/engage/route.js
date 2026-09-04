// ENGAGE — deliver HOW playbooks, like comments, and reply to the rest.
// Comment velocity is one of the strongest Instagram ranking signals.

import {
  checkCronAuth,
  airtableList,
  listIgComments,
  replyIgComment,
  sendIgPrivateReply,
  likeIgComment,
  safeAirtableUpdate,
  rewriteCopy,
  getIgCredentials,
} from "@/lib/helpers";
import {
  pickBonusPrompt,
  tipReplyMessage,
  PLAYBOOK_RE,
  communityReplyPrompt,
  pickCommunityReply,
  looksLikeQuestion,
} from "@/lib/growth";

export const maxDuration = 120;

const MAX_COMMUNITY_REPLIES = 12;
const MAX_CUSTOM_REPLIES = 5;
const MAX_LIKES = 25;

export async function GET(request) {
  if (!checkCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token, igUserId } = getIgCredentials();
  if (!token || !igUserId) {
    return Response.json({ error: "IG_ACCESS_TOKEN or IG_USER_ID missing" }, { status: 400 });
  }

  const ownUsername = (process.env.IG_USERNAME || "").replace(/^@/, "").toLowerCase();

  try {
    let posted = [];
    try {
      posted = await airtableList(
        "Queue",
        "filterByFormula=" +
          encodeURIComponent(`AND({Status}="Posted", {IG Media ID}!="")`) +
          "&maxRecords=12&sort%5B0%5D%5Bfield%5D=" +
          encodeURIComponent("Posted At") +
          "&sort%5B0%5D%5Bdirection%5D=desc"
      );
    } catch (err) {
      const msg = String(err.message || "");
      if (msg.includes("UNKNOWN_FIELD_NAME") || msg.includes("Unknown field") || msg.includes("INVALID_SORT")) {
        try {
          posted = await airtableList(
            "Queue",
            "filterByFormula=" +
              encodeURIComponent(`AND({Status}="Posted", {IG Media ID}!="")`) +
              "&maxRecords=12"
          );
        } catch (err2) {
          if (String(err2.message).includes("UNKNOWN_FIELD_NAME") || String(err2.message).includes("Unknown field")) {
            return Response.json(
              {
                ok: false,
                error:
                  "Add Queue fields IG Media ID, Bonus Prompt, Replied Comment IDs (see AIRTABLE_SETUP.md)",
              },
              { status: 400 }
            );
          }
          throw err2;
        }
      } else {
        throw err;
      }
    }

    posted.sort((a, b) => {
      const ta = Date.parse(a.fields["Posted At"] || 0) || 0;
      const tb = Date.parse(b.fields["Posted At"] || 0) || 0;
      return tb - ta;
    });

    let replied = 0;
    let communityReplies = 0;
    let liked = 0;
    let customReplies = 0;
    const details = [];

    for (const row of posted) {
      const mediaId = row.fields["IG Media ID"];
      if (!mediaId) continue;
      if (String(row.fields["Posted At"] || "").startsWith("FAILED:")) continue;

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
        if (ownUsername && String(c.username || "").toLowerCase() === ownUsername) continue;

        if (liked < MAX_LIKES) {
          const likedComment = await likeIgComment({
            igUserId,
            commentId: c.id,
            token,
          });
          if (likedComment) liked += 1;
        }

        if (PLAYBOOK_RE.test(c.text || "")) {
          try {
            const privateReply = await sendIgPrivateReply({
              igUserId,
              commentId: c.id,
              message,
              token,
            });
            try {
              await replyIgComment(
                c.id,
                "Sent privately ✅ Check your Instagram inbox or Message Requests.",
                token
              );
            } catch (confirmationErr) {
              console.warn("Public DM confirmation failed:", confirmationErr.message);
            }
            alreadySet.add(c.id);
            replied += 1;
            details.push({
              mediaId,
              commentId: c.id,
              username: c.username,
              kind: "playbook",
              privateMessageId: privateReply.message_id,
            });
          } catch (err) {
            console.warn("Private playbook delivery failed:", err.message);
          }
          continue;
        }

        if (communityReplies >= MAX_COMMUNITY_REPLIES) continue;

        let replyText = pickCommunityReply();
        const wantsCustom =
          customReplies < MAX_CUSTOM_REPLIES &&
          (looksLikeQuestion(c.text) || String(c.text || "").trim().length > 24);
        if (wantsCustom) {
          try {
            const drafted = await rewriteCopy(
              communityReplyPrompt(c.text, row.fields.Hook, row.fields["Day Number"])
            );
            replyText = pickCommunityReply(drafted);
            customReplies += 1;
          } catch (err) {
            console.warn("Community reply draft failed:", err.message);
          }
        }

        try {
          await replyIgComment(c.id, replyText, token);
          alreadySet.add(c.id);
          communityReplies += 1;
          details.push({
            mediaId,
            commentId: c.id,
            username: c.username,
            kind: "community",
          });
        } catch (err) {
          console.warn("Community reply failed:", err.message);
        }
      }

      await safeAirtableUpdate("Queue", row.id, {
        "Replied Comment IDs": JSON.stringify([...alreadySet]),
      });
    }

    return Response.json({
      ok: true,
      replied,
      communityReplies,
      liked,
      details,
    });
  } catch (err) {
    console.error("Engage cron error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
