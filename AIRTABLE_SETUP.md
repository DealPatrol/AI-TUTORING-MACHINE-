# Airtable Setup for AI Tutor Machine

Your Airtable base is connected, but it needs 2 tables to be created. Follow these steps:

## Option A: Manual Setup (Recommended for First Time)

### 1. Create "Winners" Table

1. Go to https://airtable.com/appU37HKkNZq13BYd (your base)
2. Click "Create table" (or "+" to add a new table)
3. Name it: `Winners`
4. Add these fields:
   - **Post URL** (text) - URL of the Instagram post
   - **Caption** (long text) - Original caption from the post
   - **Likes** (number) - Like count
   - **Status** (single select) - Options: "New", "Used"
   - **Created** (date) - When the post was found

Example record:
```
Post URL: https://www.instagram.com/p/ABC123/
Caption: "Check out this amazing tip for..."
Likes: 523
Status: New
Created: 2024-01-15
```

### 2. Create "Queue" Table

1. Click "Create table" again
2. Name it: `Queue`
3. Add these fields:
   - **Copy** (long text) - Your rewritten caption
   - **Image URL** (text) - URL to the generated image in Vercel Blob
   - **Original URL** (text) - Link back to the original post
   - **Status** (single select) - Options: "Ready", "Posted"
   - **Created** (date) - When created

Example record:
```
Copy: "Here's the key to getting more engagement..."
Image URL: https://blob.vercel-storage.com/...
Original URL: https://www.instagram.com/p/ABC123/
Status: Ready
Created: 2024-01-15
```

## How It Works

Once both tables exist:

1. **Research Cron** (Mondays 9 AM UTC)
   - Finds high-engagement posts via Apify
   - Saves them to the "Winners" table with Status="New"

2. **Generate Cron** (Daily 12 PM UTC)
   - Picks a "New" winner
   - Claude rewrites the caption
   - Gemini generates a graphic
   - Saves to "Queue" table with Status="Ready"
   - Updates the winner to Status="Used"

3. **Post Cron** (Daily 3 PM UTC)
   - Finds the first "Ready" post
   - Posts to Instagram via Meta Graph API
   - Updates Queue to Status="Posted"

4. **Dashboard**
   - Shows "Winners" (New posts found)
   - Shows "Queue" (Ready to post)
   - Shows "Posted" (Recently published)

## Testing

Once tables are created:

1. Go to https://ai-tutor-machine.vercel.app/dashboard (or your URL)
2. You'll see the queue viewer populate with data
3. Click "Trigger Research" to manually find posts
4. Check Airtable to see them appear in "Winners"
5. Click "Trigger Generate" to create a post
6. Watch it move to "Queue"

## Troubleshooting

**"Airtable list failed: 404"**
- Tables don't exist yet. Create them above.
- Make sure the table names are EXACTLY "Winners" and "Queue" (case-sensitive)

**"Airtable API failed: 401"**
- Your API token is wrong or expired
- Go to account settings → tokens and regenerate

**No data showing in dashboard**
- Add some test records to the Winners table manually first
- The dashboard will display them

## Next: Instagram Credentials

Once Airtable is set up, you need 2 Instagram credentials:
- IG_ACCESS_TOKEN (long-lived token)
- IG_USER_ID (your business account ID)

See `SETUP.md` for Instagram setup.
