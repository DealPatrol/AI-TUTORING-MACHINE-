import { triggerCron } from "@/lib/trigger";
import { GET as cronHandler } from "@/app/api/cron/generate-reel/route";

export const maxDuration = 300;

export async function POST() {
  return triggerCron(cronHandler, "generate-reel");
}
