// Manual trigger for /api/cron/post-3 (Sequence=3)
import { NextResponse } from "next/server";

export async function POST(request) {
  const origin = request.headers.get("origin");
  const isLocalhost = origin?.includes("localhost") || origin?.includes("127.0.0.1");

  if (!isLocalhost && !request.headers.get("authorization")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cron = await fetch(
      `${process.env.VERCEL_PROJECT_PRODUCTION_URL || "http://localhost:3000"}/api/cron/post-3`,
      {
        headers: { "X-Cron-Secret": process.env.CRON_SECRET },
      }
    );
    const data = await cron.json();
    const ok = cron.ok && data.ok !== false && !data.error;
    return NextResponse.json({
      success: ok,
      message: ok ? (data.message || "Posted to Instagram (Sequence 3)") : "Post 3 failed",
      error: ok ? undefined : data.error || `HTTP ${cron.status}`,
      data,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
