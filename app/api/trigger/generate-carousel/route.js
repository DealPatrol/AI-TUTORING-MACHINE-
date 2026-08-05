import { triggerCron } from "@/lib/trigger";

export async function POST() {
  return triggerCron("/api/cron/generate-carousel", "generate-carousel");
}
