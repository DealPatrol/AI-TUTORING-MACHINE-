# AI Tutor Machine

A faceless Instagram growth engine that runs itself. It researches winning ideas, rewrites them in your voice, and posts **feed graphics, daily Reels, and save-magnet carousels**.

### Automated skills

1. **Researcher** (Mondays) — pulls your Apify scrape, scores posts for growth (comments + video/carousel bias), saves winners to Airtable  
2. **Copywriter + Designer** (daily) — Claude writes growth-optimized feed copy; Gemini makes the graphic; queues a first-comment CTA  
3. **Reel studio** (daily) — Claude writes an 8s Reel script; Gemini makes the cover; **Veo** renders a 9:16 video  
4. **Carousel studio** (Tue/Thu/Sat) — multi-slide “save this” posts  
5. **Poster** (daily) — feed/carousel ~3pm UTC; **Reels once a day** ~6pm UTC via Meta’s official API + auto first comment  

Everything runs on Vercel crons.

**Cost note:** Apify + Claude + Gemini images are cheap. **Veo Reels need a paid Gemini key** and cost more per video — expect higher monthly spend if you keep daily Reels on.

---

## Setup (about 90 minutes, one time)

### Step 1 — Create the Instagram account (10 min)
1. Make a new Instagram account (e.g. `@coles.ai.tutor` — pick your own name)
2. In Instagram: Settings → Account type → switch to **Business**
3. Create a Facebook Page and link the IG account to it
4. Upload a profile pic and write a bio. **Post 2–3 things manually for the first week** — brand-new accounts that instantly go full-robot get flagged.

### Step 2 — Airtable base (15 min)
Follow **`AIRTABLE_SETUP.md`**. You need tables **Winners** and **Queue**, including growth fields on Queue: `Type`, `Video URL`, `Cover URL`, `First Comment`, `Slide URLs`.

### Step 3 — Apify scraper (15 min)
1. Sign up at apify.com  
2. Instagram Post Scraper → Task with 10–20 top AI-education accounts  
3. Schedule weekly (Sunday night)  
4. Copy Task ID + API token  

### Step 4 — AI keys (5 min)
- **Claude:** console.anthropic.com  
- **Gemini:** aistudio.google.com — enable billing if you want daily Reels (Veo)

### Step 5 — Instagram API access (30 min)
1. developers.facebook.com → Create App → Business → Instagram Graph API  
2. Graph API Explorer permissions: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `business_management`  
3. Exchange for a **long-lived token** (60 days) → `IG_ACCESS_TOKEN`  
4. Resolve `IG_USER_ID` via Page → `instagram_business_account`  
5. Reminder: refresh the token before day 60  

### Step 6 — Deploy to Vercel (10 min)
1. Import the GitHub repo in Vercel  
2. Storage → Blob store (`BLOB_READ_WRITE_TOKEN`)  
3. Add env vars from `.env.example`  
4. Deploy — crons load from `vercel.json`  

### Step 7 — Test
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/research
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/generate
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/generate-reel
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/post
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/post-reel
```

---

## Growth features (what actually drives audience)

| Feature | Why it helps | Schedule |
|--------|----------------|----------|
| **Daily Reels** | Reels get the widest non-follower reach | Generate 8:00 UTC · Post **18:00 UTC daily** |
| **Veo fallback** | Never skip a day if video gen fails | Auto → carousel same day |
| **Optional Day N label** | Keeps continuity without weakening the main hook | Tiny metadata only |
| **TIP comment replies** | Makes engagement CTA real → more comments | 19:00 & 21:00 UTC |
| **Stories after each post** | Extra profile visits same day | Auto after feed + reel publish |
| **Insights + follower tracker** | See which formats grow reach and week-over-week follows | Daily 22:00 UTC |
| **Comment replies + likes** | Algorithm rewards comment velocity; HOW still gets a private playbook | 19:00 & 21:00 UTC |
| **Boost Story** | Same-day Story that sends people back to comment HOW / follow | Daily 20:00 UTC |
| **Recycle winners** | Fresh hook on posts that already grew reach | Mondays 10:00 UTC |
| **Weekly recap** | Save-magnet “this week’s tips” carousel | Sundays 10:00 UTC |
| **Carousels** | Highest save rate → more reach | Tue / Thu / Sat |
| **Pipeline health** | Catch empty queues before post time | Daily 11:00 UTC |

Tune voice/prompts in `lib/growth.js`.

Optional env: `VEO_MODEL` (default `veo-3.1-fast-generate-preview`).
Current model fallbacks are `gemini-3.5-flash-lite` → `gemini-2.5-flash` →
`gemini-2.5-flash-lite` for text, `gemini-3.1-flash-image` →
`gemini-2.5-flash-image` for images, and Veo 3.1 fast → standard for video.

If all text providers are temporarily unavailable, the daily generators queue
a schema-compatible notes-only prompt. If all image models are rate-limited,
they upload a provider-independent PNG and preserve the full lesson in the
caption. Ready fallback posts display their provider error on the dashboard.

### Restore posting after a provider outage

After deploying a fix:

1. Open the dashboard and run **Health Check**. Confirm the Instagram token is
   valid and review the latest generation/publishing error.
2. Click **Trigger Generate** and wait for a new item under **Ready to Post**.
   Use **Generate Reel** when you specifically want the Reel/Veo path.
3. Review the queued caption and fallback warning, if present.
4. Click **Post Reel**. That route publishes a Reel first, then safely falls
   back to a Ready carousel or feed item.
5. Refresh the dashboard and confirm the item moved to **Posted** with an IG
   media ID before triggering another post.

---

## Cron schedule (`vercel.json`)

| Path | When (UTC) |
|------|------------|
| `/api/cron/research` | Mon 06:00 |
| `/api/cron/generate` | Daily 07:00 |
| `/api/cron/generate-reel` | Daily 08:00 |
| `/api/cron/generate-carousel` | Tue/Thu/Sat 09:00 |
| `/api/cron/recycle` | Mon 10:00 |
| `/api/cron/recap` | Sun 10:00 |
| `/api/cron/health` | Daily 11:00 |
| `/api/cron/post` | Daily 15:00 |
| `/api/cron/post-reel` | Daily 18:00 |
| `/api/cron/engage` | Daily 19:00 & 21:00 |
| `/api/cron/boost` | Daily 20:00 |
| `/api/cron/insights` | Daily 22:00 |

---

## Honest warnings
- Scraping Instagram via Apify can violate IG ToS; **posting** uses Meta’s official API.  
- Check the Queue for the first month — delete/edit bad AI rows before they post.  
- New accounts: warm up manually before full automation.  
- Growth still takes consistency; Reels help, they don’t guarantee overnight fame.  
