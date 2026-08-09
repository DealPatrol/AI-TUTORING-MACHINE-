import { NextResponse } from "next/server";

// Shared trigger wrapper. Calls the cron route handler IN-PROCESS instead of
// re-fetching our own deployment URL — self-fetches hit Vercel's SSO
// deployment-protection wall and return HTML, which broke every dashboard
// trigger. The synthetic request carries the cron secret so checkCronAuth passes.
export async function triggerCron(handler, label) {
  try {
    const request = new Request("https://internal/cron", {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const response = await handler(request);
    const data = await response.json();
    const softFail = data?.ok === false || Boolean(data?.error);
    const skipped = Boolean(data?.skipped);
    return NextResponse.json({
      success: response.ok && !softFail,
      skipped,
      message: skipped ? `${label} skipped` : `${label} triggered`,
      data,
    });
  } catch (error) {
    console.error(`Trigger ${label} error:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
