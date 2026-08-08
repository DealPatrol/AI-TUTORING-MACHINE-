# Airtable Setup for AI Tutor Machine

Your Airtable base needs **Winners** and **Queue** tables. Growth features add a few Queue fields for Reels and carousels.

## 1. Create "Winners" Table

Fields:

| Field | Type | Notes |
|-------|------|--------|
| Post URL | Single line text | Instagram post URL |
| Account | Single line text | Source username |
| Caption | Long text | Original caption |
| Likes | Number | |
| Comments | Number | |
| Status | Single select | `New`, `Processing`, `Used` |
| Format | Single line text | Optional — Image / Video / Sidecar |
| Growth Score | Number | Optional — set by research cron |

## 2. Create "Queue" Table

Fields:

| Field | Type | Notes |
|-------|------|--------|
| Hook | Single line text | Headline |
| Caption | Long text | Full caption |
| Image URL | URL | Cover / feed image |
| Status | Single select | `Ready`, `Posted`, `Failed` |
| Source URL | URL | Original winner URL |
| Posted At | Single line text | ISO timestamp |
| **Type** | Single select | `Feed`, `Reel`, `Carousel` — optional (posters infer from Video/Slide/Image URLs) |
| **Video URL** | URL | Reel MP4 public URL — required to publish Reels |
| **Cover URL** | URL | Reel cover image |
| **First Comment** | Long text | Auto-posted after publish (CTAs + hashtags) |
| **Slide URLs** | Long text | JSON array of carousel image URLs |
| **Story Text** | Single line text | Overlay copy for Stories |
| **Story Image URL** | URL | 9:16 Story graphic (posted after feed/reel) |
| **Day Number** | Number | Tip streak (“Day 12”) |
| **Bonus Prompt** | Long text | Sent when someone comments TIP |
| **IG Media ID** | Single line text | Set on publish — needed for engage + insights |
| **Reach / Saves / Shares / Plays** | Number | Filled by insights cron |
| **Replied Comment IDs** | Long text | JSON array — avoids double TIP replies |
| **Fallback Used** | Checkbox | True when Veo failed and carousel shipped instead |
| **Last Error** | Long text | Failure reason |

### Quick add (growth fields)

If Queue already exists, add the fields above, and add **Failed** to the Status select.

Without **Video URL**, Reels cannot publish (feed/carousel still work). **Type** and **Sequence** are optional — crons fall back to `Status=Ready` and infer content type from URLs.

Also add **Processing** to Winners Status (used to claim a winner before long generate jobs).

## How content flows

1. **Research** (Mondays) → Winners (`Status=New`), scored for comments + video/carousel bias  
2. **Generate feed** (daily) → Queue `Type=Feed`  
3. **Generate reel** (daily) → Queue `Type=Reel` + Video URL  
4. **Generate carousel** (Tue/Thu/Sat) → Queue `Type=Carousel` + Slide URLs  
5. **Post-1** (daily 12:00 UTC) → publishes next Ready image  
6. **Post** (daily 15:00 UTC) → publishes Feed/Carousel + first comment + Story  
7. **Post reel** (daily 18:00 UTC) → publishes Reel (or Carousel/Feed fallback) + Story  
8. **Health** (daily 11:00 UTC) → warns if winners/queue fuel is low  

Optional: Engage / Insights / generate-carousel can be re-enabled in `vercel.json` after adding those Airtable fields.

## Testing

1. Open your Vercel dashboard URL  
2. Trigger Research → check Winners  
3. Trigger Generate Reel → check Queue for `Type=Reel` and a Video URL  
4. Trigger Post Reel → check Instagram Reels tab  

## Troubleshooting

**"Airtable Queue is missing growth fields"**  
→ Add Type / Video URL / Cover URL / First Comment / Slide URLs as above.

**"Airtable list failed: 404"**  
→ Table names must be exactly `Winners` and `Queue`.

**Veo / reel generate fails**  
→ Gemini key needs paid Veo access. See README growth section.
