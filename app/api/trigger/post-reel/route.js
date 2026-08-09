import { triggerCron } from "@/lib/trigger";
import { GET as cronHandler } from "@/app/api/cron/post-reel/route";

export const maxDuration = 300;

export async function POST() {
  return triggerCron(cronHandler, "post-reel");
}
