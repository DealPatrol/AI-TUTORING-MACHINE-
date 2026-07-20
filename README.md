# AI Tutor Machine 🤖

A faceless Instagram account that runs itself. Four automated skills:

1. **Researcher** (Mondays) — pulls your Apify scrape of top AI-niche accounts, saves the winners to Airtable
2. **Copywriter** (daily) — Claude rewrites one winner in your brand voice
3. **Designer** (daily) — Gemini turns the copy into a branded graphic
4. **Poster** (daily 3pm UTC / 9am Central) — publishes to Instagram via Meta's official API

Everything runs on Vercel crons. No servers to manage.

**Monthly cost estimate:** Apify ~$5–10, Claude API ~$1, Gemini images ~$1–2, Airtable free, Vercel free. **Total: roughly $10/mo.**

---

## Setup (about 90 minutes, one time)

### Step 1 — Create the Instagram account (10 min)
1. Make a new Instagram account (e.g. `@coles.ai.tutor` — pick your own name)
2. In Instagram: Settings → Account type → switch to **Business**
3. Create a Facebook Page (any name) and link the IG account to it (Instagram Settings → Business tools → Connect a Facebook Page)
4. Upload a profile pic and write a bio. **Post 2–3 things manually and use the account like a human for the first week** — brand-new accounts that instantly go full-robot get flagged.

### Step 2 — Airtable base (10 min)
1. Create a new base called **AI Tutor Machine**
2. Create a table called **Winners** with these fields (exact names, case matters):
   - `Post URL` (single line text)
   - `Account` (single line text)
   - `Caption` (long text)
   - `Likes` (number)
   - `Comments` (number)
   - `Status` (single select: `New`, `Used`)
3. Create a second table called **Queue** with:
   - `Hook` (single line text)
   - `Caption` (long text)
   - `Image URL` (URL)
   - `Status` (single select: `Ready`, `Posted`)
   - `Source URL` (URL)
   - `Posted At` (single line text)
4. Get your API token at airtable.com/create/tokens (scopes: `data.records:read` + `data.records:write`, access: this base)
5. Your Base ID is the `appXXXXXXXX` part of the base's URL

### Step 3 — Apify scraper (15 min)
1. Sign up at apify.com (free $5 credit to start)
2. Find the **Instagram Post Scraper** actor in the Apify Store
3. Create a **Task** from it. Input: paste 10–20 usernames of top AI-education accounts (search Instagram for accounts like the ones in that video — AI tips, AI tools, ChatGPT tutorials). Set posts per profile to ~10.
4. In the task, set a **Schedule**: weekly, Sunday night (so results are fresh for Monday's research cron)
5. Run it once manually now so there's data waiting
6. Copy the **Task ID** (in the task URL) and your **API token** (Settings → API tokens)

### Step 4 — AI keys (5 min)
- **Claude:** console.anthropic.com → API keys. Docs: https://docs.claude.com/en/api/overview
- **Gemini:** aistudio.google.com → Get API key

### Step 5 — Instagram API access (30 min, the fiddly one)
1. Go to **developers.facebook.com** → My Apps → Create App → type **Business**
2. In the app dashboard, add the **Instagram Graph API** product
3. Open **Tools → Graph API Explorer**:
   - Select your app
   - Add permissions: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `business_management`
   - Click **Generate Access Token** and log in / approve
4. That token is short-lived. Convert it to a **long-lived token** (60 days): paste this in your browser with your values filled in:
   ```
   https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_TOKEN
   ```
   (App ID and App Secret are in your app's Settings → Basic.) The response contains your `IG_ACCESS_TOKEN`.
5. Get your `IG_USER_ID`: in Graph API Explorer, query `me/accounts` to get your Page ID, then query `YOUR_PAGE_ID?fields=instagram_business_account`. The ID inside `instagram_business_account` is your `IG_USER_ID`.
6. ⚠️ **The token expires every 60 days.** Set a phone reminder to repeat step 4 (exchange again) before it dies, and update the env var in Vercel.

### Step 6 — Deploy to Vercel (10 min)
1. Push this folder to a new GitHub repo (in your DealPatrol org), then import it in Vercel — same as RepoFuse
2. In the Vercel project: **Storage → Create → Blob store** (this auto-adds `BLOB_READ_WRITE_TOKEN`)
3. **Settings → Environment Variables:** add everything from `.env.example` with your real values
4. Deploy. Vercel picks up the cron schedule from `vercel.json` automatically.

### Step 7 — Test it (5 min)
Trigger each cron by hand once, in order (replace values):
```
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/research
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/generate
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/post
```
After `research` — check the Winners table has rows.
After `generate` — check the Queue table has a post with an image URL (open it!).
After `post` — check your Instagram. 🎉

---

## Tuning it later
- **Brand voice:** edit `BRAND_VOICE` in `app/api/cron/generate/route.js`
- **Visual style:** edit the image prompt in the same file
- **Winner threshold:** `MIN_LIKES` in `app/api/cron/research/route.js`
- **Post time:** the third cron in `vercel.json` (`0 15 * * *` = 3pm UTC = 9am Central)
- **Post twice a day:** duplicate the post cron line with a second time

## Honest warnings
- Scraping Instagram violates their Terms of Service. The *posting* side here uses Meta's official API (fully legit), but the Apify scraping side carries some risk to the accounts involved.
- Check the Queue table every few days for the first month. AI will occasionally write something dumb — delete or edit the row before it posts.
- Growth is slow at first. Give it 60–90 days before judging.
