import { NextResponse } from "next/server";
import { airtableList } from "@/lib/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [queue, winners, posted] = await Promise.all([
      airtableList("Queue", "filterByFormula=" + encodeURIComponent(`{Status}="Ready"`)),
      airtableList("Winners", "filterByFormula=" + encodeURIComponent(`{Status}="New"`)),
      airtableList(
        "Queue",
        "filterByFormula=" + encodeURIComponent(`{Status}="Posted"`) + "&maxRecords=12"
      ),
    ]);

    return NextResponse.json({
      queue: queue.map((r) => ({
        id: r.id,
        hook: r.fields.Hook,
        caption: r.fields.Caption,
        imageUrl: r.fields["Image URL"],
        videoUrl: r.fields["Video URL"],
        type: r.fields.Type || "Feed",
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
        format: r.fields.Format,
        growthScore: r.fields["Growth Score"],
      })),
      posted: posted.map((r) => ({
        id: r.id,
        hook: r.fields.Hook,
        type: r.fields.Type || "Feed",
        postedAt: r.fields["Posted At"],
      })),
      stats: {
        readyFeed: queue.filter((r) => !r.fields.Type || r.fields.Type === "Feed").length,
        readyReels: queue.filter((r) => r.fields.Type === "Reel").length,
        readyCarousels: queue.filter((r) => r.fields.Type === "Carousel").length,
        winnersWaiting: winners.length,
      },
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
