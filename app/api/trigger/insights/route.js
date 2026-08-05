import { NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/helpers";

export async function POST() {
  try {
    const cron = await fetch(`${appBaseUrl()}/api/cron/insights`, {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const data = await cron.json();
    return NextResponse.json({ success: cron.ok, message: "Insights cron triggered", data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
