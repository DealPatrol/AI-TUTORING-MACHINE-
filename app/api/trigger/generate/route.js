import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const cron = await fetch(`${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000"}/api/cron/generate`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    const data = await cron.json();
    return NextResponse.json({
      success: true,
      message: "Generate cron triggered",
      data,
    });
  } catch (error) {
    console.error("Trigger generate error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
