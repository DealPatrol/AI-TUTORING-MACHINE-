// Manual trigger for /api/cron/post-reel-1
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const cron = await fetch(
      `${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000"}/api/cron/post-reel-1`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      }
    );
    const data = await cron.json();
    const ok = cron.ok && data.ok !== false && !data.error;
    return NextResponse.json({
      success: ok,
      message: ok ? (data.message || "Posted reel to Instagram (1 PM)") : "Reel post failed",
      error: ok ? undefined : data.error || `HTTP ${cron.status}`,
      data,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
