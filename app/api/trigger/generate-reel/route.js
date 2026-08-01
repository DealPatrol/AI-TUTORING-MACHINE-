import { NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/helpers";

export async function POST() {
  try {
    const cron = await fetch(`${appBaseUrl()}/api/cron/generate-reel`, {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const data = await cron.json();
    return NextResponse.json({
      success: cron.ok,
      message: "Generate reel cron triggered",
      data,
    });
  } catch (error) {
    console.error("Trigger generate-reel error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
