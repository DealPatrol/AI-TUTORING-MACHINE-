// Manual trigger for /api/cron/post-reel-3
import { NextResponse } from "next/server";

export async function POST(request) {
  // Dev: allow from localhost
  // Prod: require valid CRON_SECRET in header
  const url = new URL(request.url);
  const isDev = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  
  if (!isDev) {
    const secret = request.headers.get("x-cron-secret");
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const cron = await fetch(
      `${process.env.VERCEL_PROJECT_PRODUCTION_URL || "http://localhost:3000"}/api/cron/post-reel-3`,
      {
        headers: { "X-Cron-Secret": process.env.CRON_SECRET },
      }
    );
    const data = await cron.json();
    const ok = cron.ok && data.ok !== false && !data.error;
    return NextResponse.json({
      success: ok,
      message: ok ? (data.message || "Posted reel to Instagram (5 PM)") : "Reel post failed",
      error: ok ? undefined : data.error || `HTTP ${cron.status}`,
      data,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
