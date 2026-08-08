import { triggerCron } from "@/lib/trigger";
import { GET as cronHandler } from "@/app/api/cron/insights/route";

export const maxDuration = 300;

export async function POST() {
  return triggerCron(cronHandler, "insights");
}
