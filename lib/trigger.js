import { NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/helpers";

// Shared trigger wrapper: success only when cron HTTP ok AND payload isn't a soft-failure.
export async function triggerCron(path, label) {
  try {
    const cron = await fetch(`${appBaseUrl()}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const data = await cron.json();
    const softFail = data?.ok === false || Boolean(data?.error);
    const skipped = Boolean(data?.skipped);
    return NextResponse.json({
      success: cron.ok && !softFail,
      skipped,
      message: skipped ? `${label} skipped` : `${label} triggered`,
      data,
    });
  } catch (error) {
    console.error(`Trigger ${label} error:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
