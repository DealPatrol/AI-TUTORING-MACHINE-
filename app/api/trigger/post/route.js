import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const cron = await fetch(`${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000"}/api/cron/post`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    const data = await cron.json();
    // Reflect the cron's real outcome so failures aren't hidden
    const ok = cron.ok && data.ok !== false && !data.error;
    return NextResponse.json({
      success: ok,
      message: ok ? (data.message || "Posted to Instagram") : "Post failed",
      error: ok ? undefined : data.error || `HTTP ${cron.status}`,
      data,
    });
  } catch (error) {
    console.error("Trigger post error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
