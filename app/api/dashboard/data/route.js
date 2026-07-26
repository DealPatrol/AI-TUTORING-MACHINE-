import { NextResponse } from "next/server";
import { airtableList } from "@/lib/helpers";

export async function GET(request) {
  try {
    // Fetch all three tables
    const [queue, winners, posted] = await Promise.all([
      airtableList("Queue", "filterByFormula=" + encodeURIComponent(`{Status}="Ready"`)),
      airtableList("Winners", "filterByFormula=" + encodeURIComponent(`{Status}="New"`)),
      airtableList("Queue", "filterByFormula=" + encodeURIComponent(`{Status}="Posted"`) + "&maxRecords=10"),
    ]);

    return NextResponse.json({
      queue: queue.map((r) => ({
        id: r.id,
        hook: r.fields.Hook,
        caption: r.fields.Caption,
        imageUrl: r.fields["Image URL"],
        status: r.fields.Status,
        sourceUrl: r.fields["Source URL"],
      })),
      winners: winners.map((r) => ({
        id: r.id,
        url: r.fields["Post URL"],
        account: r.fields.Account,
        caption: r.fields.Caption?.slice(0, 200),
        likes: r.fields.Likes,
        comments: r.fields.Comments,
        status: r.fields.Status,
      })),
      posted: posted.map((r) => ({
        id: r.id,
        hook: r.fields.Hook,
        postedAt: r.fields["Posted At"],
      })),
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
