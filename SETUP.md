# AI Tutor Machine - Setup Guide

## What This Does

AI Tutor Machine is an **automated Instagram content system** that:

1. **Research (Mondays)** — Scrapes high-performing posts from Instagram using Apify, filters winners (500+ likes), saves to Airtable
2. **Generate (Daily)** — Rewrites winner posts in your brand voice using Claude, generates branded graphics with Gemini, saves to Queue
3. **Post (Daily 3 PM UTC)** — Publishes Queue posts to your Instagram Business account using Meta's Graph API

Everything runs automatically on Vercel crons. No manual work needed.

---

## Environment Variables Required

You'll need to add these to your Vercel project (Settings → Environment Variables):

### Already Provided (Check You Have These):
- `AIRTABLE_API_KEY` — Your Airtable personal access token
- `AIRTABLE_BASE_ID` — Your Airtable base ID
- `ANTHROPIC_API_KEY` — Claude API key from Anthropic
- `GEMINI_API_KEY` — Google Gemini API key
- `APIFY_TOKEN` — Apify API token
- `APIFY_TASK_ID` — Your Instagram scraper task ID
- `CRON_SECRET` — Random secret for cron authentication

### Still Need (Instagram Only):
- `IG_ACCESS_TOKEN` — Long-lived Instagram Business Account access token
- `IG_USER_ID` — Your Instagram Business Account ID

---

## Getting Instagram Credentials

### Step 1: Create a Meta App

1. Go to [Meta Developers](https://developers.facebook.com)
2. Click "Create App" → choose "Business"
3. Select "Instagram Graph API" as your use case
4. Complete the setup wizard

### Step 2: Add Instagram Product

1. In your app, go to Products → click "+" next to Instagram Graph API
2. Select your Instagram Business Account (link if needed)
3. Go to Settings → Basic to find your `App ID` and `App Secret`

### Step 3: Generate Long-Lived Access Token

1. Go to Tools → Graph API Explorer
2. Select your app from the dropdown
3. Select "Get User Access Token" → check `instagram_business_content_publish` and `instagram_business_manage_messages` scopes
4. Generate a short-lived token (24 hours)
5. Use this endpoint to exchange for long-lived (60 days):

```bash
curl "https://graph.instagram.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&access_token=SHORT_LIVED_TOKEN"
```

This returns a long-lived token. Save it as `IG_ACCESS_TOKEN` in Vercel.

### Step 4: Get Your Instagram Business Account ID

1. In Graph API Explorer, run this query:
```
GET /me/instagram_business_accounts
```

2. The response shows your Business Account object with `id` — this is your `IG_USER_ID`

Save both as environment variables in Vercel.

---

## Setting Up Airtable

1. Create a new Airtable workspace
2. Create a base with these three tables:

### Table 1: Winners
**Fields:**
- Post URL (Linked record)
- Account (Text)
- Caption (Long text)
- Likes (Number)
- Comments (Number)
- Status (Single select: "New", "Used")

### Table 2: Queue
**Fields:**
- Hook (Text)
- Caption (Long text)
- Image URL (URL)
- Status (Single select: "Ready", "Posted")
- Source URL (URL)
- Posted At (Date)

### Table 3: Logs
**Fields:**
- Event (Text)
- Status (Single select: "Success", "Error")
- Message (Long text)
- Timestamp (Date)

---

## Setting Up Apify Instagram Scraper

1. Go to [Apify](https://apify.com)
2. Create an account and navigate to Actors
3. Search for "Instagram Scraper" or "Hashtag Posts Scraper"
4. Create a task that scrapes a hashtag or profile you want to learn from
5. Get your `APIFY_TASK_ID` from the task URL
6. Save your Apify API token as `APIFY_TOKEN`

---

## Deployment to Vercel

1. Ensure all environment variables are set in Vercel project settings
2. Deploy:
   ```bash
   vercel deploy --prod
   ```

3. The dashboard will be live at your Vercel domain (e.g., `your-project.vercel.app`)

4. You can manually trigger crons from the dashboard or they'll run on schedule:
   - **Research**: Mondays at 9 AM UTC
   - **Generate**: Daily at 12 PM UTC
   - **Post**: Daily at 3 PM UTC

---

## Testing

### Manual Triggers

Use the dashboard buttons to test each cron:
1. Click "Trigger Research" — should fetch from Apify and add winners to Airtable
2. Click "Trigger Generate" — should take a winner, rewrite it, generate an image, add to Queue
3. Click "Trigger Post" — should publish from Queue to Instagram

### Check Logs

- Dashboard shows real-time queue, winners, and posted history
- Check Airtable directly for detailed records
- Check Vercel deployment logs for cron errors

---

## Customization

### Brand Voice

Edit `/app/api/cron/generate/route.js` line 12-17 to change the brand voice prompt.

### Image Style

Edit the Gemini prompt in `/app/api/cron/generate/route.js` line 48-53 to customize graphics.

### Winner Threshold

Edit `/app/api/cron/research/route.js`:
- Line 9: `MIN_LIKES` — minimum likes to qualify
- Line 10: `MAX_WINNERS` — max winners per week

### Post Timing

Edit `/vercel.json` cron schedules:
- `cron: "0 9 * * 1"` — Research (Monday 9 AM UTC)
- `cron: "0 12 * * *"` — Generate (Daily 12 PM UTC)
- `cron: "0 15 * * *"` — Post (Daily 3 PM UTC)

---

## Troubleshooting

**"No new winners" message:**
- Check your Apify task has data
- Verify `MIN_LIKES` threshold isn't too high

**"Queue is empty":**
- Run Generate cron manually from dashboard
- Check Airtable Winners table for entries

**Instagram posts aren't publishing:**
- Verify `IG_ACCESS_TOKEN` is set and not expired
- Check `IG_USER_ID` is correct (not Business Account username)
- Verify account has Instagram Graph API permissions

**Images not generating:**
- Check `GEMINI_API_KEY` is valid
- Verify Vercel Blob storage is configured

---

## Support

- Dashboard: View at your Vercel domain
- Airtable: Manage data directly or through dashboard
- Meta Graph API: https://developers.facebook.com/docs/instagram-api
- Apify: https://apify.com/docs
