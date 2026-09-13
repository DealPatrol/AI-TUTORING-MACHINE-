# Daily Instagram lessons

The default production path creates one original five-slide carousel per day without Gemini, Claude, Veo, or image-generation credits. A 14-topic curated starter library includes concrete instructions and accuracy checks. It rotates every two weeks; expand the library and review performance to keep the account fresh. It does not guarantee followers or dynamically research news.

Schedule (UTC): generate 11:00, publish 17:00, insights 22:00, health 23:00. In Alabama, publishing is noon during daylight saving time and 11am in winter.

Use **Generate Daily Lesson**, inspect the queued images and caption, then **Post Feed/Carousel** for a manual run. Generation skips a matching ready or recently published lesson. Do not trigger the publisher concurrently: Airtable has no atomic compare-and-swap and this change does not implement a distributed lock.

## Fixes

- Real typeset 1080×1350 JPEG images. No paid image API and no blank placeholder cards in the daily path.
- Compatibility envelope in Airtable Caption preserves carousel slides, media IDs, and metrics when optional columns are absent. All publication paths strip the envelope before Instagram receives a caption.
- Existing Queue needs Hook, Caption (long text), Status (Ready/Posted), Image URL and Posted At. No schema editing credentials required.
- Publication state persists before comments/Stories. A `[PUBLISHING]` row is excluded from retry after an ambiguous external response. Inspect Instagram, then use Airtable to reconcile it: mark Posted if present; if definitely absent, remove the marker from both Last Error and the encoded Caption envelope before requeueing. Never blindly retry an uncertain publish.
- Dashboard fetches the newest posts rather than arbitrary first records. Media IDs and engagement counts survive missing optional columns, allowing subsequent insights collection.
- Cron authentication fails closed when the secret is missing.

## AI mode

CONTENT_MODE=ai retains the older provider-based generation paths. These require paid provider credits; the September 13 production logs report depleted Google and Anthropic balances. That legacy mode still requires separate visual QA and retains its older image fallback behavior; do not enable it expecting the curated quality guarantee. Reels are not part of the default schedule.

## Validation

npm test covers growth calculations, provider failures, rendering every slide in the starter library, minimal Airtable schema creation/update roundtrips, carousel routing, metadata stripping, uncertain-publication exclusion, and missing-secret rejection. npm run build validates the Next.js production bundle. Local checks use mocked provider responses; a real deployment and Instagram publication must be checked separately.
