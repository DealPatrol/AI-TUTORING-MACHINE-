# Daily Instagram Reels

The default production path creates **three original text-on-screen Reels per day** without Gemini, Claude, Veo, or image-generation credits. Instagram distributes Reels to non-followers. A single daily carousel does not.

Each Reel is five hard-cut 9:16 frames (~10.5 seconds) with a punchy hook, a copyable prompt, and an accuracy check. The bank has 30 unique Reels (10 days × 3). It then rotates. Expand the bank and kill weak hooks after you see plays.

## Schedule (UTC)

| Job | When | Alabama (CT, daylight) |
|-----|------|------------------------|
| Generate 3 Reels | 11:00 | 6:00 AM |
| Post Reel #1 | 13:00 | 8:00 AM |
| Post Reel #2 | 17:00 | 12:00 PM |
| Post Reel #3 | 00:00 | 7:00 PM |
| Engage comments | 18:00 & 21:00 | 1:00 PM & 4:00 PM |
| Insights | 22:00 | 5:00 PM |
| Health | 23:00 | 6:00 PM |

Use **Generate 3 Reels**, inspect the queued cover + caption, then **Post Reel**. Generation skips a matching ready or recently published hook.

## Why this changed

Carousels are save-magnets for people who already follow you. They almost never create new followers. Reels are the discovery surface. Three short text Reels a day is the fastest lever this account can pull without paid video models.

## AI mode

`CONTENT_MODE=ai` still uses the older Veo path. That needs paid credits. Do not enable it expecting the curated guarantee.

## Validation

`npm test` covers reel-frame rendering, FFmpeg MP4 output, hook uniqueness, and the existing Airtable/auth checks. `npm run build` validates the Next.js bundle.
