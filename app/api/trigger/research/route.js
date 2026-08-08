import { triggerCron } from "@/lib/trigger";
import { GET as cronHandler } from "@/app/api/cron/research/route";

export const maxDuration = 300;

export async function POST() {
  return triggerCron(cronHandler, "research");
}
