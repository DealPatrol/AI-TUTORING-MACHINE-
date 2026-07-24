# AI Tutor Machine - Deployment Checklist

## ✅ What's Ready

Your AI Tutor Machine is fully built and ready to run. Here's what you have:

### Backend Infrastructure (100% Complete)
- ✅ **Research Cron** — Scrapes high-performing Instagram posts from Apify every Monday
- ✅ **Generate Cron** — Rewrites posts with Claude, generates images with Gemini daily  
- ✅ **Post Cron** — Publishes to Instagram via Meta Graph API daily at 3 PM UTC
- ✅ **Cron Scheduling** — All schedules configured in `vercel.json`
- ✅ **API Helpers** — Airtable CRUD, Claude integration, auth protection

### Frontend Dashboard (100% Complete)
- ✅ **Production Dashboard** — Real-time queue, winners, and post history viewer
- ✅ **Manual Trigger Buttons** — Test each cron without waiting for schedule
- ✅ **Status Monitoring** — Shows queue size, winners count, posts history
- ✅ **Setup Guidance** — In-dashboard instructions for completing setup
- ✅ **Mobile Responsive** — Fully responsive design

### Manual Trigger Endpoints (100% Complete)
- ✅ `/api/trigger/research` — Manually run research cron
- ✅ `/api/trigger/generate` — Manually run generate cron
- ✅ `/api/trigger/post` — Manually run post cron
- ✅ `/api/dashboard/data` — Fetch current queue/winners/history

---

## 📋 Deployment Steps

### Step 1: Set Instagram Credentials (5 minutes)

Follow the instructions in `SETUP.md` to get:
- `IG_ACCESS_TOKEN` — Long-lived Instagram API token
- `IG_USER_ID` — Your Instagram Business Account ID

### Step 2: Add Environment Variables to Vercel (3 minutes)

1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add these two new variables:
   - Name: `IG_ACCESS_TOKEN` → Value: [your token]
   - Name: `IG_USER_ID` → Value: [your account ID]

Note: All other variables are already configured:
- AIRTABLE_API_KEY ✓
- AIRTABLE_BASE_ID ✓
- ANTHROPIC_API_KEY ✓
- GEMINI_API_KEY ✓
- APIFY_TOKEN ✓
- APIFY_TASK_ID ✓
- CRON_SECRET ✓

### Step 3: Deploy to Production (1 minute)

Option A: Via Vercel UI
- Push changes to your branch
- Click "Deploy" in Vercel dashboard
- Wait for build to complete

Option B: Via CLI
```bash
cd /vercel/share/v0-project
vercel deploy --prod
```

### Step 4: Verify Deployment (5 minutes)

1. Visit your deployed app (e.g., `your-project.vercel.app`)
2. Dashboard should load with no errors
3. Click "🔍 Trigger Research" to test
   - Check logs in Vercel dashboard for any errors
   - Wait 30 seconds and click "🔄 Refresh Data"
   - Look for Airtable connection test
4. If successful, all systems are go!

---

## 🚀 Going Live

Once deployed with Instagram credentials, your system will automatically:

### Weekly (Mondays 9 AM UTC)
- **Research Cron** scrapes Apify for new high-performing posts
- Filters posts with 500+ likes
- Saves top 15 winners to Airtable

### Daily (12 PM UTC)
- **Generate Cron** picks next unused winner
- Claude rewrites in your brand voice  
- Gemini generates branded graphic
- Saves to Queue with "Ready" status

### Daily (3 PM UTC)
- **Post Cron** takes next "Ready" post
- Publishes directly to Instagram Business Account
- Updates status to "Posted"

---

## 📊 Monitoring

### Via Dashboard
- Visit your Vercel domain to see live queue, winners, and history
- Use the refresh button to check current status
- Use trigger buttons to run any cron manually

### Via Vercel Logs
- Go to Vercel dashboard
- Deployments → Recent deployment → Logs
- Search for cron names ("research", "generate", "post")
- Check for errors or success messages

### Via Airtable
- View raw data directly in your Airtable base
- Winners table → see research results
- Queue table → see generated posts ready to go
- See all images, captions, engagement metrics

---

## 🔧 Customization After Deployment

### Change Posting Time
Edit `/vercel.json` line 15:
```json
"cron": "0 15 * * *"  // Change "15" to desired hour (UTC)
```

### Change Brand Voice
Edit `/app/api/cron/generate/route.js` lines 12-17:
```javascript
const BRAND_VOICE = `
Your custom voice description here
`;
```

### Change Image Style
Edit `/app/api/cron/generate/route.js` lines 48-53 (Gemini prompt)

### Change Winner Threshold
Edit `/app/api/cron/research/route.js`:
- Line 9: `MIN_LIKES` (currently 500)
- Line 10: `MAX_WINNERS` (currently 15 per week)

---

## ⚠️ Troubleshooting

### "Airtable not configured yet" in Dashboard
→ Check you've set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in Vercel
→ Redeploy after adding

### Instagram posts not publishing
→ Verify IG_ACCESS_TOKEN hasn't expired (60-day limit)
→ Check IG_USER_ID is correct (Instagram numeric ID, not username)
→ Check Vercel logs for Graph API errors
→ Verify account has Instagram Graph API permissions enabled

### "Queue is empty"
→ Run "🔍 Trigger Research" to fetch winners
→ Run "✨ Trigger Generate" to create posts
→ Run "📱 Trigger Post" to publish

### Crons not running on schedule
→ Check vercel.json has correct cron schedule
→ Check CRON_SECRET env var is set
→ Check Vercel deployment is complete and active

---

## 📞 Support

If anything isn't working:
1. Check `/SETUP.md` for complete setup instructions
2. Check `/README.md` for architecture overview
3. Review cron logs in Vercel dashboard
4. Check Airtable to see if data is flowing through

Your system is now production-ready and fully automated! 🎉
